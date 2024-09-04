/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { HarRecorder } = require("..");
const { getMockEvents } = require("./resources/mock-events");

test("HarRecorder generates har export with single page when iframe loads", () => {
  const recorder = new HarRecorder({ browser: "browser", version: "version" });

  recorder.startRecording();

  const startTime = Date.now();
  const {
    beforeRequestSentEvent: parentBeforeRequestSentEvent,
    contextCreatedEvent: parentContextCreatedEvent,
    domContentLoadedEvent: parentDomContentLoadedEvent,
    loadEvent: parentLoadEvent,
    responseCompletedEvent: parentResponseCompletedEvent,
  } = getMockEvents(startTime, {
    url: "https://other.example.com/",
    contextId: "parent-context",
  });

  const {
    beforeRequestSentEvent: childBeforeRequestSentEvent,
    contextCreatedEvent: childContextCreatedEvent,
    domContentLoadedEvent: childDomContentLoadedEvent,
    loadEvent: childLoadEvent,
    responseCompletedEvent: childResponseCompletedEvent,
  } = getMockEvents(startTime + 1000, {
    url: "https://other.example.com/",
    contextId: "child-context",
    parentContextId: "parent-context",
  });

  recorder.recordEvent(parentBeforeRequestSentEvent);
  recorder.recordEvent(parentResponseCompletedEvent);
  recorder.recordEvent(parentContextCreatedEvent);
  recorder.recordEvent(parentDomContentLoadedEvent);
  recorder.recordEvent(parentLoadEvent);
  recorder.recordEvent(childBeforeRequestSentEvent);
  recorder.recordEvent(childResponseCompletedEvent);
  recorder.recordEvent(childContextCreatedEvent);
  recorder.recordEvent(childDomContentLoadedEvent);
  recorder.recordEvent(childLoadEvent);

  const harExport = recorder.stopRecording();

  expect(harExport).toBeDefined();
  expect(harExport.log).toBeDefined();

  expect(harExport.log.pages.length).toBe(1);
  expect(harExport.log.entries.length).toBe(2);
  expect(harExport.log.entries[0].pageref).toBe(harExport.log.pages[0].id);
  expect(harExport.log.entries[1].pageref).toBe(harExport.log.pages[0].id);
});
