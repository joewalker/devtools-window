/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const Cu = Components.utils;

const EXPORTED_SYMBOLS = ["ProfilerDefinition"];

Cu.import("resource:///modules/devtools/ProfilerController.jsm");
Cu.import("resource://gre/modules/devtools/EventEmitter.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "gDevTools",
  "resource:///modules/devtools/gDevTools.jsm");

XPCOMUtils.defineLazyGetter(this, "DebuggerServer", function () {
  Cu.import("resource://gre/modules/devtools/dbg-server.jsm");
  return DebuggerServer;
});

const ProfilerDefinition = {
  id: "jsprofiler",
  killswitch: "devtools.profiler.enabled",
  icon: "chrome://browser/skin/devtools/tools-icons-small.png",
  url: "chrome://browser/content/profiler.xul",
  label: "Profiler", // FIXME: l10n

  isTargetSupported: function (target) {
    switch (target.type) {
      case gDevTools.TargetType.TAB:
        return true;
      case gDevTools.TargetType.REMOTE:
      case gDevTools.TargetType.CHROME:
      default:
        return false;
    }
  },

  build: function (frame, target) {
    return new ProfilerPanel(frame, target);
  }
};

function ProfilerPanel(frame, toolbox) {
  this.isReady = false;
  this.frame = frame;
  this.window = frame.window;
  this.document = frame.document;
  this.target = toolbox.target;
  this.controller = new ProfilerController();

  this._profiles = {};
  this._uid = 0;

  new EventEmitter(this);

  this.controller.connect(function onConnect() {
    this.switchToProfile(this.createProfile());

    let create = this.document.getElementById("profiler-create");
    create.addEventListener("click", this.createProfile.bind(this), false);
    create.removeAttribute("disabled");

    let stop = this.document.getElementById("profiler-stop");
    stop.addEventListener("click", this.onToggle.bind(this), false);

    let start = this.document.getElementById("profiler-start");
    start.addEventListener("click", this.onToggle.bind(this), false);
    start.removeAttribute("disabled");

    this.isReady = true;
    this.emit("ready");
  }.bind(this));
}

ProfilerPanel.prototype = {
  _uid: null,
  _activeUid: null,
  _profiles: null,

  createProfile: function PP_addProfile() {
    let list = this.document.getElementById("profiles-list");
    let item = this.document.createElement("li");
    let wrap = this.document.createElement("h1");

    this._uid += 1;
    this._profiles[this._uid] = null;

    item.setAttribute("id", "profile_" + this._uid);
    item.addEventListener("click", this.switchToProfile.bind(this, this._uid), false);
    wrap.className = "profile-name";
    wrap.textContent = "Profile " + this._uid;

    item.appendChild(wrap);
    list.appendChild(item);

    return this._uid;
  },

  switchToProfile: function PP_switchToProfile(uid) {
    if (this._profiles[uid] === undefined) {
      return false;
    }

    let active = this.document.querySelector("#profiles-list > li.splitview-active");
    if (active) {
      active.className = "";
    }

    let item = this.document.getElementById("profile_" + uid);
    item.className = "splitview-active";

    this._activeUid = uid;
    return true;
  },

  cacheProfileData: function PP_cacheProfileData(data) {
    this._profiles[this._activeUid] = data;
  },

  parseProfileData: function PP_parseProfileData(data) {
    let iframe = this.document.getElementById("profiler-cleo");

    iframe.contentWindow.postMessage(JSON.stringify({
      task: "receiveProfileData",
      rawProfile: data
    }), "*");

    // FIXME: There has to be a better way to emit an event when
    // Cleopatra finishes parsing data.

    let poll = function pollBreadcrumbs() {
      let wait = this.window.setTimeout.bind(null, poll, 100);
      let trail = iframe.contentWindow.gBreadcrumbTrail;

      if (!trail) {
        return wait();
      }

      if (!trail._breadcrumbs || !trail._breadcrumbs.length) {
        return wait();
      }

      this.emit("parsed");
    }.bind(this);

    poll();
  },

  onToggle: function PP_onToggle() {
    let start = this.document.getElementById("profiler-start-wrapper");
    let stop = this.document.getElementById("profiler-stop-wrapper");
    let control = this.document.getElementById("profiler-control");
    let report = this.document.getElementById("profiler-report");
    let iframe = this.document.getElementById("profiler-cleo");

    this.controller.isActive(function (err, isActive) {
      if (err) {
        // FIXME: Error handling.
        Cu.reportError("ProfilerController.isActive: " + err.message);
        return;
      }

      if (isActive) {
        this.controller.stop(function (err, data) {
          if (err) {
            // FIXME: Error handling.
            Cu.reportError("ProfilerController.stop: " + err.message);
            return;
          }

          this.cacheProfileData(data);
          this.parseProfileData(data);

          stop.setAttribute("hidden", true);
          start.removeAttribute("hidden");

          control.setAttribute("hidden", true);
          report.removeAttribute("hidden");

          this.emit("stopped");
        }.bind(this));

        return;
      }

      this.controller.start(function (err) {
        if (err) {
          // FIXME: Error handling.
          Cu.reportError("ProfilerController.start: " + err.message);
          return;
        }

        start.setAttribute("hidden", true);
        stop.removeAttribute("hidden");

        this.emit("started");
      }.bind(this));
    }.bind(this));
  },

  destroy: function PP_destroy() {
    // FIXME: Need an actualt destroy function that closes
    // connections and all that.
    this.emit("destroyed");
  }
};
