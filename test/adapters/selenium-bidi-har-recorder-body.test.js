/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { adapters } = require("../..");
const { getMockEvents } = require("../resources/mock-events");

class MockDriverWithBodyData {
  constructor() {
    this._subscribedEvents = {};
    this._commandCalls = [];
  }

  async getBidi() {
    return this;
  }

  async getCapabilities() {
    return {
      get: (capability) => {
        switch (capability) {
          case "browserName":
            return "firefox";
          case "browserVersion":
            return "112.0a1";
          default:
            throw new Error("Unsupported capability: " + capability);
        }
      },
    };
  }

  get socket() {
    return Promise.resolve(this);
  }

  subscribe(event, contextIds) {
    this._subscribedEvents[event] = true;
  }

  unsubscribe(event, contextIds) {
    delete this._subscribedEvents[event];
  }

  off(eventName, callback) {
    if (eventName !== "message") {
      throw new Error("Unsupported eventName for MockDriver: " + eventName);
    }
    if (callback === this._onMessage) {
      delete this._onMessage;
    }
  }

  on(eventName, callback) {
    if (eventName !== "message") {
      throw new Error("Unsupported eventName for MockDriver: " + eventName);
    }
    this._onMessage = callback;
  }

  async send(command) {
    this._commandCalls.push(command.method);

    if (command.method === "network.addDataCollector") {
      return { result: {} };
    }

    if (command.method === "network.removeDataCollector") {
      return { result: {} };
    }

    if (command.method === "network.getData") {
      return {
        result: {
          request: {
            type: "string",
            value: '{"test":"request"}',
          },
          response: {
            type: "string",
            value: "<html><body>Test Response</body></html>",
          },
        },
      };
    }

    throw new Error("Unsupported command: " + command.method);
  }

  _mockEmitEvent(event) {
    if (this._subscribedEvents[event.method]) {
      this._onMessage({
        toString: () => {
          return JSON.stringify(event);
        },
      });
    }
  }
}

test("SeleniumBiDiHarRecorder collects body data", async () => {
  const contextId = "context-1";
  const startTime = Date.now();
  const { beforeRequestSentEvent, domContentLoadedEvent, loadEvent, responseCompletedEvent } =
    getMockEvents(startTime, { contextId });

  const events = [
    beforeRequestSentEvent,
    responseCompletedEvent,
    domContentLoadedEvent,
    loadEvent,
  ];

  const mockDriver = new MockDriverWithBodyData();
  const recorder = new adapters.SeleniumBiDiHarRecorder({
    driver: mockDriver,
    browsingContextIds: [contextId],
  });

  await recorder.startRecording();

  expect(mockDriver._commandCalls).toContain("network.addDataCollector");

  for (const event of events) {
    await mockDriver._mockEmitEvent(event);
  }

  const harExport = await recorder.stopRecording();

  expect(mockDriver._commandCalls).toContain("network.removeDataCollector");
  expect(mockDriver._commandCalls).toContain("network.getData");

  expect(harExport.log.entries).toHaveLength(1);
  expect(harExport.log.entries[0].response.content.text).toBe(
    "<html><body>Test Response</body></html>"
  );
  expect(harExport.log.entries[0].response.content.encoding).toBe("");
  expect(harExport.log.entries[0].request.postData).toBeDefined();
  expect(harExport.log.entries[0].request.postData.text).toBe('{"test":"request"}');
});

test("SeleniumBiDiHarRecorder handles data collector failure gracefully", async () => {
  const contextId = "context-1";
  const startTime = Date.now();
  const { beforeRequestSentEvent, domContentLoadedEvent, loadEvent, responseCompletedEvent } =
    getMockEvents(startTime, { contextId });

  const events = [
    beforeRequestSentEvent,
    responseCompletedEvent,
    domContentLoadedEvent,
    loadEvent,
  ];

  class MockDriverWithFailure extends MockDriverWithBodyData {
    async send(command) {
      if (command.method === "network.addDataCollector") {
        throw new Error("Data collector not supported");
      }
      return super.send(command);
    }
  }

  const mockDriver = new MockDriverWithFailure();
  const recorder = new adapters.SeleniumBiDiHarRecorder({
    driver: mockDriver,
    browsingContextIds: [contextId],
  });

  await recorder.startRecording();

  for (const event of events) {
    await mockDriver._mockEmitEvent(event);
  }

  const harExport = await recorder.stopRecording();

  expect(harExport.log.entries).toHaveLength(1);
  expect(harExport.log.entries[0].response.content.text).toBe("");
  expect(harExport.log.entries[0].request.postData).toBeUndefined();
});

test("SeleniumBiDiHarRecorder handles getData failure gracefully", async () => {
  const contextId = "context-1";
  const startTime = Date.now();
  const { beforeRequestSentEvent, domContentLoadedEvent, loadEvent, responseCompletedEvent } =
    getMockEvents(startTime, { contextId });

  const events = [
    beforeRequestSentEvent,
    responseCompletedEvent,
    domContentLoadedEvent,
    loadEvent,
  ];

  class MockDriverWithGetDataFailure extends MockDriverWithBodyData {
    async send(command) {
      if (command.method === "network.getData") {
        throw new Error("Request data no longer available");
      }
      return super.send(command);
    }
  }

  const mockDriver = new MockDriverWithGetDataFailure();
  const recorder = new adapters.SeleniumBiDiHarRecorder({
    driver: mockDriver,
    browsingContextIds: [contextId],
  });

  await recorder.startRecording();

  for (const event of events) {
    await mockDriver._mockEmitEvent(event);
  }

  const harExport = await recorder.stopRecording();

  expect(harExport.log.entries).toHaveLength(1);
  expect(harExport.log.entries[0].response.content.text).toBe("");
  expect(harExport.log.entries[0].request.postData).toBeUndefined();
});
