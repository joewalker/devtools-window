/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const Cu = Components.utils;

const EXPORTED_SYMBOLS = ["ProfilerDefinition"];

Cu.import("resource:///modules/devtools/ProfilerController.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "gDevTools",
  "resource:///modules/devtools/gDevTools.jsm");

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
  this.frame = frame;
  this.window = frame.window;
  this.document = frame.document;
  this.target = toolbox.target;

  let toggle = this.document.getElementById("profiler-toggle");
  toggle.addEventListener("click", this.onToggle.bind(this), false);
}

ProfilerPanel.prototype = {
  controller: null,

  destroy: function PP_destroy() {
  },

  onToggle: function PP_onToggle() {
    let el = this.document.getElementById("profiler-toggle");

    if (!this.controller) {
      this.controller = new ProfilerController();
      this.controller.stop();
      this.onToggle();
      return;
    }

    if (this.controller.isRunning) {
      let profileData = this.controller.stop();
      let iframe = this.document.getElementById("profiler-cleo");
      iframe.contentWindow.postMessage(JSON.stringify({
        task: "receiveProfileData",
        rawProfile: profileData
      }), "*");
      el.setAttribute("label", "Start");
      return;
    }

    this.controller.start();
    el.setAttribute("label", "Stop");
  }
};
