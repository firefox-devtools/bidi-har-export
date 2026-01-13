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
      if (command.params.collector !== "test-collector-id-123") {
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

test("SeleniumBiDiHarRecorder skips getData for redirect responses", async () => {
  const contextId = "context-1";
  const startTime = Date.now();
  const { beforeRequestSentEvent, domContentLoadedEvent, loadEvent } =
    getMockEvents(startTime, { contextId });

  // Create a redirect response (status 301)
  const redirectResponseEvent = {
    method: "network.responseCompleted",
    params: {
      context: contextId,
      redirectCount: 0,
      request: beforeRequestSentEvent.params.request,
      response: {
        ...beforeRequestSentEvent.params.request,
        status: 301,
        statusText: "Moved Permanently",
        headers: [],
        mimeType: "text/html",
        bytesReceived: 0,
        content: { size: 0 },
      },
    },
  };

  const events = [
    beforeRequestSentEvent,
    redirectResponseEvent,
    domContentLoadedEvent,
    loadEvent,
  ];

  let getDataCallCount = 0;
  class MockDriverWithGetDataCounter extends MockDriverWithBodyData {
    async send(command) {
      if (command.method === "network.getData") {
        getDataCallCount++;
      }
      return super.send(command);
    }
  }

  const mockDriver = new MockDriverWithGetDataCounter();
  const recorder = new adapters.SeleniumBiDiHarRecorder({
    driver: mockDriver,
    browsingContextIds: [contextId],
    debugLogs: true,
  });

  await recorder.startRecording();

  for (const event of events) {
    await mockDriver._mockEmitEvent(event);
  }

  await recorder.stopRecording();

  // getData should NOT be called for redirect responses
  expect(getDataCallCount).toBe(0);
});

test("SeleniumBiDiHarRecorder handles getData timeout gracefully", async () => {
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

  // Create a promise that never resolves to simulate hanging getData
  const hangingPromise = new Promise(() => {});

  class MockDriverWithSlowGetData extends MockDriverWithBodyData {
    async send(command) {
      if (command.method === "network.getData") {
        // Simulate a getData that hangs and will timeout
        await hangingPromise;
      }
      return super.send(command);
    }
  }

  const mockDriver = new MockDriverWithSlowGetData();
  const recorder = new adapters.SeleniumBiDiHarRecorder({
    driver: mockDriver,
    browsingContextIds: [contextId],
    getDataTimeout: 100, // Short timeout for test
  });

  await recorder.startRecording();

  for (const event of events) {
    await mockDriver._mockEmitEvent(event);
  }

  const harExport = await recorder.stopRecording();

  // Recording should complete even though getData timed out
  expect(harExport.log.entries).toHaveLength(1);
  // Body data should not be present due to timeout
  expect(harExport.log.entries[0].response.content.text).toBe("");
  expect(harExport.log.entries[0].request.postData).toBeUndefined();
});

test("SeleniumBiDiHarRecorder respects maxConcurrentGetData limit", async () => {
  const contextId = "context-1";
  const startTime = Date.now();

  // Create multiple request/response pairs
  const events = [];
  for (let i = 0; i < 5; i++) {
    const mockEvents = getMockEvents(startTime + i * 100, {
      contextId,
      url: `https://example.com/request${i}`,
    });
    events.push(mockEvents.beforeRequestSentEvent);
    events.push(mockEvents.responseCompletedEvent);
  }

  let maxConcurrentGetDataCalls = 0;
  let activeGetDataCalls = 0;

  class MockDriverWithConcurrencyTracking extends MockDriverWithBodyData {
    async send(command) {
      if (command.method === "network.getData") {
        activeGetDataCalls++;
        maxConcurrentGetDataCalls = Math.max(
          maxConcurrentGetDataCalls,
          activeGetDataCalls,
        );

        // Add a delay to allow concurrent calls to accumulate
        await new Promise((resolve) => setTimeout(resolve, 50));

        activeGetDataCalls--;
      }
      return super.send(command);
    }
  }

  const mockDriver = new MockDriverWithConcurrencyTracking();
  const recorder = new adapters.SeleniumBiDiHarRecorder({
    driver: mockDriver,
    browsingContextIds: [contextId],
    maxConcurrentGetData: 2,
  });

  await recorder.startRecording();

  for (const event of events) {
    await mockDriver._mockEmitEvent(event);
  }

  await recorder.stopRecording();

  // maxConcurrentGetData=2 means at most 2 _fetchBodyData tasks in the queue
  // Each _fetchBodyData makes 2 parallel getData calls (request + response)
  // So we can see up to 4 concurrent getData calls (2 tasks * 2 calls each)
  expect(maxConcurrentGetDataCalls).toBeLessThanOrEqual(4);
  expect(maxConcurrentGetDataCalls).toBeGreaterThan(0);
});

test("SeleniumBiDiHarRecorder waits for pending getData before stopping", async () => {
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

  let getDataResolved = false;
  class MockDriverWithDelayedGetData extends MockDriverWithBodyData {
    async send(command) {
      if (command.method === "network.getData") {
        // Simulate slow getData
        await new Promise((resolve) => setTimeout(resolve, 100));
        getDataResolved = true;
        return super.send(command);
      }
      return super.send(command);
    }
  }

  const mockDriver = new MockDriverWithDelayedGetData();
  const recorder = new adapters.SeleniumBiDiHarRecorder({
    driver: mockDriver,
    browsingContextIds: [contextId],
  });

  await recorder.startRecording();

  for (const event of events) {
    await mockDriver._mockEmitEvent(event);
  }

  // stopRecording should wait for getData to complete
  const harExport = await recorder.stopRecording();

  // getData should have completed
  expect(getDataResolved).toBe(true);
  // Body data should be present
  expect(harExport.log.entries).toHaveLength(1);
  expect(harExport.log.entries[0].response.content.text).toBe(
    "<html><body>Test Response</body></html>",
  );
});

test("SeleniumBiDiHarRecorder skips body data collection when skipBodyData is true", async () => {
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

  const commandCalls = [];

  class MockDriverWithCommandTracking extends MockDriverWithBodyData {
    async send(command) {
      commandCalls.push(command.method);
      return super.send(command);
    }
  }

  const mockDriver = new MockDriverWithCommandTracking();
  const recorder = new adapters.SeleniumBiDiHarRecorder({
    driver: mockDriver,
    browsingContextIds: [contextId],
    skipBodyData: true,
  });

  await recorder.startRecording();

  for (const event of events) {
    await mockDriver._mockEmitEvent(event);
  }

  const harExport = await recorder.stopRecording();

  // addDataCollector should NOT have been called
  expect(commandCalls).not.toContain("network.addDataCollector");
  // getData should NOT have been called
  expect(commandCalls).not.toContain("network.getData");
  // removeDataCollector should NOT have been called
  expect(commandCalls).not.toContain("network.removeDataCollector");

  // HAR export should still work
  expect(harExport.log.entries).toHaveLength(1);
  // But body data should not be present
  expect(harExport.log.entries[0].response.content.text).toBe("");
  expect(harExport.log.entries[0].request.postData).toBeUndefined();
});
