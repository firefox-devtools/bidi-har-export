/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const HarRecorder = require("../har-recorder");

const EVENT_ORDER = [
  "network.beforeRequestSent",
  "browsingContext.contextCreated",
  "browsingContext.domContentLoaded",
  "network.responseCompleted",
  "browsingContext.load",
];

/**
 * This HAR exporter is meant to be used by consumers which will rather build
 * a collection of events to be used for HAR generation and don't really follow
 * a start/stop pattern.
 *
 * For instance the bidi-webconsole-prototype always listens for events but will
 * filter down the list depending on a selected context. Piping events directly
 * to a recorder would complicate the generation so this exporter takes a
 * potentially unsorted collection of events and will replay them in sequence
 * for a HarRecorder which will then be able to create a HAR export.
 *
 * The expected events are:
 * - network.beforeRequestSent
 * - network.responseCompleted
 * - browsingContext.contextCreated
 * - browsingContext.domContentLoaded
 * - browsingContext.load
 */
class EventsCollectionExporter {
  /**
   * @constructor
   *
   * @param {Object} options
   * @param {Array<Object>} options.events
   *     The collection of events.
   * @param {string} options.browser
   *     Name of the browser for which we are recording the HAR
   * @param {boolean} options.debugLogs
   *     Should the HarRecorder provide additional logs for debugging.
   * @param {string} options.version
   *     Version of the browser for which we are recording the HAR
   */
  constructor(options) {
    const { browser, debugLogs, events, version } = options;

    this._events = events;
    this._recorder = new HarRecorder({
      browser: browser || "firefox",
      debugLogs,
      version: version || "111.0a1",
    });
  }

  exportAsHar() {
    // Sort the provided events
    this._events = this._events.sort((eventA, eventB) => {
      // By default sort events based on their timestamp property
      if (eventA.params.timestamp !== eventB.params.timestamp) {
        return eventA.params.timestamp - eventB.params.timestamp;
      }

      // If the timestamp is identical, fallback to the expected event order
      return (
        EVENT_ORDER.indexOf(eventA.method) - EVENT_ORDER.indexOf(eventB.method)
      );
    });

    // Replay the events
    this._recorder.startRecording();
    for (const event of this._events) {
      this._recorder.recordEvent(event);
    }

    return this._recorder.stopRecording();
  }
}

module.exports = EventsCollectionExporter;
