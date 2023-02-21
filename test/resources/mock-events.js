/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

function getMockEvents(startTime, options = {}) {
  const { contextId = "context-1" } = options;
  const highResStartTime = startTime * 1000;

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
        headers: [
          {
            name: "Host",
            value: "example.com",
          },
          {
            name: "User-Agent",
            value:
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/112.0",
          },
          {
            name: "Accept",
            value:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          },
          {
            name: "Accept-Language",
            value: "en-US,en;q=0.5",
          },
          {
            name: "Accept-Encoding",
            value: "gzip, deflate, br",
          },
          {
            name: "Connection",
            value: "keep-alive",
          },
          {
            name: "Upgrade-Insecure-Requests",
            value: "1",
          },
          {
            name: "Sec-Fetch-Dest",
            value: "document",
          },
          {
            name: "Sec-Fetch-Mode",
            value: "navigate",
          },
          {
            name: "Sec-Fetch-Site",
            value: "none",
          },
          {
            name: "Sec-Fetch-User",
            value: "?1",
          },
        ],
        headersSize: 447,
        method: "GET",
        request: "33",
        timings: {
          originTime: 0,
          requestTime: highResStartTime + 100,
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
        url: "https://example.com/",
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
        headers: [
          {
            name: "Host",
            value: "example.com",
          },
          {
            name: "User-Agent",
            value:
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/112.0",
          },
          {
            name: "Accept",
            value:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          },
          {
            name: "Accept-Language",
            value: "en-US,en;q=0.5",
          },
          {
            name: "Accept-Encoding",
            value: "gzip, deflate, br",
          },
          {
            name: "Connection",
            value: "keep-alive",
          },
          {
            name: "Upgrade-Insecure-Requests",
            value: "1",
          },
          {
            name: "Sec-Fetch-Dest",
            value: "document",
          },
          {
            name: "Sec-Fetch-Mode",
            value: "navigate",
          },
          {
            name: "Sec-Fetch-Site",
            value: "none",
          },
          {
            name: "Sec-Fetch-User",
            value: "?1",
          },
        ],
        headersSize: 447,
        method: "GET",
        request: "33",
        timings: {
          originTime: 0,
          requestTime: highResStartTime,
          redirectStart: 0,
          redirectEnd: 0,
          fetchStart: highResStartTime + 100,
          dnsStart: highResStartTime + 100,
          dnsEnd: highResStartTime + 200,
          connectStart: highResStartTime + 300,
          connectEnd: highResStartTime + 400,
          tlsStart: highResStartTime + 500,
          tlsEnd: highResStartTime + 600,
          requestStart: highResStartTime + 700,
          responseStart: highResStartTime + 800,
          responseEnd: highResStartTime + 900,
        },
        url: "https://example.com/",
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
        url: "https://example.com/",
        bytesReceived: 1040,
        fromCache: false,
        protocol: "http/2",
        status: 200,
        statusText: "OK",
        headers: [
          {
            name: "content-encoding",
            value: "gzip",
          },
          {
            name: "accept-ranges",
            value: "bytes",
          },
          {
            name: "age",
            value: "581048",
          },
          {
            name: "cache-control",
            value: "max-age=604800",
          },
          {
            name: "content-type",
            value: "text/html; charset=UTF-8",
          },
          {
            name: "date",
            value: "Mon, 20 Feb 2023 21:52:12 GMT",
          },
          {
            name: "etag",
            value: '"3147526947"',
          },
          {
            name: "expires",
            value: "Mon, 27 Feb 2023 21:52:12 GMT",
          },
          {
            name: "last-modified",
            value: "Thu, 17 Oct 2019 07:18:26 GMT",
          },
          {
            name: "server",
            value: "ECS (dcb/7ECB)",
          },
          {
            name: "vary",
            value: "Accept-Encoding",
          },
          {
            name: "x-cache",
            value: "HIT",
          },
          {
            name: "content-length",
            value: "648",
          },
          {
            name: "X-Firefox-Spdy",
            value: "h2",
          },
        ],
        mimeType: "text/html;charset=UTF-8",
      },
    },
  };

  const domContentLoadedEvent = {
    method: "browsingContext.domContentLoaded",
    params: {
      context: contextId,
      url: "https://example.com/",
      timestamp: startTime + 5,
    },
  };

  const loadEvent = {
    method: "browsingContext.load",
    params: {
      context: contextId,
      url: "https://example.com/",
      timestamp: startTime + 15,
    },
  };

  return {
    beforeRequestSentEvent,
    domContentLoadedEvent,
    loadEvent,
    responseCompletedEvent,
  };
}

exports.getMockEvents = getMockEvents;
