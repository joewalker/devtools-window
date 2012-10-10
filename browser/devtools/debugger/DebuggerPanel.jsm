/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

const EXPORTED_SYMBOLS = ["DebuggerDefinition"];

Cu.import("resource://gre/modules/devtools/EventEmitter.jsm");
Cu.import("resource://gre/modules/devtools/dbg-server.jsm");
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, "gDevTools",
                                  "resource:///modules/devtools/gDevTools.jsm");

const DebuggerDefinition = {
  id: "jsdebugger",
  killswitch: "devtools.debugger.enabled",
  icon: "chrome://browser/skin/devtools/tools-icons-small.png",
  url: "chrome://browser/content/debugger.xul",
  label: "Debugger", // FIXME: l10n 

  isTargetSupported: function(target) {
    switch (target.type) {
      case gDevTools.TargetType.TAB:
        return true;
      case gDevTools.TargetType.REMOTE:
      case gDevTools.TargetType.CHROME:
      default:
        return false;
    }
  },

  build: function(iframeWindow, toolbox) {
    return new DebuggerPanel(iframeWindow, toolbox);
  }
};


function DebuggerPanel(iframeWindow, toolbox) {
  this._toolbox = toolbox;
  this._controller = iframeWindow.DebuggerController;
  this._bkp = this._controller.Breakpoints;

  new EventEmitter(this);

  if (this.target.type == gDevTools.TargetType.TAB) {
    this._ensureOnlyOneRunningDebugger();
    if (!DebuggerServer.initialized) {
      // Always allow connections from nsIPipe transports.
      DebuggerServer.init(function() true);
      DebuggerServer.addBrowserActors();
    }
  } else {
    throw "Unsupported target";
  }
}

DebuggerPanel.prototype = {
  // DevToolPanel API
  get target() {
    return this._toolbox.target;
  },

  destroy: function() {
  },

  // DebuggerPanel API

  addBreakpoint: function() {
    this._bkp.addBreakpoint.apply(this._bkp, arguments);
  },

  removeBreakpoint: function() {
    this._bkp.removeBreakpoint.apply(this._bkp, arguments);
  },

  getBreakpoint: function() {
    this._bkp.getBreakpoint.apply(this._bkp, arguments);
  },

  getAllBreakpoints: function() {
    return this._bkp.store;
  },

  // Private

  _ensureOnlyOneRunningDebugger: function() {
    // FIXME
  },
}
