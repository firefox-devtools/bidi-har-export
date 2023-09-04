/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

exports.requestHeaders = [
  {
    name: "Host",
    value: {
      type: "string",
      value: "example.com",
    },
  },
  {
    name: "User-Agent",
    value: {
      type: "string",
      value:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/112.0",
    },
  },
  {
    name: "Accept",
    value: {
      type: "string",
      value:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    },
  },
  {
    name: "Accept-Language",
    value: {
      type: "string",
      value: "en-US,en;q=0.5",
    },
  },
  {
    name: "Accept-Encoding",
    value: {
      type: "string",
      value: "gzip, deflate, br",
    },
  },
  {
    name: "Connection",
    value: {
      type: "string",
      value: "keep-alive",
    },
  },
  {
    name: "Upgrade-Insecure-Requests",
    value: {
      type: "string",
      value: "1",
    },
  },
  {
    name: "Sec-Fetch-Dest",
    value: {
      type: "string",
      value: "document",
    },
  },
  {
    name: "Sec-Fetch-Mode",
    value: {
      type: "string",
      value: "navigate",
    },
  },
  {
    name: "Sec-Fetch-Site",
    value: {
      type: "string",
      value: "none",
    },
  },
  {
    name: "Sec-Fetch-User",
    value: {
      type: "string",
      value: "?1",
    },
  },
];

exports.responseHeaders = [
  {
    name: "content-encoding",
    value: {
      type: "string",
      value: "gzip",
    },
  },
  {
    name: "accept-ranges",
    value: {
      type: "string",
      value: "bytes",
    },
  },
  {
    name: "age",
    value: {
      type: "string",
      value: "581048",
    },
  },
  {
    name: "cache-control",
    value: {
      type: "string",
      value: "max-age=604800",
    },
  },
  {
    name: "content-type",
    value: {
      type: "string",
      value: "text/html; charset=UTF-8",
    },
  },
  {
    name: "date",
    value: {
      type: "string",
      value: "Mon, 20 Feb 2023 21:52:12 GMT",
    },
  },
  {
    name: "etag",
    value: {
      type: "string",
      value: '"3147526947"',
    },
  },
  {
    name: "expires",
    value: {
      type: "string",
      value: "Mon, 27 Feb 2023 21:52:12 GMT",
    },
  },
  {
    name: "last-modified",
    value: {
      type: "string",
      value: "Thu, 17 Oct 2019 07:18:26 GMT",
    },
  },
  {
    name: "server",
    value: {
      type: "string",
      value: "ECS (dcb/7ECB)",
    },
  },
  {
    name: "vary",
    value: {
      type: "string",
      value: "Accept-Encoding",
    },
  },
  {
    name: "x-cache",
    value: {
      type: "string",
      value: "HIT",
    },
  },
  {
    name: "content-length",
    value: {
      type: "string",
      value: "648",
    },
  },
  {
    name: "X-Firefox-Spdy",
    value: {
      type: "string",
      value: "h2",
    },
  },
];
