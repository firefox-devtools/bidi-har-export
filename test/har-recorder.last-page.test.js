/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { HarRecorder } = require("..");
const { getMockEvents } = require("./resources/mock-events");

test("HarRecorder generates har export with default last page", () => {
  const recorder = new HarRecorder({ browser: "browser", version: "version" });

  recorder.startRecording();

  const startTime = Date.now();
  const {
    beforeRequestSentEvent,
    responseCompletedEvent,
  } = getMockEvents(startTime);

  recorder.recordEvent(beforeRequestSentEvent);
  recorder.recordEvent(responseCompletedEvent);

  const harExport = recorder.stopRecording();

  expect(harExport).toBeDefined();
  expect(harExport.log).toBeDefined();

  expect(harExport.log.pages.length).toBe(1);
  expect(harExport.log.entries.length).toBe(1);
  expect(harExport.log.entries[0].pageref).toBe(harExport.log.pages[0].id);
  expect(harExport.log.pages[0].pageTimings.onContentLoad).toBeUndefined();
  expect(harExport.log.pages[0].pageTimings.onLoad).toBeUndefined();
});

test("HarRecorder generates har export with provided last page", () => {
  const recorder = new HarRecorder({ browser: "browser", version: "version" });

  recorder.startRecording();

  const startTime = Date.now();
  const {
    beforeRequestSentEvent,
    responseCompletedEvent,
  } = getMockEvents(startTime);

  recorder.recordEvent(beforeRequestSentEvent);
  recorder.recordEvent(responseCompletedEvent);

  const lastPageUrl = "https://last.page.url";
  const harExport = recorder.stopRecording(lastPageUrl);

  expect(harExport).toBeDefined();
  expect(harExport.log).toBeDefined();

  expect(harExport.log.pages.length).toBe(1);
  expect(harExport.log.entries.length).toBe(1);
  expect(harExport.log.entries[0].pageref).toBe(harExport.log.pages[0].id);
  expect(harExport.log.pages[0].title).toBe(lastPageUrl);
  expect(harExport.log.pages[0].pageTimings.onContentLoad).toBeUndefined();
  expect(harExport.log.pages[0].pageTimings.onLoad).toBeUndefined();
});
