/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const EXPORTED_SYMBOLS = [ "WebConsoleToolbox" ];

const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "WebConsoleUtils",
                                  "resource:///modules/WebConsoleUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "HUDService",
                                  "resource:///modules/HUDService.jsm");
let console = (function() {
  let tempScope = {};
  Components.utils.import("resource://gre/modules/devtools/Console.jsm", tempScope);
  return tempScope.console;
})();

XPCOMUtils.defineLazyGetter(this, "l10n", function() {
  return WebConsoleUtils.l10n;
});

Cu.import("resource:///modules/devtools/EventEmitter.jsm");

/**
 * The external API allowing us to be registered with DevTools.jsm
 */
const WebConsoleToolbox = {
  toolSpec: {
    id: "webconsole",
    killswitch: "devtools.webconsole.enabled", // doesn't currently exist
    icon: "chrome://browser/skin/devtools/webconsole-tool-icon.png",
    url: "chrome://browser/content/devtools/webconsole.xul",
    label: l10n.getStr("ToolboxWebconosle.label"),
    build: function(aIFrameWindow, aTarget) {
      return new WebConsoleToolInstance(aIFrameWindow, aTarget);
    }
  }
};

/**
 * A DevToolInstance that controls the Web Console.
 */
function WebConsoleToolInstance(aIFrameWindow, aTarget) {
  this._frameWindow = aIFrameWindow;
  this._target = aTarget;

  if (this._target.type !== "tab") {
    throw new Error("Unsupported tab type: " + this._target.type);
  }

  let tab = this._target.value;
  let parentDoc = aIFrameWindow.document.defaultView.parent.document;
  let iframe = parentDoc.querySelector('#toolbox-panel-iframe-webconsole');
  this.hud = HUDService.activateHUDForContext(tab, false, iframe);
}

WebConsoleToolInstance.prototype = {
  get target() this._target,

  destroy: function WCTI_destroy()
  {
    let tab = this._target.value;
    HUDService.deactivateHUDForContext(tab, false);
  },
};
