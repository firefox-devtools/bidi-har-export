/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

class MockDriver {
  constructor() {
    this._subscribedEvents = {};
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

  async send(command) {
    if (command.method.startsWith("network.")) {
      return {
        type: "error",
        message: "unknown command",
      };
    }
    throw new Error("MockDriver does not support send(): " + command.method);
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

exports.MockDriver = MockDriver;
