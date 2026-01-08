/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { getMockEvents } = require("./resources/mock-events");
const HarRecorder = require("../src/har-recorder");

describe("HarRecorder with body data", () => {
  let harRecorder;
  let startTime;

  beforeEach(() => {
    harRecorder = new HarRecorder({
      browser: "Firefox",
      version: "test-version",
    });
    startTime = Date.now();
  });

  test("Response body with text content", () => {
    const htmlContent = "<!DOCTYPE html><html><body>Test</body></html>";
    const events = getMockEvents(startTime, {
      includeBodyData: true,
      responseBody: {
        type: "string",
        value: htmlContent,
      },
    });

    harRecorder.startRecording();
    harRecorder.recordEvent(events.beforeRequestSentEvent);
    harRecorder.recordEvent(events.responseCompletedEvent);
    harRecorder.recordEvent(events.contextCreatedEvent);
    harRecorder.recordEvent(events.domContentLoadedEvent);
    harRecorder.recordEvent(events.loadEvent);
    const harExport = harRecorder.stopRecording();

    expect(harExport.log.entries).toHaveLength(1);
    expect(harExport.log.entries[0].response.content.text).toBe(htmlContent);
    expect(harExport.log.entries[0].response.content.encoding).toBe("");
  });

  test("Response body with base64 content", () => {
    const base64Image =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==";
    const events = getMockEvents(startTime, {
      includeBodyData: true,
      responseBody: {
        type: "base64",
        value: base64Image,
      },
    });

    harRecorder.startRecording();
    harRecorder.recordEvent(events.beforeRequestSentEvent);
    harRecorder.recordEvent(events.responseCompletedEvent);
    harRecorder.recordEvent(events.contextCreatedEvent);
    harRecorder.recordEvent(events.domContentLoadedEvent);
    harRecorder.recordEvent(events.loadEvent);
    const harExport = harRecorder.stopRecording();

    expect(harExport.log.entries).toHaveLength(1);
    expect(harExport.log.entries[0].response.content.text).toBe(base64Image);
    expect(harExport.log.entries[0].response.content.encoding).toBe("base64");
  });

  test("Request body with JSON content", () => {
    const jsonBody = '{"username":"test","password":"pass123"}';
    const events = getMockEvents(startTime, {
      includeBodyData: true,
      requestBody: {
        type: "string",
        value: jsonBody,
      },
    });

    harRecorder.startRecording();
    harRecorder.recordEvent(events.beforeRequestSentEvent);
    harRecorder.recordEvent(events.responseCompletedEvent);
    harRecorder.recordEvent(events.contextCreatedEvent);
    harRecorder.recordEvent(events.domContentLoadedEvent);
    harRecorder.recordEvent(events.loadEvent);
    const harExport = harRecorder.stopRecording();

    expect(harExport.log.entries).toHaveLength(1);
    expect(harExport.log.entries[0].request.postData).toBeDefined();
    expect(harExport.log.entries[0].request.postData.text).toBe(jsonBody);
    expect(harExport.log.entries[0].request.postData.encoding).toBe("");
    expect(harExport.log.entries[0].request.postData.params).toEqual([]);
  });

  test("Request body with base64 content", () => {
    const base64Data = "SGVsbG8gV29ybGQ=";
    const events = getMockEvents(startTime, {
      includeBodyData: true,
      requestBody: {
        type: "base64",
        value: base64Data,
      },
    });

    harRecorder.startRecording();
    harRecorder.recordEvent(events.beforeRequestSentEvent);
    harRecorder.recordEvent(events.responseCompletedEvent);
    harRecorder.recordEvent(events.contextCreatedEvent);
    harRecorder.recordEvent(events.domContentLoadedEvent);
    harRecorder.recordEvent(events.loadEvent);
    const harExport = harRecorder.stopRecording();

    expect(harExport.log.entries).toHaveLength(1);
    expect(harExport.log.entries[0].request.postData).toBeDefined();
    expect(harExport.log.entries[0].request.postData.text).toBe(base64Data);
    expect(harExport.log.entries[0].request.postData.encoding).toBe("base64");
  });

  test("Both request and response bodies", () => {
    const requestData = '{"query":"test"}';
    const responseData = '{"result":"success"}';
    const events = getMockEvents(startTime, {
      includeBodyData: true,
      requestBody: {
        type: "string",
        value: requestData,
      },
      responseBody: {
        type: "string",
        value: responseData,
      },
    });

    harRecorder.startRecording();
    harRecorder.recordEvent(events.beforeRequestSentEvent);
    harRecorder.recordEvent(events.responseCompletedEvent);
    harRecorder.recordEvent(events.contextCreatedEvent);
    harRecorder.recordEvent(events.domContentLoadedEvent);
    harRecorder.recordEvent(events.loadEvent);
    const harExport = harRecorder.stopRecording();

    expect(harExport.log.entries).toHaveLength(1);
    expect(harExport.log.entries[0].request.postData.text).toBe(requestData);
    expect(harExport.log.entries[0].response.content.text).toBe(responseData);
  });

  test("Backward compatibility - events without _bodyData", () => {
    const events = getMockEvents(startTime);

    harRecorder.startRecording();
    harRecorder.recordEvent(events.beforeRequestSentEvent);
    harRecorder.recordEvent(events.responseCompletedEvent);
    harRecorder.recordEvent(events.contextCreatedEvent);
    harRecorder.recordEvent(events.domContentLoadedEvent);
    harRecorder.recordEvent(events.loadEvent);
    const harExport = harRecorder.stopRecording();

    expect(harExport.log.entries).toHaveLength(1);
    expect(harExport.log.entries[0].response.content.text).toBe("");
    expect(harExport.log.entries[0].response.content.encoding).toBe("");
    expect(harExport.log.entries[0].request.postData).toBeUndefined();
  });

  test("Empty request body should not create postData", () => {
    const events = getMockEvents(startTime, {
      includeBodyData: true,
      requestBody: {
        type: "string",
        value: "",
      },
    });

    harRecorder.startRecording();
    harRecorder.recordEvent(events.beforeRequestSentEvent);
    harRecorder.recordEvent(events.responseCompletedEvent);
    harRecorder.recordEvent(events.contextCreatedEvent);
    harRecorder.recordEvent(events.domContentLoadedEvent);
    harRecorder.recordEvent(events.loadEvent);
    const harExport = harRecorder.stopRecording();

    expect(harExport.log.entries).toHaveLength(1);
    expect(harExport.log.entries[0].request.postData).toBeUndefined();
  });

  test("Null response body should use empty string", () => {
    const events = getMockEvents(startTime, {
      includeBodyData: true,
      requestBody: null,
      responseBody: null,
    });

    harRecorder.startRecording();
    harRecorder.recordEvent(events.beforeRequestSentEvent);
    harRecorder.recordEvent(events.responseCompletedEvent);
    harRecorder.recordEvent(events.contextCreatedEvent);
    harRecorder.recordEvent(events.domContentLoadedEvent);
    harRecorder.recordEvent(events.loadEvent);
    const harExport = harRecorder.stopRecording();

    expect(harExport.log.entries).toHaveLength(1);
    expect(harExport.log.entries[0].response.content.text).toBe("");
    expect(harExport.log.entries[0].response.content.encoding).toBe("");
    expect(harExport.log.entries[0].request.postData).toBeUndefined();
  });
});
