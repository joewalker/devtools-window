/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const EXPORTED_SYMBOLS = [ "StyleEditorDefinition" ];

const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource:///modules/devtools/StyleEditorChrome.jsm");

/**
 * The external API allowing us to be registered with DevTools.jsm
 */
const StyleEditorDefinition = {
  id: "styleeditor",
  // FIXME: l10n
  label: "Style Editor",
  url: "chrome://browser/content/styleeditor.xul",
  build: function(iframeWindow, toolbox) {
    let target = toolbox.target;
    if (target.type !== "tab") {
      throw new Error("Unsupported target type: " + target.type);
    }

    iframeWindow.init(target.value.linkedBrowser.contentWindow);
    return iframeWindow;
  }
};
