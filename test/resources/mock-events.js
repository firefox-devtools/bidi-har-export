/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
let { requestHeaders, responseHeaders } = require("./common-resources");

let gRequestId = 10;

function getMockEvents(startTime, options = {}) {
  const {
    contextId = "context-1",
    parentContextId = null,
    useLegacyHeaderFormat = false,
    useMicroseconds = false,
  } = options;
  const highResStartTime = startTime * (useMicroseconds ? 1000 : 1);
  const requestId = (options.requestId || gRequestId++) + "";

  if (useLegacyHeaderFormat) {
    requestHeaders = requestHeaders.map(({ name, value }) => {
      return { name, value: value.value };
    });
    responseHeaders = responseHeaders.map(({ name, value }) => {
      return { name, value: value.value };
    });
  }

  const beforeRequestSentEvent = {
    method: "network.beforeRequestSent",
    params: {
      context: contextId,
      isRedirect: false,
      redirectCount: 0,
      navigation: null,
      request: {
        bodySize: null,
        cookies: [],
        headers: requestHeaders,
        headersSize: 447,
        method: "GET",
        request: requestId,
        timings: {
          originTime: 0,
          requestTime: highResStartTime + 50,
          redirectStart: 0,
          redirectEnd: 0,
          fetchStart: 0,
          dnsStart: 0,
          dnsEnd: 0,
          connectStart: 0,
          connectEnd: 0,
          tlsStart: 0,
          tlsEnd: 0,
          requestStart: 0,
          responseStart: 0,
          responseEnd: 0,
        },
        url: options.url || "https://example.com/",
        rawHeaders:
          "GET / HTTP/1.1\r\nHost: example.com\r\nUser-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/112.0\r\nAccept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8\r\nAccept-Language: en-US,en;q=0.5\r\nAccept-Encoding: gzip, deflate, br\r\nConnection: keep-alive\r\nUpgrade-Insecure-Requests: 1\r\nSec-Fetch-Dest: document\r\nSec-Fetch-Mode: navigate\r\nSec-Fetch-Site: none\r\nSec-Fetch-User: ?1\r\n\r\n",
      },
      timestamp: startTime,
      initiator: {
        type: "other",
      },
    },
  };

  const responseCompletedEvent = {
    method: "network.responseCompleted",
    params: {
      context: contextId,
      isRedirect: false,
      redirectCount: 0,
      navigation: null,
      request: {
        bodySize: null,
        cookies: [],
        headers: requestHeaders,
        headersSize: 447,
        method: "GET",
        request: requestId,
        timings: {
          originTime: 0,
          requestTime: highResStartTime + 50,
          redirectStart: 0,
          redirectEnd: 0,
          fetchStart: highResStartTime + 100,
          dnsStart: highResStartTime + 150,
          dnsEnd: highResStartTime + 200,
          connectStart: highResStartTime + 300,
          connectEnd: highResStartTime + 400,
          tlsStart: highResStartTime + 500,
          tlsEnd: highResStartTime + 600,
          requestStart: highResStartTime + 700,
          responseStart: highResStartTime + 800,
          responseEnd: highResStartTime + 900,
        },
        url: options.url || "https://example.com/",
        rawHeaders:
          "GET / HTTP/1.1\r\nHost: example.com\r\nUser-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/112.0\r\nAccept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8\r\nAccept-Language: en-US,en;q=0.5\r\nAccept-Encoding: gzip, deflate, br\r\nConnection: keep-alive\r\nUpgrade-Insecure-Requests: 1\r\nSec-Fetch-Dest: document\r\nSec-Fetch-Mode: navigate\r\nSec-Fetch-Site: none\r\nSec-Fetch-User: ?1\r\n\r\n",
      },
      timestamp: startTime + 10,
      response: {
        bodySize: 648,
        content: {
          size: 1256,
        },
        headersSize: 392,
        url: options.url || "https://example.com/",
        bytesReceived: 1040,
        fromCache: false,
        protocol: "http/2",
        status: 200,
        statusText: "OK",
        headers: responseHeaders,
        mimeType: "text/html;charset=UTF-8",
      },
    },
  };

  const contextCreatedEvent = {
    method: "browsingContext.contextCreated",
    params: {
      context: contextId,
      parent: parentContextId,
      url: options.url || "https://example.com/",
      userContext: "default",
      timestamp: startTime + 4,
    },
  };

  const domContentLoadedEvent = {
    method: "browsingContext.domContentLoaded",
    params: {
      context: contextId,
      url: options.url || "https://example.com/",
      timestamp: startTime + 5,
    },
  };

  const loadEvent = {
    method: "browsingContext.load",
    params: {
      context: contextId,
      url: options.url || "https://example.com/",
      timestamp: startTime + 15,
    },
  };

  return {
    beforeRequestSentEvent,
    contextCreatedEvent,
    domContentLoadedEvent,
    loadEvent,
    responseCompletedEvent,
  };
}

exports.getMockEvents = getMockEvents;
