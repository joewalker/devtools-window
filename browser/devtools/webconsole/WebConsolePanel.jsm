/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const EXPORTED_SYMBOLS = [ "WebConsoleDefinition" ];

const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "WebConsoleUtils",
                                  "resource://gre/modules/devtools/WebConsoleUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "HUDService",
                                  "resource:///modules/HUDService.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "DevTools",
                                  "resource:///modules/devtools/gDevTools.jsm");

const STRINGS_URI = "chrome://browser/locale/devtools/webconsole.properties";
let l10n = new WebConsoleUtils.l10n(STRINGS_URI);

/**
 * The external API allowing us to be registered with DevTools.jsm
 */
const WebConsoleDefinition = {
  id: "webconsole",
  icon: "chrome://browser/skin/devtools/webconsole-tool-icon.png",
  url: "chrome://browser/content/devtools/webconsole.xul",
  label: l10n.getStr("ToolboxWebconsole.label"),
  build: function(iframeWindow, toolbox) {
    return new WebConsolePanel(iframeWindow, toolbox);
  }
};

/**
 * A DevToolPanel that controls the Web Console.
 */
function WebConsolePanel(iframeWindow, toolbox) {
  this._frameWindow = iframeWindow;
  this._toolbox = toolbox;

  if (this.target.type !== DevTools.TargetType.TAB) {
    throw new Error("Unsupported tab type: " + this.target.type);
  }

  let tab = this.target.value;
  let parentDoc = iframeWindow.document.defaultView.parent.document;
  let iframe = parentDoc.querySelector('#toolbox-panel-iframe-webconsole');
  this.hud = HUDService.activateHUDForContext(tab, false, iframe);
}

WebConsolePanel.prototype = {
  get target() this._toolbox.target,

  destroy: function WCTI_destroy()
  {
    let tab = this.target.value;
    HUDService.deactivateHUDForContext(tab, false);
  },
};
