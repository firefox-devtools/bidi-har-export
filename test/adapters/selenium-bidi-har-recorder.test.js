/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { adapters } = require("../..");
const { getMockEvents } = require("../resources/mock-events");
const { MockDriver } = require("../resources/mock-driver");

test("SeleniumBiDiHarRecorder generates simple har export", async () => {
  const contextId = "context-1";
  const startTime = Date.now();
  const {
    beforeRequestSentEvent,
    domContentLoadedEvent,
    loadEvent,
    responseCompletedEvent,
  } = getMockEvents(startTime, { contextId });

  const events = [
    beforeRequestSentEvent,
    domContentLoadedEvent,
    loadEvent,
    responseCompletedEvent,
  ];

  const driver = new MockDriver();
  const recorder = new adapters.SeleniumBiDiHarRecorder({
    browsingContextIds: [contextId],
    driver,
  });

  await recorder.startRecording();
  driver._mockEmitEvent(beforeRequestSentEvent);
  driver._mockEmitEvent(domContentLoadedEvent);
  driver._mockEmitEvent(responseCompletedEvent);
  driver._mockEmitEvent(loadEvent);

  const harExport = await recorder.stopRecording();

  expect(harExport).toBeDefined();
  expect(harExport.log).toBeDefined();

  expect(harExport.log.pages.length).toBe(1);
  expect(harExport.log.entries.length).toBe(1);
});
