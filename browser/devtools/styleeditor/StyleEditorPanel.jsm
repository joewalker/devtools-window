/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cu = Components.utils;
const Ci = Components.interfaces;

this.EXPORTED_SYMBOLS = ["StyleEditorPanel"];

Cu.import("resource:///modules/devtools/EventEmitter.jsm");
Cu.import("resource:///modules/devtools/StyleEditorChrome.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

this.StyleEditorPanel = function StyleEditorPanel(panelWin, toolbox) {
  new EventEmitter(this);

  this._toolbox = toolbox;
  this._target = toolbox.target;

  this._webProgressListener = new WebProgresslistener(this);
  this._target.tab.linkedBrowser.addProgressListener(this._webProgressListener);

  this._panelWin = panelWin;
  this._panelDoc = panelWin.document;

  let contentWin = toolbox.target.tab.linkedBrowser.contentWindow;
  this.setPage(contentWin);

  this.isReady = true;
}

StyleEditorPanel.prototype = {
  /**
   * Target getter.
   */
  get target() {
    return this._target;
  },

  /**
   * Set the page to target.
   */
  setPage: function StyleEditor_setPage(contentWindow) {
    if (this._panelWin.styleEditorChrome) {
      this._panelWin.styleEditorChrome.contentWindow = contentWindow;
    } else {
      let chromeRoot = this._panelDoc.getElementById("style-editor-chrome");
      let chrome = new StyleEditorChrome(chromeRoot, contentWindow);
      this._panelWin.styleEditorChrome = chrome;
    }
    this.selectStyleSheet(null, null, null);
  },

  /**
   * Select a stylesheet.
   */
  selectStyleSheet: function StyleEditor_selectStyleSheet(stylesheet, line, col) {
    this._panelWin.styleEditorChrome.selectStyleSheet(stylesheet, line, col);
  },

  /**
   * Destroy StyleEditor
   */
  destroy: function StyleEditor_destroy() {
    this._target.tab.linkedBrowser.removeProgressListener(this._webProgressListener);
    this._target = null;
    this._toolbox = null;
    this._panelWin = null;
    this._panelDoc = null;
  },
}

function WebProgresslistener(panel) {
  this._panel = panel;
}
WebProgresslistener.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIWebProgressListener, Ci.nsISupportsWeakReference]),
  onProgressChange: function() {},
  onStateChange: function(aProgress, aRequest, aFlag, aStatus) {
    let isStart = aFlag & Ci.nsIWebProgressListener.STATE_START;
    let isDocument = aFlag & Ci.nsIWebProgressListener.STATE_IS_DOCUMENT;
    let isNetwork = aFlag & Ci.nsIWebProgressListener.STATE_IS_NETWORK;
    let isRequest = aFlag & Ci.nsIWebProgressListener.STATE_IS_REQUEST;

    // Skip non-interesting states.
    if (!isStart || !isDocument || !isRequest || !isNetwork) {
      return;
    }

    // Page is being unloaded, let's reset the UI.
    this._panel._panelWin.styleEditorChrome.resetChrome();
  },
  onSecurityChange: function() {},
  onStatusChange: function() {},
  onLocationChange: function(webProgress){
    // New page is available.
    let window = webProgress.DOMWindow;
    this._panel.setPage(window);
  },
}
