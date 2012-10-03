/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const EXPORTED_SYMBOLS = [ "defaultTools" ];

Components.utils.import("resource:///modules/WebConsolePanel.jsm");

let defaultTools = [
  WebConsoleToolbox.toolSpec,

  {
    id: "styleeditor",
    label: "Style Editor",
    url: "chrome://browser/content/styleeditor.xul",
    build: function(aIFrameWindow, aTarget) {
      aIFrameWindow.init(aTarget.value.linkedBrowser.contentWindow);
      return aIFrameWindow;
    }
  },
  WebConsoleDefinition,
];
