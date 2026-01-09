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
   * @param {object} options
   * @param {Array<string>} options.browsingContextIds
   *     The array of browsing context ids for which we should monitor network
   *     events.
   * @param {boolean} options.debugLogs
   *     Should the HarRecorder provide additional logs for debugging.
   * @param {object} options.driver
   *     The Selenium driver
   * @param {Function} [options.headerValueFormatter]
   *     An optional formatter function to use to format the header value.
   *     The function should take the header name and value, and return the formatted value.
   *     If not provided, the original header value will be used.
   * @param {number} [options.maxBodySize=10485760]
   *     Maximum size in bytes for request/response body data collection.
   *     Defaults to 10MB (10485760 bytes).
   */
  constructor(options) {
    const {
      browsingContextIds,
      debugLogs,
      driver,
      headerValueFormatter,
      maxBodySize = 10485760,
    } = options;

    this._browsingContextIds = browsingContextIds;
    this._debugLogs = debugLogs || false;
    this._driver = driver;
    this._headerValueFormatter = headerValueFormatter;
    this._maxBodySize = maxBodySize;
    this._dataCollectorActive = false;
    this._dataCollectorId = null;

    this._onMessage = this._onMessage.bind(this);
  }

  /**
   * Start the BiDi HAR recorder.
   */
  async startRecording() {
    const capabilities = await this._driver.getCapabilities();

    this._recorder = new HarRecorder({
      browser: capabilities.get("browserName"),
      debugLogs: this._debugLogs,
      version: capabilities.get("browserVersion"),
      headerValueFormatter: this._headerValueFormatter,
    });

    this.bidi = await this._driver.getBidi();

    try {
      const response = await this.bidi.send({
        method: "network.addDataCollector",
        params: {
          contexts: this._browsingContextIds,
          dataTypes: ["request", "response"],
          maxEncodedDataSize: this._maxBodySize,
        },
      });

      if (this._isBiDiError(response)) {
        throw new Error(response.message || "Failed to add data collector");
      }

      this._dataCollectorId = response.result?.collector;
      if (!this._dataCollectorId) {
        throw new Error("No data collector ID returned");
      }

      this._dataCollectorActive = true;
      this._logMessage(`Data collector activated: ${this._dataCollectorId}`);
    } catch (e) {
      this._logMessage(
        `Failed to activate data collector, body content will not be available: ${e.message}`,
        "warn",
      );
      this._dataCollectorActive = false;
      this._dataCollectorId = null;
    }

    await this.bidi.subscribe(
      "browsingContext.contextCreated",
      this._browsingContextIds,
    );
    await this.bidi.subscribe(
      "browsingContext.domContentLoaded",
      this._browsingContextIds,
    );
    await this.bidi.subscribe("browsingContext.load", this._browsingContextIds);
    await this.bidi.subscribe(
      "network.beforeRequestSent",
      this._browsingContextIds,
    );
    await this.bidi.subscribe(
      "network.responseCompleted",
      this._browsingContextIds,
    );

    this.ws = await this.bidi.socket;
    this.ws.on("message", this._onMessage);

    const initialPageUrl = await this._getPageUrl();
    this._recorder.startRecording(initialPageUrl);
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
      "browsingContext.contextCreated",
      this._browsingContextIds,
    );
    await this.bidi.unsubscribe(
      "browsingContext.domContentLoaded",
      this._browsingContextIds,
    );
    await this.bidi.unsubscribe(
      "browsingContext.load",
      this._browsingContextIds,
    );
    await this.bidi.unsubscribe(
      "network.beforeRequestSent",
      this._browsingContextIds,
    );
    await this.bidi.unsubscribe(
      "network.responseCompleted",
      this._browsingContextIds,
    );

    if (this._dataCollectorActive && this._dataCollectorId) {
      try {
        const response = await this.bidi.send({
          method: "network.removeDataCollector",
          params: {
            collector: this._dataCollectorId,
          },
        });

        if (this._isBiDiError(response)) {
          throw new Error(
            response.message || "Failed to remove data collector",
          );
        }

        this._logMessage(
          `Data collector deactivated: ${this._dataCollectorId}`,
        );
      } catch (e) {
        this._logMessage(
          `Failed to deactivate data collector: ${e.message}`,
          "warn",
        );
      }
      this._dataCollectorActive = false;
      this._dataCollectorId = null;
    }

    const lastPageUrl = await this._getPageUrl();
    try {
      return this._recorder.stopRecording(lastPageUrl);
    } catch (e) {
      console.error("Failed to generate HAR recording", e.message);
      return null;
    }
  }

  /**
   * Fetch body data for a given request using network.getData
   *
   * @param {string} requestId
   *     The BiDi request ID
   * @returns {Promise<Object|null>}
   *     Body data object or null if unavailable
   * @private
   */
  async _fetchBodyData(requestId) {
    try {
      const [requestResponse, responseResponse] = await Promise.all([
        this.bidi.send({
          method: "network.getData",
          params: {
            request: requestId,
            dataType: "request",
          },
        }),
        this.bidi.send({
          method: "network.getData",
          params: {
            request: requestId,
            dataType: "response",
          },
        }),
      ]);

      if (this._isBiDiError(requestResponse)) {
        this._logMessage(
          `network.getData for request body failed (${requestId}): ${requestResponse.message || "unknown error"}`,
        );
      }

      if (this._isBiDiError(responseResponse)) {
        this._logMessage(
          `network.getData for response body failed (${requestId}): ${responseResponse.message || "unknown error"}`,
        );
      }

      if (
        this._isBiDiError(requestResponse) &&
        this._isBiDiError(responseResponse)
      ) {
        return null;
      }

      return {
        requestBody: this._isBiDiError(requestResponse)
          ? null
          : requestResponse.result?.bytes,
        responseBody: this._isBiDiError(responseResponse)
          ? null
          : responseResponse.result?.bytes,
      };
    } catch (e) {
      this._logMessage(`network.getData failed for ${requestId}: ${e.message}`);
      return null;
    }
  }

  async _getPageUrl() {
    let pageUrl;
    if (this._browsingContextIds.length === 1) {
      try {
        const browsingContextId = this._browsingContextIds[0];
        const params = {
          method: "browsingContext.getTree",
          params: {
            root: browsingContextId,
          },
        };

        const response = await this.bidi.send(params);
        pageUrl = response.result.contexts[0].url;
      } catch (e) {
        // Could not fetch page url.
      }
    }

    return pageUrl;
  }

  /**
   * Check if a BiDi response contains an error
   *
   * @param {Object} response
   *     BiDi command response
   * @returns {boolean}
   *     true if response is an error
   * @private
   */
  _isBiDiError(response) {
    return response && response.type === "error";
  }

  /**
   * Print a message to the console with the provided console method.
   *
   * For "log" level messages, they will only be actually logged if debugLogs
   * are enabled.
   *
   * @param {string} message
   *     The message to log.
   * @param {string=} consoleMethod
   *     The name of the console method to use (defaults to "log").
   */
  _logMessage(message, consoleMethod = "log") {
    if (consoleMethod == "log" && !this._debugLogs) {
      return;
    }

    console[consoleMethod](`[SeleniumBiDiHarRecorder] ${message}`);
  }

  async _onMessage(event) {
    const { method, params } = JSON.parse(Buffer.from(event.toString()));

    if (!method || !params) {
      return;
    }

    if (method === "network.responseCompleted" && this._dataCollectorActive) {
      const requestId = params.request.request;
      const bodyData = await this._fetchBodyData(requestId);

      if (bodyData) {
        params._bodyData = bodyData;
      }
    }

    this._recorder.recordEvent({ method, params });
  }
}

module.exports = SeleniumBiDiHarRecorder;
