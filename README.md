# bidi-har-export

Experimental module to compile WebDriver BiDi network events as a HAR file

## how to use

```
const { HarRecorder } = require("bidi-har-export");

const harRecorder = new HarRecorder({ browser: "firefox", version: "111.0a1"});
harRecorder.startRecording();
// Forward network and browser context events to the recorder
harRecorder.recordEvent(evt);
const harRecord = harRecorder.stopRecording();
```
