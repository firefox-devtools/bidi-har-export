/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { HarRecorder } = require('..');

test('HarRecorder throws for invalid constructor arguments', () => {
  expect(() => new HarRecorder()).toThrow();
  expect(() => new HarRecorder({})).toThrow();
  expect(() => new HarRecorder({ browser: "browser" })).toThrow();
  expect(() => new HarRecorder({ version: "version" })).toThrow();
});

test('HarRecorder can be instantiated', () => {
  expect(() => new HarRecorder({ browser: "browser", version: "version" })).not.toThrow();
});

test('HarRecorder throws when startRecording was not called', () => {
  const recorder = new HarRecorder({ browser: "browser", version: "version" });

  const evt = { method: "browsingContext.load", params: {}};
  expect(() => recorder.recordEvent(evt)).toThrow();
  expect(() => recorder.stopRecording()).toThrow();
});

test('HarRecorder returns after startRecording was called', () => {
  const recorder = new HarRecorder({ browser: "browser", version: "version" });

  recorder.startRecording();

  const evt = { method: "browsingContext.load", params: {}};
  expect(() => recorder.recordEvent(evt)).not.toThrow();
  expect(() => recorder.stopRecording()).not.toThrow();
});

test('HarRecorder recordEvent throws for invalid arguments', () => {
  const recorder = new HarRecorder({ browser: "browser", version: "version" });
  recorder.startRecording();

  expect(() => recorder.recordEvent()).toThrow();
  expect(() => recorder.recordEvent({ method: "method" })).toThrow();
  expect(() => recorder.recordEvent({ params: {} })).toThrow();
});

test('HarRecorder throws if startRecording is called twice', () => {
  const recorder = new HarRecorder({ browser: "browser", version: "version" });

  recorder.startRecording();
  expect(() => recorder.startRecording()).toThrow();
});
