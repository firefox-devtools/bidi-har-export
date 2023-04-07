/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

exports.requestHeaders = [
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
]

exports.responseHeaders = [
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
]