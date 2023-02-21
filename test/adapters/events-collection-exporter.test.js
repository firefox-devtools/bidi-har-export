/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { adapters } = require("../..");
const { getMockEvents } = require("../resources/mock-events");

test("EventsCollectionExporter generates simple har export", () => {
  const startTime = Date.now();
  const {
    beforeRequestSentEvent,
    domContentLoadedEvent,
    loadEvent,
    responseCompletedEvent,
  } = getMockEvents(startTime);

  const testCases = [{
    name: "Expected order",
    events: [
      beforeRequestSentEvent,
      domContentLoadedEvent,
      loadEvent,
      responseCompletedEvent,
    ],
  },
  {
    name: "random order",
    events: [
      loadEvent,
      domContentLoadedEvent,
      responseCompletedEvent,
      beforeRequestSentEvent,
    ],
  }];

  for (const { name, events } of testCases) {
    console.log("Test case: " + name);
    const exporter = new adapters.EventsCollectionExporter(events, {
      browser: "browser",
      version: "version",
    });
    const harExport = exporter.exportAsHar();

    expect(harExport).toBeDefined();
    expect(harExport.log).toBeDefined();

    expect(harExport.log.pages.length).toBe(1);
    expect(harExport.log.entries.length).toBe(1);
  }
});