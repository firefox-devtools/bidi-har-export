/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { HarRecorder } = require("..");
const { getMockEvents } = require("./resources/mock-events");

test("HarRecorder generates empty har export", () => {
  const recorder = new HarRecorder({ browser: "browser", version: "version" });

  recorder.startRecording();
  const harExport = recorder.stopRecording();

  expect(harExport).toBeDefined();
  expect(harExport.log).toBeDefined();

  expect(harExport.log.pages).toStrictEqual([]);
  expect(harExport.log.entries).toStrictEqual([]);
});

test("HarRecorder generates simple har export", () => {
  const recorder = new HarRecorder({ browser: "browser", version: "version" });

  recorder.startRecording();

  const startTime = Date.now();
  const {
    beforeRequestSentEvent,
    domContentLoadedEvent,
    loadEvent,
    responseCompletedEvent,
  } = getMockEvents(startTime);

  recorder.recordEvent(beforeRequestSentEvent);
  recorder.recordEvent(responseCompletedEvent);
  recorder.recordEvent(domContentLoadedEvent);
  recorder.recordEvent(loadEvent);

  const harExport = recorder.stopRecording();

  expect(harExport).toBeDefined();
  expect(harExport.log).toBeDefined();

  expect(harExport.log.pages.length).toBe(1);
  expect(harExport.log.entries.length).toBe(1);
});
