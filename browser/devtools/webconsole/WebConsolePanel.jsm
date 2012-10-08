/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const EXPORTED_SYMBOLS = [ "WebConsoleDefinition" ];

const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "WebConsoleUtils",
                                  "resource:///modules/WebConsoleUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "HUDService",
                                  "resource:///modules/HUDService.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "DevTools",
                                  "resource:///modules/devtools/gDevTools.jsm");

/**
 * The external API allowing us to be registered with DevTools.jsm
 */
const WebConsoleDefinition = {
  id: "webconsole",
  icon: "chrome://browser/skin/devtools/webconsole-tool-icon.png",
  url: "chrome://browser/content/devtools/webconsole.xul",
  label: WebConsoleUtils.l10n.getStr("ToolboxWebconosle.label"),
  build: function(iframeWindow, target) {
    return new WebConsolePanel(iframeWindow, target);
  }
};

/**
 * A DevToolPanel that controls the Web Console.
 */
function WebConsolePanel(iframeWindow, target) {
  this._frameWindow = iframeWindow;
  this._target = target;

  if (this._target.type !== DevTools.TargetType.TAB) {
    throw new Error("Unsupported tab type: " + this._target.type);
  }

  let tab = this._target.value;
  let parentDoc = iframeWindow.document.defaultView.parent.document;
  let iframe = parentDoc.querySelector('#toolbox-panel-iframe-webconsole');
  this.hud = HUDService.activateHUDForContext(tab, false, iframe);
}

WebConsolePanel.prototype = {
  get target() this._target,

  destroy: function WCTI_destroy()
  {
    let tab = this._target.value;
    HUDService.deactivateHUDForContext(tab, false);
  },
};
