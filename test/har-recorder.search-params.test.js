/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { HarRecorder } = require("..");
const { getMockEvents } = require("./resources/mock-events");

test("HarRecorder handles query parameters correctly", () => {
  const recorder = new HarRecorder({ browser: "browser", version: "version" });

  recorder.startRecording();

  const startTime = Date.now();
  const { beforeRequestSentEvent, responseCompletedEvent } = getMockEvents(
    startTime,
    {
      url: "https://example.com/?v=alreadyDecoded%25",
    }
  );

  recorder.recordEvent(beforeRequestSentEvent);
  recorder.recordEvent(responseCompletedEvent);

  const harExport = recorder.stopRecording();

  expect(harExport).toBeDefined();
  expect(harExport.log).toBeDefined();
  expect(harExport.log.pages.length).toBe(1);
  expect(harExport.log.entries.length).toBe(1);

  const entry = harExport.log.entries[0];
  expect(entry.request.queryString.length).toBe(1);
  expect(entry.request.queryString[0].name).toBe("v");
  expect(entry.request.queryString[0].value).toBe("alreadyDecoded%");
});
