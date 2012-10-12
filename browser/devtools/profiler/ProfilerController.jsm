/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

let EXPORTED_SYMBOLS = ["ProfilerController"];

function ProfilerController() {
  try {
    // TODO: Check if profile has already been started (by an addon for example)
    // and warn about that.
    this.profiler = Cc["@mozilla.org/tools/profiler;1"].getService(Ci.nsIProfiler);
  } catch (err) {
    Cu.reportError("Error initializing ProfilerController: " + err);
  }
}

ProfilerController.prototype = {
  get isRunning() {
    return this.profiler.IsActive();
  },

  start: function PC_start() {
    // Also available: gc, stackwalk, jank, adb, copyProfileOnStop
    let features = ["js"];

    this.entries = 1000000;
    this.interval = 1;

    this.profiler.StartProfiler(this.entries, this.interval, features, features.length);
  },

  stop: function PC_stop() {
    this.profileData = this.profiler.getProfileData();
    this.profiler.StopProfiler();

    return this.profileData;
  }
};
