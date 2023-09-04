/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { HarRecorder } = require("..");
const { getMockEvents } = require("./resources/mock-events");

// Common test function to run against legacy and non-legacy headers format.
function runHeadersTest({ useLegacyHeaderFormat }) {
  const recorder = new HarRecorder({ browser: "browser", version: "version" });

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

  const harExport = recorder.stopRecording();
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

test("HarRecorder generates har with headers ", () => {
  runHeadersTest({ useLegacyHeaderFormat: false });
});

test("HarRecorder generates har with headers from legacy events", () => {
  runHeadersTest({ useLegacyHeaderFormat: true });
});
