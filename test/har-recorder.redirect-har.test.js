/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { HarRecorder } = require("..");
const { getMockEvents } = require("./resources/mock-events");

test("HarRecorder generates a valid har export with redirects", () => {
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

  // Get 2 additional events, starting 10 ms before the "main" events.
  const redirectedEvents = getMockEvents(startTime - 10, { requestId });
  const redirectedUrl = redirectedEvents.beforeRequestSentEvent.params.request.url + "redirected";
  redirectedEvents.beforeRequestSentEvent.params.request.url = redirectedUrl;
  redirectedEvents.responseCompletedEvent.params.request.url = redirectedUrl;

  // Set redirectCount for the original events to 1, to make them redirects of
  // the additional events created above.
  beforeRequestSentEvent.params.redirectCount = 1;
  responseCompletedEvent.params.redirectCount = 1;


  recorder.recordEvent(redirectedEvents.beforeRequestSentEvent);
  recorder.recordEvent(beforeRequestSentEvent);
  recorder.recordEvent(redirectedEvents.responseCompletedEvent);
  recorder.recordEvent(responseCompletedEvent);
  recorder.recordEvent(domContentLoadedEvent);
  recorder.recordEvent(loadEvent);

  const harExport = recorder.stopRecording();

  expect(harExport).toBeDefined();
  expect(harExport.log).toBeDefined();

  expect(harExport.log.pages.length).toBe(1);
  expect(harExport.log.entries.length).toBe(2);

  for (const entry of harExport.log.entries) {
    expect(entry.pageref).toBe(harExport.log.pages[0].id);
  }
});
