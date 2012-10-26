/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const Cu = Components.utils;
const EXPORTED_SYMBOLS = [ "defaultTools" ];

Cu.import("resource:///modules/WebConsolePanel.jsm");
Cu.import("resource:///modules/devtools/DebuggerPanel.jsm");
Cu.import("resource:///modules/devtools/StyleEditorPanel.jsm");
Cu.import("resource:///modules/devtools/ProfilerPanel.jsm");
Cu.import("resource://gre/modules/Services.jsm");

let defaultTools = [
  StyleEditorDefinition,
  WebConsoleDefinition,
  DebuggerDefinition,
];

if (Services.prefs.getBoolPref("devtools.profiler.enabled")) {
  defaultTools.push(ProfilerDefinition);
}
