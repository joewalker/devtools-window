/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const Cu = Components.utils;

const EXPORTED_SYMBOLS = ["ProfilerDefinition"];

Cu.import("resource:///modules/devtools/ProfilerController.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

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
  this.frame = frame;
  this.window = frame.window;
  this.document = frame.document;
  this.target = toolbox.target;
  this.controller = new ProfilerController();

  this.controller.connect(function onConnect() {
    let toggle = this.document.getElementById("profiler-toggle");
    toggle.addEventListener("click", this.onToggle.bind(this), false);
    toggle.removeAttribute("disabled");
    Services.obs.notifyObservers(null, "jsprofiler-created", null);
  }.bind(this));
}

ProfilerPanel.prototype = {
  destroy: function PP_destroy() {
    Services.obs.notifyObservers(null, "jsprofiler-destroyed", null);
  },

  onToggle: function PP_onToggle() {
    let el = this.document.getElementById("profiler-toggle");
    let iframe = this.document.getElementById("profiler-cleo");

    this.controller.isActive(function (err, isActive) {
      if (err) {
        dump("[LOG] Error on profiler isActive: " + err.message + "\n");
      }

      if (isActive) {
        this.controller.stop(function (err, data) {
          if (err) {
            dump("[LOG] Error on profiler stop: " + err.message + "\n");
            return; // TODO
          }

          iframe.contentWindow.postMessage(JSON.stringify({
            task: "receiveProfileData",
            rawProfile: data
          }), "*");

          el.setAttribute("label", "Start");
        });

        return;
      }

      this.controller.start(function (err) {
        if (err) {
          dump("[LOG] Error on profiler start: " + err.message + "\n");
          return; // TODO
        }

        el.setAttribute("label", "Stop");
      });
    }.bind(this));
  }
};
