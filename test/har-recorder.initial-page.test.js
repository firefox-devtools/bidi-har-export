/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { HarRecorder } = require("..");
const { getMockEvents } = require("./resources/mock-events");

test("HarRecorder generates har export with default initial page", () => {
  const recorder = new HarRecorder({ browser: "browser", version: "version" });

  recorder.startRecording();

  const startTime = Date.now();
  const {
    beforeRequestSentEvent: earlyBeforeRequestSentEvent,
    responseCompletedEvent: earlyResponseCompletedEvent,
  } = getMockEvents(startTime, { url: "https://other.example.com/"});

  const {
    beforeRequestSentEvent,
    domContentLoadedEvent,
    loadEvent,
    responseCompletedEvent,
  } = getMockEvents(startTime + 10000);

  recorder.recordEvent(earlyBeforeRequestSentEvent);
  recorder.recordEvent(earlyResponseCompletedEvent);
  recorder.recordEvent(beforeRequestSentEvent);
  recorder.recordEvent(responseCompletedEvent);
  recorder.recordEvent(domContentLoadedEvent);
  recorder.recordEvent(loadEvent);

  const harExport = recorder.stopRecording();

  expect(harExport).toBeDefined();
  expect(harExport.log).toBeDefined();

  expect(harExport.log.pages.length).toBe(2);
  expect(harExport.log.entries.length).toBe(2);
  expect(harExport.log.entries[0].pageref).toBe(harExport.log.pages[0].id);
  expect(harExport.log.entries[1].pageref).toBe(harExport.log.pages[1].id);
  expect(harExport.log.pages[0].pageTimings.onContentLoad).toBeUndefined();
  expect(harExport.log.pages[1].pageTimings.onContentLoad).toBeDefined();
  expect(harExport.log.pages[0].pageTimings.onLoad).toBeUndefined();
  expect(harExport.log.pages[1].pageTimings.onLoad).toBeDefined();
});

test("HarRecorder generates har export with provided initial page", () => {
  const recorder = new HarRecorder({ browser: "browser", version: "version" });

  const initialPageUrl = "https://initial.page.url";
  recorder.startRecording(initialPageUrl);

  const startTime = Date.now();
  const {
    beforeRequestSentEvent: earlyBeforeRequestSentEvent,
    responseCompletedEvent: earlyResponseCompletedEvent,
  } = getMockEvents(startTime, { url: "https://other.example.com/"});

  const {
    beforeRequestSentEvent,
    domContentLoadedEvent,
    loadEvent,
    responseCompletedEvent,
  } = getMockEvents(startTime + 10000);

  recorder.recordEvent(earlyBeforeRequestSentEvent);
  recorder.recordEvent(earlyResponseCompletedEvent);
  recorder.recordEvent(beforeRequestSentEvent);
  recorder.recordEvent(responseCompletedEvent);
  recorder.recordEvent(domContentLoadedEvent);
  recorder.recordEvent(loadEvent);

  const harExport = recorder.stopRecording();

  expect(harExport).toBeDefined();
  expect(harExport.log).toBeDefined();

  expect(harExport.log.pages.length).toBe(2);
  expect(harExport.log.entries.length).toBe(2);
  expect(harExport.log.entries[0].pageref).toBe(harExport.log.pages[0].id);
  expect(harExport.log.pages[0].title).toBe(initialPageUrl);
  expect(harExport.log.entries[1].pageref).toBe(harExport.log.pages[1].id);
  expect(harExport.log.pages[0].pageTimings.onContentLoad).toBeUndefined();
  expect(harExport.log.pages[1].pageTimings.onContentLoad).toBeDefined();
  expect(harExport.log.pages[0].pageTimings.onLoad).toBeUndefined();
  expect(harExport.log.pages[1].pageTimings.onLoad).toBeDefined();
});
