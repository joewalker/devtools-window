/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const EXPORTED_SYMBOLS = ["InspectorDefinition"];

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
const properties = "chrome://browser/locale/devtools/inspector.properties";

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyGetter(this, "osString",
  function() Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime).OS);

XPCOMUtils.defineLazyGetter(this, "Strings",
  function() Services.strings.createBundle(properties));

function l10n(aName) Strings.GetStringFromName(aName);

Cu.import("resource://gre/modules/Services.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "InspectorPanel", "resource:///modules/devtools/InspectorPanel.jsm");

const InspectorDefinition = {
  id: "inspector",
  accesskey: l10n("inspector.accesskey"),
  key: l10n("inspector.commandkey"),
  modifiers: osString == "Darwin" ? "accel,alt" : "accel,shift",
  icon: "chrome://browser/skin/devtools/tools-icons-small.png",
  url: "chrome://browser/content/devtools/inspector/inspector.xul",
  label: l10n("inspector.label"),

  isTargetSupported: function(target) {
    switch (target.type) {
      case DevTools.TargetType.TAB:
        return true;
      case DevTools.TargetType.REMOTE:
      case DevTools.TargetType.CHROME:
      default:
        return false;
    }
  },

  build: function(iframeWindow, toolbox) {
    return new InspectorPanel(iframeWindow, toolbox);
  }
};


