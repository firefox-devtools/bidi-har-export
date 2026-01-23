/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { HarRecorder } = require("..");
const { getMockEvents } = require("./resources/mock-events");

// Common test function to run against legacy and non-legacy headers format.
function getHarExport({ useLegacyHeaderFormat, headerValueFormatter }) {
  const recorder = new HarRecorder({
    browser: "browser",
    version: "version",
    headerValueFormatter,
  });

  recorder.startRecording();

  const startTime = Date.now();
  const {
    beforeRequestSentEvent,
    domContentLoadedEvent,
    loadEvent,
    responseCompletedEvent,
  } = getMockEvents(startTime, { useLegacyHeaderFormat });

  recorder.recordEvent(beforeRequestSentEvent);
  recorder.recordEvent(responseCompletedEvent);
  recorder.recordEvent(domContentLoadedEvent);
  recorder.recordEvent(loadEvent);

  return recorder.stopRecording();
}

function testHeaders({ useLegacyHeaderFormat }) {
  const harExport = getHarExport({ useLegacyHeaderFormat });
  const entry = harExport.log.entries[0];
  expect(Array.isArray(entry.request.headers)).toBe(true);
  expect(Array.isArray(entry.response.headers)).toBe(true);

  const hostHeader = entry.request.headers.find(
    (header) => header.name === "Host",
  );
  expect(hostHeader).toBeDefined();
  expect(hostHeader.value).toBe("example.com");

  const contentEncodingHeader = entry.response.headers.find(
    (header) => header.name === "content-encoding",
  );
  expect(contentEncodingHeader).toBeDefined();
  expect(contentEncodingHeader.value).toBe("gzip");
}

test("HarRecorder generates har with headers", () => {
  testHeaders({ useLegacyHeaderFormat: false });
});

test("HarRecorder generates har with headers from legacy events", () => {
  testHeaders({ useLegacyHeaderFormat: true });
});

test("HarRecorder generates har with headers formatted by the headerValueFormatter, if provided", () => {
  const harExport = getHarExport({
    useLegacyHeaderFormat: false,
    headerValueFormatter: (name, value) => {
      if (name === "Authorization") {
        return "[REDACTED]";
      }
      return value;
    },
  });

  const entry = harExport.log.entries[0];
  const authorizationHeader = entry.request.headers.find(
    (header) => header.name === "Authorization",
  );
  expect(authorizationHeader).toBeDefined();
  expect(authorizationHeader.value).toBe("[REDACTED]");
});
