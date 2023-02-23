/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const HarRecorder = require("../har-recorder");

/**
 * This recording can be used in combination with a selenium node driver and
 * will take care of subscribing to the necessary events when the recording
 * starts.
 */
class SeleniumBiDiHarRecorder {
  /**
   * @constructor
   *
   * @param {Object} options
   * @param {Object} options.driver
   *     The Selenium driver
   * @param {Array<string>} options.browsingContextIds
   *     The array of browsing context ids for which we should monitor network
   *     events.
   */
  constructor(options) {
    const { browsingContextIds, driver } = options;

    this._browsingContextIds = browsingContextIds;
    this._driver = driver;

    this._onMessage = this._onMessage.bind(this);
  }

  /**
   * Start the BiDi HAR recorder.
   */
  async startRecording() {
    const capabilities = await this._driver.getCapabilities();

    this._recorder = new HarRecorder({
      browser: capabilities.get("browserName"),
      version: capabilities.get("browserVersion"),
    });

    this.bidi = await this._driver.getBidi();

    await this.bidi.subscribe(
      "browsingContext.domContentLoaded",
      this._browsingContextIds
    );
    await this.bidi.subscribe("browsingContext.load", this._browsingContextIds);
    await this.bidi.subscribe(
      "network.beforeRequestSent",
      this._browsingContextIds
    );
    await this.bidi.subscribe(
      "network.responseCompleted",
      this._browsingContextIds
    );

    this.ws = await this.bidi.socket;
    this.ws.on("message", this._onMessage);

    this._recorder.startRecording();
  }

  /**
   * Stop the BiDi HAR recorder and return the HAR object
   *
   * @returns {Object}
   *     The HAR export
   */
  async stopRecording() {
    this.ws.off("message", this._onMessage);

    await this.bidi.unsubscribe(
      "browsingContext.domContentLoaded",
      this._browsingContextIds
    );
    await this.bidi.unsubscribe(
      "browsingContext.load",
      this._browsingContextIds
    );
    await this.bidi.unsubscribe(
      "network.beforeRequestSent",
      this._browsingContextIds
    );
    await this.bidi.unsubscribe(
      "network.responseCompleted",
      this._browsingContextIds
    );

    try {
      return this._recorder.stopRecording();
    } catch (e) {
      console.error("Failed to generate HAR recording", e.message);
      return null;
    }
  }

  _onMessage(event) {
    const { method, params } = JSON.parse(Buffer.from(event.toString()));
    if (method && params) {
      this._recorder.recordEvent({ method, params });
    }
  }
}

module.exports = SeleniumBiDiHarRecorder;
