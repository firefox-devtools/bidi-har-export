/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { HarRecorder } = require("..");
const { getMockEvents } = require("./resources/mock-events");

test("HarRecorder generates har export without data URLs", () => {
  const recorder = new HarRecorder({ browser: "browser", version: "version" });

  recorder.startRecording();

  const requestId = 33;
  const startTime = Date.now();
  const {
    beforeRequestSentEvent,
    domContentLoadedEvent,
    loadEvent,
    responseCompletedEvent,
  } = getMockEvents(startTime, { requestId });

  // Create 1 additional event for a data url, starting 10 ms before the "main" events.
  const dataUrlEvents = getMockEvents(startTime - 10);
  const dataUrl = "data:text/html,foo";
  dataUrlEvents.beforeRequestSentEvent.params.request.url = dataUrl;
  dataUrlEvents.responseCompletedEvent.params.request.url = dataUrl;

  recorder.recordEvent(dataUrlEvents.beforeRequestSentEvent);
  recorder.recordEvent(dataUrlEvents.responseCompletedEvent);
  recorder.recordEvent(beforeRequestSentEvent);
  recorder.recordEvent(responseCompletedEvent);
  recorder.recordEvent(domContentLoadedEvent);
  recorder.recordEvent(loadEvent);

  const harExport = recorder.stopRecording();

  expect(harExport).toBeDefined();
  expect(harExport.log).toBeDefined();

  // We should only have one page and one entry, data URL event should be
  // filtered out.
  expect(harExport.log.pages.length).toBe(1);
  expect(harExport.log.entries.length).toBe(1);
});
