# bidi-har-export

Experimental module to compile WebDriver BiDi network events as a HAR file. The WebDriver BiDi network events are currently only available in Firefox 110 or newer.

## Examples

### HarRecorder

`HarRecorder` is a base class for recording HAR. The consumer is responsible for indicating the beginning and end of the recording by using the `startRecording` and `stopRecording` methods. During the recording the consumer should forward all the relevant BiDi events to the recorder. The useful events for HAR generation are:
- network.beforeRequestSent

- network.responseCompleted
- browsingContext.domContentLoaded
- browsingContext.load

The recorder will not handle subscribing or unsubscribing to those events. For selenium users, the `SeleniumBiDiHarRecorder` can be used to facilitate the process.

```javascript
const { HarRecorder } = require("bidi-har-export");

const harRecorder = new HarRecorder({ browser: "firefox", version: "111.0a1"});

// It is mandatory to call startRecording before forwarding any event to the
// recorder.
harRecorder.startRecording();

// Forward network and browser context events to the recorder.
// The recorder expects events as objects containing a "method"
// and a "params" property.
harRecorder.recordEvent(beforeRequestSentEvent);
harRecorder.recordEvent(domContentLoadedEvent);
harRecorder.recordEvent(loadEvent);
harRecorder.recordEvent(responseCompletedEvent);

// To complete the recording and generate the HAR record,
// call stopRecording().
const harRecord = harRecorder.stopRecording();

// `harRecord` is an object following the HAR specification at
// https://w3c.github.io/web-performance/specs/HAR/Overview.html
// It is an object with a single property at the root called `log`
// See the specification for more details.
```

### SeleniumBiDiHarRecorder

The `SeleniumBiDiHarRecorder` can be used with a selenium node driver in order to facilitate a recording. This recorder will take care of subscribing and unsubscribing to the necessary event, so that the consumer only has to start and stop the recording.

This recorder is available under the `adapters` namespace.

```javascript
const fs = require('fs');
const { BrowsingContext, Builder }  = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const { adapters } = require('bidi-har-export');

const driver = await new Builder()
  .forBrowser('firefox')
  .setFirefoxOptions(new firefox.Options().enableBidi())
  .build();

const id = await driver.getWindowHandle();
const browsingContext = await BrowsingContext(driver, { browsingContextId: id });

// The SeleniumBiDiHarRecorder expects a selenium driver object as well as an
// array of browsing context ids which will be used to know which browsing
// contexts should be monitored.
const harRecorder = new adapters.SeleniumBiDiHarRecorder({
  driver,
  browsingContextIds: [id],
});

// Start the recording, perform some navigations (just as an example) and stop
// the recording.
await harRecorder.startRecording();
await browsingContext.navigate('https://example.com', 'complete');
await browsingContext.navigate('https://wikipedia.org', 'complete');
const harExport = await harRecorder.stopRecording();

// Save the HAR data to a .har file
const harData = JSON.stringify(harExport, null, "  ");
const filename = `http_archive_${new Date().toISOString()}`;
fs.writeFileSync(`./your-har-export.har`, harData);
```

### EventsCollectionExporter

The `EventsCollectionExporter` can be useful if you are assembling and filtering BiDi events regardless of performing a HAR recording, but you still want to generate a HAR record after the fact. This exporter expects an array of events to be passed to its constructor. The exporter will take attempt to replay those events in chronological order to generate the same HAR export as if they had been recorded live by a base recorder.

This exporter is available under the `adapters` namespace.

```javascript
const { adapters } = require('bidi-har-export');

// Here `bidiEvents` should be an array of network.beforeRequestSent,
// network.responseCompleted, browsingContext.domContentLoaded and
// browsingContext.load events. The array does not have to be in chronological
// order, the exporter will attempt to sort the events based on the timestamp
// included in each event.
const exporter = new adapters.EventsCollectionExporter({
  browser: "Firefox",
  events: bidiEvents,
  version: "111.0a1",
});
const harExport = exporter.exportAsHar();
```
