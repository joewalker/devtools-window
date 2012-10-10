/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

const EXPORTED_SYMBOLS = ["StyleEditorDefinition"];

const STRINGS_URI = "chrome://browser/locale/devtools/styleeditor.properties";

Cu.import("resource://gre/modules/devtools/EventEmitter.jsm");
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/Services.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "gDevTools", "resource:///modules/devtools/gDevTools.jsm");

XPCOMUtils.defineLazyGetter(this, "_strings", function() Services.strings
  .createBundle(STRINGS_URI));

const StyleEditorDefinition = {
  id: "styleeditor",
  label: l10n("ToolboxStyleEditor.label"),
  url: "chrome://browser/content/styleeditor.xul",

  build: function(aIFrameWindow, aTarget) {
    aIFrameWindow.init(aTarget.value.linkedBrowser.contentWindow);
    return aIFrameWindow;
  }
};

/**
 * Lookup l10n string from a string bundle.
 * @param {string} aName The key to lookup.
 * @returns A localized version of the given key.
 */
function l10n(aName)
{
  try {
    return _strings.GetStringFromName(aName);
  } catch (ex) {
    Services.console.logStringMessage("Error reading '" + aName + "'");
    throw new Error("l10n error with " + aName);
  }
}
