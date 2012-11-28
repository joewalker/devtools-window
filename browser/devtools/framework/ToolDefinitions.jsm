/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

this.EXPORTED_SYMBOLS = [ "defaultTools" ];

Components.utils.import("resource:///modules/WebConsolePanel.jsm");
Components.utils.import("resource:///modules/devtools/StyleEditorDefinition.jsm");
Components.utils.import("resource:///modules/devtools/InspectorDefinition.jsm");
const debuggerProps = "chrome://browser/locale/devtools/debugger.properties";
XPCOMUtils.defineLazyModuleGetter(this, "DebuggerPanel",
  "resource:///modules/devtools/DebuggerPanel.jsm");

XPCOMUtils.defineLazyGetter(this, "debuggerStrings",
  function() Services.strings.createBundle(debuggerProps));

let debuggerDefinition = {
  id: "jsdebugger",
  key: l10n("open.commandkey", debuggerStrings),
  accesskey: l10n("debuggerMenu.accesskey", debuggerStrings),
  modifiers: osString == "Darwin" ? "accel,alt" : "accel,shift",
  ordinal: 1,
  killswitch: "devtools.debugger.enabled",
  icon: "chrome://browser/skin/devtools/tools-icons-small.png",
  url: "chrome://browser/content/debugger.xul",
  label: l10n("ToolboxDebugger.label", debuggerStrings),

  isTargetSupported: function(target) {
    return true;
  },

  build: function(iframeWindow, toolbox) {
    return new DebuggerPanel(iframeWindow, toolbox);
  }
};


this.defaultTools = [
  StyleEditorDefinition,
  WebConsoleDefinition,
  InspectorDefinition,
  debuggerDefinition,
];
