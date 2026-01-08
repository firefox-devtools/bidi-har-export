/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const HAR_VERSION = "1.2";

class HarRecorder {
  /**
   * @constructor
   *
   * @param {object} options
   * @param {string} options.browser
   *     Name of the browser for which we are recording the HAR
   * @param {boolean} options.debugLogs
   *     Should the HarRecorder provide additional logs for debugging.
   * @param {string} options.version
   *     Version of the browser for which we are recording the HAR
   * @param {Function} [options.headerValueFormatter]
   *     An optional formatter function to use to format the header value.
   *     The function should take the header name and value, and return the formatted value.
   *     If not provided, the original header value will be used.
   */
  constructor(options) {
    if (typeof options?.browser != "string") {
      throw new Error("Missing browser option");
    }

    if (typeof options?.version != "string") {
      throw new Error("Missing version option");
    }

    this._browser = options.browser;
    this._debugLogs = options.debugLogs;
    this._version = options.version;
    this._headerValueFormatter =
      options.headerValueFormatter || ((__, value) => value);

    // Initial and last page default data.
    this._initialPageUrl = "(initial page - missing url)";
    this._lastPageUrl = "(last page - missing url)";

    this.networkEntries = [];
    this.pageTimings = [];
    this.topLevelContexts = [];

    this._isInMicroseconds = undefined;
  }

  recordEvent(event) {
    if (!this._recording) {
      throw new Error("HAR recording not started");
    }

    const { method, params } = event;
    if (!method || !params) {
      throw new Error(
        "recordEvent expects a BiDi event with method and params",
      );
    }

    switch (method) {
      case "network.beforeRequestSent":
        this._onBeforeRequestSent(params);
        break;
      case "network.responseCompleted":
        this._onResponseCompleted(params);
        break;
      case "browsingContext.contextCreated":
        this._onContextCreatedEvent(params);
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
   *
   * @param {string} initialPageUrl
   *     URL for the initial page. Optional.
   * @returns {Promise<void>}
   */
  startRecording(initialPageUrl) {
    if (this._recording) {
      throw new Error("HAR recording already started");
    }
    this._log("Start recording");

    if (initialPageUrl) {
      this._initialPageUrl = initialPageUrl;
    }

    this._recording = true;
  }

  /**
   * Unsubscribe to log event
   *
   * @param {string} lastPageUrl
   *     URL for the initial page. Optional.
   * @returns {Promise<void>}
   */
  stopRecording(lastPageUrl) {
    if (!this._recording) {
      throw new Error("HAR recording not started");
    }

    this._log("Stop recording");

    if (lastPageUrl) {
      this._lastPageUrl = lastPageUrl;
    }

    const harExport = this._exportAsHar();

    this.networkEntries = [];
    this.pageTimings = [];
    this._recording = false;

    return harExport;
  }

  _createPageData(id, url, startedTime) {
    return {
      id,
      pageTimings: {},
      startedDateTime: new Date(startedTime).toISOString(),
      title: url,
      // startedTime and url are temporary properties, and will be deleted
      // before generating the HAR.
      startedTime: startedTime,
      url: url,
    };
  }

  _deserializeHeaders(headersOrCookies) {
    if (!Array.isArray(headersOrCookies)) {
      return [];
    }

    return headersOrCookies.map(({ name, value }) => {
      // Legacy implementation for old WebDriver BiDi network events.
      if (typeof value == "string") {
        return { name, value: this._headerValueFormatter(name, value) };
      }

      // WebDriver BiDi network events using network.BytesValue
      switch (value?.type) {
        case "string":
          return { name, value: this._headerValueFormatter(name, value.value) };
        case "base64":
          this._log(`Header with type=base64 not supported yet, name: ${name}`);
          return { name };
        default:
          this._log(`Unknown header format, name: ${name}, value: ${value}`);
          return { name };
      }
    });
  }

  /**
   * Extract body content from BytesValue format
   *
   * @param {Object} bytesValue
   *     BiDi BytesValue object with type and value
   * @returns {Object}
   *     Object with { text, encoding } for HAR content field
   * @private
   */
  _extractBodyContent(bytesValue) {
    if (!bytesValue || !bytesValue.type) {
      return { text: "", encoding: "" };
    }

    switch (bytesValue.type) {
      case "string":
        return {
          text: bytesValue.value || "",
          encoding: "",
        };

      case "base64":
        return {
          text: bytesValue.value || "",
          encoding: "base64",
        };

      default:
        this._log(`Unknown BytesValue type: ${bytesValue.type}`);
        return { text: "", encoding: "" };
    }
  }

  /**
   * Extract MIME type from request headers for postData
   *
   * @param {Array} headers
   *     Array of header objects with name/value
   * @returns {string}
   *     MIME type or "application/octet-stream" as default
   * @private
   */
  _getRequestMimeType(headers) {
    if (!Array.isArray(headers)) {
      return "application/octet-stream";
    }

    const contentTypeHeader = headers.find(
      (h) => h.name && h.name.toLowerCase() === "content-type",
    );

    if (!contentTypeHeader) {
      return "application/octet-stream";
    }

    if (typeof contentTypeHeader.value === "string") {
      return contentTypeHeader.value;
    }

    if (contentTypeHeader.value?.type === "string") {
      return contentTypeHeader.value.value;
    }

    return "application/octet-stream";
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

    this._log("Building HAR");
    this._log("Building pages");
    const pages = [];
    for (const pageTiming of this.pageTimings) {
      this._log(
        `Process page timing with type: ${pageTiming.type} for url: ${pageTiming.url}`,
      );
      // Check if there is already a page item in this recording for the same URL.
      // Also exclude page entries which already have a timing corresponding to
      // the type ("load", "domContentLoaded"...), which would indicate another
      // navigation to the same URL.
      let page = pages.find(
        (p) => p.url === pageTiming.url && !p.pageTimings[pageTiming.type],
      );
      if (!page) {
        // Create a base page record.
        const id = `page_${pages.length + 1}`;
        this._log(
          `Create page entry for url: ${pageTiming.url} with id: ${id}`,
        );
        page = this._createPageData(id, pageTiming.url, pageTiming.startedTime);
        pages.push(page);
      }

      // Add the timing, which is the relative time for either DOMContentLoaded or Load
      page.pageTimings[pageTiming.type] = pageTiming.relativeTime;
    }

    if (!pages.length && this.networkEntries.length) {
      this._log(
        `No page recorded, creating a dummy page for url: ${this._lastPageUrl}`,
      );
      const firstRequest = this.networkEntries[0].request;
      const startedTime = this._normalizeTiming(
        firstRequest.timings.requestTime,
      );
      pages.push(
        this._createPageData("page_1", this._lastPageUrl, startedTime),
      );
    }

    recording.log.pages = pages;

    for (const networkEntry of this.networkEntries) {
      this._log(`Process network entry for url: ${networkEntry.url}`);

      if (!networkEntry.response) {
        this._log(
          `Warning: Ignoring entry without response for url: ${networkEntry.url} (id: ${networkEntry.id})`,
        );
        continue;
      }

      if (networkEntry.request.timings.requestTime == 0) {
        this._log(
          `Warning: Ignoring entry with invalid requestTime for url: ${networkEntry.url} (id: ${networkEntry.id})`,
        );
        continue;
      }

      const entry = this._toHAREntry(networkEntry);
      for (const page of recording.log.pages) {
        if (page.startedTime <= entry.startedTime) {
          entry.pageref = page.id;
        }
      }

      if (entry.pageref) {
        this._log(
          `Network entry for url: ${networkEntry.url} attached to page with id: ${entry.pageref}`,
        );
      } else {
        this._log(
          `Could not find a page matching entry: ${networkEntry.url}, creating dummy page for url: ${this._initialPageUrl}`,
        );
        const firstRequest = this.networkEntries[0].request;
        const startedTime = this._normalizeTiming(
          firstRequest.timings.requestTime,
        );
        const initialPageId = "page_0";
        recording.log.pages.splice(
          0,
          0,
          this._createPageData(
            initialPageId,
            this._initialPageUrl,
            startedTime,
          ),
        );
        entry.pageref = initialPageId;
      }
      delete entry.startedTime;
      recording.log.entries.push(entry);
    }

    for (const page of recording.log.pages) {
      // Rename timings
      if (page.pageTimings.domContentLoaded) {
        page.pageTimings.onContentLoad = page.pageTimings.domContentLoaded * 1;
      }

      if (page.pageTimings.load) {
        page.pageTimings.onLoad = page.pageTimings.load * 1;
      }

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
  _findLast(array, predicate) {
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

  _isDataURL(url) {
    return url.startsWith("data:");
  }

  _normalizeTiming(timing) {
    // Firefox 131 or older returned timings in microseconds whereas Firefox 132
    // or newer returns timings in milliseconds, as expected in the spec.
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1916685
    if (this._isInMicroseconds === undefined) {
      // If timing is at least a 100 times greater than the current date, we are
      // dealing with microseconds.
      this._isInMicroseconds = timing > Date.now() * 100;
    }

    if (this._isInMicroseconds) {
      return timing / 1000;
    }

    return timing;
  }

  _log(message) {
    if (this._debugLogs) {
      console.log(`[har-recorder] ${message}`);
    }
  }

  _onBeforeRequestSent(params) {
    const id = params.request.request + "-" + params.redirectCount;
    const url = params.request.url;

    if (this._isDataURL(url)) {
      // Currently timings for data URLs are completely incorrect and it is not
      // clear if data URLs are relevant for HAR export.
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1916651
      return;
    }

    this._log(
      `Event "beforeRequestSent" for url: ${this._shortUrl(url)} (id: ${id})`,
    );
    this.networkEntries.push({
      contextId: params.context,
      id,
      url,
      redirectCount: params.redirectCount,
      request: params.request,
    });
  }

  _onBrowsingContextEvent(type, params) {
    let { context, timestamp, url } = params;

    if (!this.topLevelContexts.includes(context)) {
      this._log(
        `Browsing context event "${type}" for url: ${this._shortUrl(
          url,
        )} discarded (not a top-level context)`,
      );
      return;
    }

    let relativeTime = +Infinity,
      startedTime = -1;

    if (type === "load") {
      this._log(
        `Event "load" for url: ${this._shortUrl(url)} (context id: ${context})`,
      );
      const firstTiming = this._findLast(
        this.pageTimings,
        (timing) => timing.contextId === context,
      );

      if (!firstTiming || firstTiming.type != "domContentLoaded") {
        this._log(
          `Warning: "domContentLoaded" event not found for "load" for url: ${this._shortUrl(
            url,
          )} (context id: ${context})`,
        );
        return;
      }
      startedTime = firstTiming.startedTime;
      url = firstTiming.url;
    } else {
      this._log(
        `Event "domContentLoaded" for url: ${this._shortUrl(
          url,
        )} (context id: ${context})`,
      );
      let firstRequest = this._findLast(
        this.networkEntries,
        (entry) => entry.contextId === context && entry.request.url === url,
      );

      if (!firstRequest) {
        // Alternatively settle on the previous
        this._log(
          `Warning: No request found for "domContentLoaded" using url: ${this._shortUrl(
            url,
          )} and context id: ${context}`,
        );
        firstRequest = this._findLast(
          this.networkEntries,
          (entry) =>
            entry.contextId === context &&
            entry.response?.mimeType?.startsWith("text/html"),
        );
      }

      if (!firstRequest) {
        // Bail if we can't find any request matching this browsing context.
        this._log(
          `Warning: No request found for "domContentLoaded" using only context id: ${context}`,
        );
        this._log(`Warning: Bailing out`);
        return;
      }

      if (firstRequest.redirectCount > 0) {
        const firstRequestWithRedirects = this._findLast(
          this.networkEntries,
          (entry) =>
            entry.request.request === firstRequest.request.request &&
            entry.redirectCount == 0,
        );

        firstRequest = firstRequestWithRedirects || firstRequest;
      }

      const timings = firstRequest.request.timings;
      startedTime = this._normalizeTiming(timings.requestTime);
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

  _onContextCreatedEvent(params) {
    if (!params.parent) {
      this.topLevelContexts.push(params.context);
    }
  }

  _onResponseCompleted(params) {
    const id = params.request.request + "-" + params.redirectCount;
    const url = params.request.url;

    if (this._isDataURL(url)) {
      // Currently timings for data URLs are completely incorrect and it is not
      // clear if data URLs are relevant for HAR export.
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1916651
      return;
    }

    this._log(
      `Event "responseCompleted" for url: ${this._shortUrl(url)} (id: ${id})`,
    );

    const entry = this.networkEntries.find(
      (e) =>
        e.request.request === params.request.request &&
        e.redirectCount === params.redirectCount,
    );
    if (entry) {
      entry.request = params.request;
      entry.response = params.response;

      if (params._bodyData) {
        entry._bodyData = params._bodyData;
      }
    } else {
      this._log(
        `Warning: no matching entry found for url: ${this._shortUrl(
          url,
        )} (id: ${id})`,
      );
    }
  }

  _parseQueryString(url) {
    try {
      const urlObject = new URL(url);
      return [...urlObject.searchParams.entries()].map(([name, value]) => {
        return { name, value };
      });
    } catch (e) {
      if (this._debugLogs) {
        console.error("Failed to parse query string for url", url);
        console.error(e);
      }
      return [];
    }
  }

  _shortUrl(url) {
    if (!this._debugLogs || !url || url.length <= 150) {
      return url;
    }

    let s1 = url.substring(0, 150 / 2);
    let s2 = url.substring(url.length - 150 / 2);
    return `${s1} ... ${s2}`;
  }

  _toHAREntry(networkEntry) {
    const harEntry = {};

    // Most of the default values (eg "?" or -1 or []) are needed for cached
    // responses which currently don't come with enough information.
    // See https://bugzilla.mozilla.org/show_bug.cgi?id=1806802
    harEntry.request = {
      bodySize: networkEntry.request.bodySize,
      method: networkEntry.request.method,
      url: networkEntry.request.url,
      httpVersion: networkEntry.response.protocol || "?",
      headers: this._deserializeHeaders(networkEntry.request.headers),
      cookies: this._deserializeHeaders(networkEntry.request.cookies),
      queryString: this._parseQueryString(networkEntry.request.url) || [],
      headersSize: networkEntry.request.headersSize,
    };

    if (networkEntry._bodyData?.requestBody) {
      const bodyContent = this._extractBodyContent(
        networkEntry._bodyData.requestBody,
      );
      if (bodyContent.text) {
        harEntry.request.postData = {
          mimeType: this._getRequestMimeType(networkEntry.request.headers),
          params: [],
          ...bodyContent,
          comment: "",
        };
      }
    }

    const timings = networkEntry.request.timings;
    harEntry.startedTime = this._normalizeTiming(timings.requestTime);
    harEntry.startedDateTime = new Date(harEntry.startedTime).toISOString();
    harEntry.response = {
      status: networkEntry.response.status || -1,
      statusText: networkEntry.response.statusText || "?",
      httpVersion: networkEntry.response.protocol || "?",
      headers: this._deserializeHeaders(networkEntry.response.headers),
      cookies: [],
      content: {
        mimeType: networkEntry.response.mimeType || "?",
        size: networkEntry.response.content.size,
        ...this._extractBodyContent(networkEntry._bodyData?.responseBody),
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
    harEntry.timings.blocked = this._normalizeTiming(timings.dnsStart - last);

    last = timings.dnsStart || last;
    harEntry.timings.dns = this._normalizeTiming(
      timings.dnsEnd - timings.dnsStart,
    );

    last = timings.connectStart || last;
    harEntry.timings.connect = this._normalizeTiming(timings.connectEnd - last);

    last = timings.tlsStart || last;
    harEntry.timings.ssl = this._normalizeTiming(timings.tlsEnd - last);

    last = timings.tlsEnd || last;
    harEntry.timings.send = this._normalizeTiming(timings.requestStart - last);

    last = timings.requestStart || last;
    harEntry.timings.wait = this._normalizeTiming(timings.responseStart - last);

    last = timings.responseStart || last;
    harEntry.timings.receive = this._normalizeTiming(
      timings.responseEnd - last,
    );

    let time = 0;
    for (const key of Object.keys(harEntry.timings)) {
      harEntry.timings[key] = Math.max(0, harEntry.timings[key]);
      time += harEntry.timings[key];
    }

    harEntry.time = time;
    return harEntry;
  }
}

module.exports = HarRecorder;
