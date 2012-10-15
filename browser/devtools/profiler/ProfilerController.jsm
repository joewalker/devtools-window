/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/devtools/dbg-client.jsm");

let EXPORTED_SYMBOLS = ["ProfilerController"];

XPCOMUtils.defineLazyGetter(this, "DebuggerServer", function () {
  Cu.import("resource://gre/modules/devtools/dbg-server.jsm");
  return DebuggerServer;
});

function ProfilerConnection() {
  if (!DebuggerServer.initialized) {
    dump("[LOG] Initializing DebuggerServer\n");
    DebuggerServer.init();
    DebuggerServer.addBrowserActors();
  }

  let transport = DebuggerServer.connectPipe();
  this.client = new DebuggerClient(transport);
}

ProfilerConnection.prototype = {
  actor: null,

  connect: function PCn_connect(aCallback) {
    dump("[LOG] Connecting...\n");
    let client = this.client;

    client.connect(function (aType, aTraits) {
      dump("[LOG] Connected! Listing tabs...\n");
      client.listTabs(function (aResponse) {
        dump("[LOG] Got dem tabs! Actor: " + aResponse.profilerActor + "\n");
        this.actor = aResponse.profilerActor;
        aCallback();
      }.bind(this));
    }.bind(this));
  },

  isActive: function PCn_isActive(aCallback) {
    var message = { to: this.actor, type: "isActive" };
    this.client.request(message, aCallback);
  },

  startProfiler: function PCn_startProfiler(aCallback) {
    var message = {
      to: this.actor,
      type: "startProfiler",
      entries: 1000000,
      interval: 1,
      features: ["js"],
    };
    this.client.request(message, aCallback);
  },

  stopProfiler: function PCn_stopProfiler(aCallback) {
    var message = { to: this.actor, type: "stopProfiler" };
    this.client.request(message, aCallback);
  },

  getProfileData: function PCn_getProfileData(aCallback) {
    var message = { to: this.actor, type: "getProfile" };
    this.client.request(message, aCallback);
  }
};

function ProfilerController() {
  // TODO: Check if profile has already been started (by an addon for example).
  this.profiler = new ProfilerConnection();
  this._connected = false;
}

ProfilerController.prototype = {
  connect: function (aCallback) {
    if (this._connected) {
      aCallback();
    }

    this.profiler.connect(function onConnect() {
      this._connected = true;
      aCallback();
    }.bind(this));
  },

  isActive: function PC_isActive(aCallback) {
    this.profiler.isActive(function onActive(aResponse) {
      aCallback(aResponse.error, aResponse.isActive);
    });
  },

  start: function PC_start(aCallback) {
    this.profiler.startProfiler(function onStart(aResponse) {
      aCallback(aResponse.error);
    });
  },

  stop: function PC_stop(aCallback) {
    this.profiler.getProfileData(function onData(aResponse) {
      let data = aResponse.profile;
      if (aResponse.error) {
        Cu.reportError("Failed to fetch profile data before stopping the profiler.");
      }

      this.profiler.stopProfiler(function onStop(aResponse) {
        aCallback(aResponse.error, data);
      });
    }.bind(this));
  }
};
