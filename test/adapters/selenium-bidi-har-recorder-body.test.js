/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { adapters } = require("../..");
const { getMockEvents } = require("../resources/mock-events");
const { MockDriver } = require("../resources/mock-driver");

class MockDriverWithBodyData extends MockDriver {
  constructor() {
    super();
    this._commandCalls = [];
  }

  async send(command) {
    this._commandCalls.push(command.method);

    if (command.method === "network.addDataCollector") {
      return {
        type: "success",
        result: {
          collector: "test-collector-id-123",
        },
      };
    }

    if (command.method === "network.removeDataCollector") {
      if (command.params.dataCollector !== "test-collector-id-123") {
        return {
          type: "error",
          message: "invalid data collector id",
        };
      }
      return { type: "success", result: {} };
    }

    if (command.method === "network.getData") {
      const dataType = command.params.dataType;

      if (dataType === "request") {
        return {
          type: "success",
          result: {
            bytes: {
              type: "string",
              value: '{"test":"request"}',
            },
          },
        };
      }

      if (dataType === "response") {
        return {
          type: "success",
          result: {
            bytes: {
              type: "string",
              value: "<html><body>Test Response</body></html>",
            },
          },
        };
      }
    }

    throw new Error("Unsupported command: " + command.method);
  }
}

test("SeleniumBiDiHarRecorder collects body data", async () => {
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
    "<html><body>Test Response</body></html>",
  );
  expect(harExport.log.entries[0].response.content.encoding).toBe("");
  expect(harExport.log.entries[0].request.postData).toBeDefined();
  expect(harExport.log.entries[0].request.postData.text).toBe(
    '{"test":"request"}',
  );
});

test("SeleniumBiDiHarRecorder handles data collector failure gracefully", async () => {
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
    responseCompletedEvent,
    domContentLoadedEvent,
    loadEvent,
  ];

  class MockDriverWithFailure extends MockDriverWithBodyData {
    async send(command) {
      if (command.method === "network.addDataCollector") {
        return {
          type: "error",
          message: "Data collector not supported",
        };
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
  const {
    beforeRequestSentEvent,
    domContentLoadedEvent,
    loadEvent,
    responseCompletedEvent,
  } = getMockEvents(startTime, { contextId });

  const events = [
    beforeRequestSentEvent,
    responseCompletedEvent,
    domContentLoadedEvent,
    loadEvent,
  ];

  class MockDriverWithGetDataFailure extends MockDriverWithBodyData {
    async send(command) {
      if (command.method === "network.getData") {
        return {
          type: "error",
          message: "Request data no longer available",
        };
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

test("SeleniumBiDiHarRecorder handles partial getData failure - request succeeds, response fails", async () => {
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
    responseCompletedEvent,
    domContentLoadedEvent,
    loadEvent,
  ];

  class MockDriverWithPartialFailure extends MockDriverWithBodyData {
    async send(command) {
      if (
        command.method === "network.getData" &&
        command.params.dataType === "response"
      ) {
        return {
          type: "error",
          message: "Response data not available",
        };
      }
      return super.send(command);
    }
  }

  const mockDriver = new MockDriverWithPartialFailure();
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
  expect(harExport.log.entries[0].request.postData).toBeDefined();
  expect(harExport.log.entries[0].request.postData.text).toBe(
    '{"test":"request"}',
  );
  expect(harExport.log.entries[0].response.content.text).toBe("");
});

test("SeleniumBiDiHarRecorder handles partial getData failure - response succeeds, request fails", async () => {
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
    responseCompletedEvent,
    domContentLoadedEvent,
    loadEvent,
  ];

  class MockDriverWithPartialFailure extends MockDriverWithBodyData {
    async send(command) {
      if (
        command.method === "network.getData" &&
        command.params.dataType === "request"
      ) {
        return {
          type: "error",
          message: "Request data not available",
        };
      }
      return super.send(command);
    }
  }

  const mockDriver = new MockDriverWithPartialFailure();
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
  expect(harExport.log.entries[0].request.postData).toBeUndefined();
  expect(harExport.log.entries[0].response.content.text).toBe(
    "<html><body>Test Response</body></html>",
  );
  expect(harExport.log.entries[0].response.content.encoding).toBe("");
});

test("SeleniumBiDiHarRecorder supports maxBodySize parameter", async () => {
  const contextId = "context-1";

  let maxEncodedDataSizeParameter;
  class MockDriverWithMaxEncodedDataSizeCheck extends MockDriverWithBodyData {
    async send(command) {
      if (command.method === "network.addDataCollector") {
        maxEncodedDataSizeParameter = command.params.maxEncodedDataSize;
      }
      return super.send(command);
    }
  }
  const mockDriver = new MockDriverWithMaxEncodedDataSizeCheck();

  const defaultMaxBodySize = 10485760;
  const customMaxBodySize = 12000;

  const recorderWithDefaultMaxBodySize = new adapters.SeleniumBiDiHarRecorder({
    driver: mockDriver,
    browsingContextIds: [contextId],
  });

  await recorderWithDefaultMaxBodySize.startRecording();
  await recorderWithDefaultMaxBodySize.stopRecording();
  expect(maxEncodedDataSizeParameter).toBe(defaultMaxBodySize);

  const recorderWithCustomMaxBodySize = new adapters.SeleniumBiDiHarRecorder({
    driver: mockDriver,
    browsingContextIds: [contextId],
    maxBodySize: customMaxBodySize,
  });

  await recorderWithCustomMaxBodySize.startRecording();
  await recorderWithCustomMaxBodySize.stopRecording();
  expect(maxEncodedDataSizeParameter).toBe(customMaxBodySize);
});
