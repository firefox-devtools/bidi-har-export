/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const HarRecorder = require("./src/har-recorder.js");

const EventsCollectionExporter = require("./src/adapters/events-collection-exporter.js");
const SeleniumBiDiHarRecorder = require("./src/adapters/selenium-bidi-har-recorder.js");

exports.HarRecorder = HarRecorder;
exports.adapters = {
  EventsCollectionExporter,
  SeleniumBiDiHarRecorder,
};
