/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const HAR_VERSION = "1.2";

/**
 * Polyfill for Array.prototype.findLast which is not available on older Node
 * versions.
 *
 * Find the last item of the array which matches the provided predicate. Will
 * return undefined if no match is found.
 *
 * @param {array} array
 *     The array in which we want to find an element.
 * @param {Function} predicate
 *     A function to execute for each element in the array. It should return a
 *     truthy value to indicate a matching element has been found.
 * @return {*}
 *     The found item or undefined.
 */
function findLast(array, predicate) {
  // If findLast is available, use it directly.
  if (array.findLast) {
    return array.findLast(predicate);
  }

  // Otherwise, loop in reverse order to find a match.
  for (let i = array.length - 1; i >= 0; i--) {
    const item = array[i];
    if (predicate(array[i], i, array)) {
      return item;
    }
  }

  return undefined;
}

function parseQueryString(url) {
  try {
    const urlObject = new URL(url);
    return [...urlObject.searchParams.entries()].map(([name, value]) => {
      return {
        name: decodeURIComponent(name),
        value: decodeURIComponent(value),
      };
    });
  } catch (e) {
    console.error("Failed to parse query string for url", url);
    console.error(e);
    return [];
  }
}

function toHAREntry(networkEntry) {
  const harEntry = {};

  // Most of the default values (eg "?" or -1 or []) are needed for cached
  // responses which currently don't come with enough information.
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=1806802
  harEntry.request = {
    bodySize: networkEntry.request.bodySize,
    method: networkEntry.request.method,
    url: networkEntry.request.url,
    httpVersion: networkEntry.response.protocol || "?",
    headers: networkEntry.request.headers,
    cookies: networkEntry.request.cookies,
    queryString: parseQueryString(networkEntry.request.url) || [],
    headersSize: networkEntry.request.headersSize,
  };

  const timings = networkEntry.request.timings;
  harEntry.startedTime = timings.requestTime / 1000;
  harEntry.startedDateTime = new Date(harEntry.startedTime).toISOString();
  harEntry.response = {
    status: networkEntry.response.status || -1,
    statusText: networkEntry.response.statusText || "?",
    httpVersion: networkEntry.response.protocol || "?",
    headers: networkEntry.response.headers || [],
    cookies: [],
    content: {
      mimeType: networkEntry.response.mimeType || "?",
      size: networkEntry.response.content.size,
      encoding: "",
      text: "",
      comment: "",
      compression: "",
    },
    redirectURL: "",
    headersSize: networkEntry.response.headersSize,
    bodySize: networkEntry.response.bytesReceived,
  };

  // XXX: Check where this comes from in devtools.
  harEntry.cache = {};

  // Convert from BiDi timings to HAR timings
  harEntry.timings = {};

  let last = timings.requestTime;
  harEntry.timings.blocked = (timings.dnsStart - last) / 1000;

  last = timings.dnsStart || last;
  harEntry.timings.dns = (timings.dnsEnd - timings.dnsStart) / 1000;

  last = timings.connectStart || last;
  harEntry.timings.connect = (timings.connectEnd - last) / 1000;

  last = timings.tlsStart || last;
  harEntry.timings.ssl = (timings.tlsEnd - last) / 1000;

  last = timings.tlsEnd || last;
  harEntry.timings.send = (timings.requestStart - last) / 1000;

  last = timings.requestStart || last;
  harEntry.timings.wait = (timings.responseStart - last) / 1000;

  last = timings.responseStart || last;
  harEntry.timings.receive = (timings.responseEnd - last) / 1000;

  let time = 0;
  for (const key of Object.keys(harEntry.timings)) {
    harEntry.timings[key] = Math.max(0, harEntry.timings[key]);
    time += harEntry.timings[key];
  }

  harEntry.time = time;
  return harEntry;
}

class HarRecorder {
  constructor(options) {
    if (typeof options?.browser != "string") {
      throw new Error("Missing browser option");
    }

    if (typeof options?.version != "string") {
      throw new Error("Missing version option");
    }

    this._browser = options.browser;
    this._version = options.version;

    this.networkEntries = [];
    this.pageTimings = [];
  }

  recordEvent(event) {
    if (!this._recording) {
      throw new Error("HAR recording not started");
    }

    const { method, params } = event;
    if (!method || !params) {
      throw new Error(
        "recordEvent expects a BiDi event with method and params"
      );
    }

    switch (method) {
      case "network.beforeRequestSent":
        this._onBeforeRequestSent(params);
        break;
      case "network.responseCompleted":
        this._onResponseCompleted(params);
        break;
      case "browsingContext.domContentLoaded":
        this._onBrowsingContextEvent("domContentLoaded", params);
        break;
      case "browsingContext.load":
        this._onBrowsingContextEvent("load", params);
        break;
    }
  }

  /**
   * Subscribe to log event
   * @returns {Promise<void>}
   */
  startRecording() {
    if (this._recording) {
      throw new Error("HAR recording already started");
    }
    this._recording = true;
  }

  /**
   * Unsubscribe to log event
   * @returns {Promise<void>}
   */
  stopRecording() {
    if (!this._recording) {
      throw new Error("HAR recording not started");
    }

    const harExport = this._exportAsHar();

    this.networkEntries = [];
    this.pageTimings = [];
    this._recording = false;

    return harExport;
  }

  _exportAsHar() {
    const browserDetails = {
      name: this._browser,
      version: this._version,
    };

    const recording = {
      log: {
        version: HAR_VERSION,
        creator: browserDetails,
        browser: browserDetails,
        pages: [],
        entries: [],
      },
    };

    const pages = [];
    for (const pageTiming of this.pageTimings) {
      // Check if there is already a page item in this recording for the same URL.
      // Also exclude page entries which already have a timing corresponding to
      // the type ("load", "domContentLoaded"...), which would indicate another
      // navigation to the same URL.
      let page = pages.find(
        (p) => p.url === pageTiming.url && !p.pageTimings[pageTiming.type]
      );
      if (!page) {
        // Create a base page record.
        page = {
          id: `page_${pages.length + 1}`,
          pageTimings: {},
          startedDateTime: new Date(pageTiming.startedTime).toISOString(),
          title: pageTiming.url,
          // startedTime and url are temporary properties, and will be deleted
          // before generating the HAR.
          startedTime: pageTiming.startedTime,
          url: pageTiming.url,
        };
        pages.push(page);
      }

      // Add the timing, which is the relative time for either DOMContentLoaded or Load
      page.pageTimings[pageTiming.type] = pageTiming.relativeTime;
    }

    recording.log.pages = pages;

    for (const networkEntry of this.networkEntries) {
      if (!networkEntry.response) {
        // Redirected requests are currently not emitting the responseStarted
        // responseCompleted events because they are triggered out of order.
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=1809210
        // In the meantime, ignore entries with a missing `response`.
        continue;
      }

      const entry = toHAREntry(networkEntry);
      for (const page of recording.log.pages) {
        if (page.startedTime <= entry.startedTime) {
          entry.pageref = page.id;
        }
      }
      delete entry.startedTime;
      recording.log.entries.push(entry);
    }

    for (const page of recording.log.pages) {
      // Rename timings
      page.pageTimings.onContentLoad = page.pageTimings.domContentLoaded * 1;
      page.pageTimings.onLoad = page.pageTimings.load * 1;

      // Delete temporary fields
      delete page.pageTimings.domContentLoaded;
      delete page.pageTimings.load;
      delete page.startedTime;
      delete page.url;
    }

    recording.log.entries = recording.log.entries.sort((e1, e2) => {
      return e1.request.timestamp - e2.request.timestamp;
    });

    return recording;
  }

  _onBeforeRequestSent(params) {
    this.networkEntries.push({
      contextId: params.context,
      id: params.request.request + params.request.redirectCount,
      url: params.request.url,
      request: params.request,
    });
  }

  _onBrowsingContextEvent(type, params) {
    let { context, timestamp, url } = params;

    let relativeTime = +Infinity,
      startedTime = -1;

    if (type === "load") {
      const firstTiming = findLast(
        this.pageTimings,
        (timing) => timing.contextId === context
      );

      if (!firstTiming || firstTiming.type != "domContentLoaded") {
        return;
      }
      startedTime = firstTiming.startedTime;
      url = firstTiming.url;
    } else {
      let firstRequest = findLast(
        this.networkEntries,
        (entry) => entry.contextId === context && entry.request.url === url
      );

      if (!firstRequest) {
        // Alternatively settle on the previous
        firstRequest = findLast(
          this.networkEntries,
          (entry) => entry.contextId === context && entry.response?.mimeType.startsWith("text/html")
        );
      }

      if (!firstRequest) {
        // Bail if we can't find any request matching this browsing context.
        return;
      }
      const timings = firstRequest.request.timings;
      startedTime = timings.requestTime / 1000;
      firstRequest.isFirstRequest = true;
    }

    relativeTime = timestamp - startedTime;
    relativeTime = relativeTime.toFixed(1);

    this.pageTimings.push({
      contextId: context,
      relativeTime,
      startedTime,
      timestamp,
      type,
      url,
    });
  }

  _onResponseCompleted(params) {
    const entry = this.networkEntries.find(
      (e) =>
        e.request.request === params.request.request &&
        e.request.redirectCount === params.request.redirectCount
    );
    if (entry) {
      entry.request = params.request;
      entry.response = params.response;
    }
  }
}

module.exports = HarRecorder;
