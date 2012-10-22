/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/devtools/EventEmitter.jsm");

const EXPORTED_SYMBOLS = [ "Hosts" ];

let Hosts = {
  "bottom": BottomHost,
  "side": SidebarHost,
  "window": WindowHost
}

/**
 * Host object for the dock on the bottom of the browser
 */
function BottomHost(hostTab) {
  this.hostTab = hostTab;

  new EventEmitter(this);
}

BottomHost.prototype = {
  type: "bottom",

  heightPref: "devtools.toolbox.footer.height",

  /**
   * Create a box at the bottom of the host tab and call a callback with
   * The iframe to populate the toolbox in.
   *
   * @param {function} callback
   *        Callback called when the UI has been created, the iframe
   *        is the first argument to the callback.
   */
  createUI: function BH_createUI(callback) {
    let gBrowser = this.hostTab.ownerDocument.defaultView.gBrowser;
    let ownerDocument = gBrowser.ownerDocument;

    this._splitter = ownerDocument.createElement("splitter");
    this._splitter.setAttribute("class", "devtools-horizontal-splitter");

    this.frame = ownerDocument.createElement("iframe");
    this.frame.id = "devtools-toolbox-bottom-iframe";
    this.frame.height = Services.prefs.getIntPref(this.heightPref);

    this._nbox = gBrowser.getNotificationBox(this.hostTab.linkedBrowser);
    this._nbox.appendChild(this._splitter);
    this._nbox.appendChild(this.frame);

    loadFrame(this.frame, callback);

    focusTab(this.hostTab);
  },

  /**
   * Destroy the bottom dock
   */
  destroyUI: function BH_destroyUI() {
    Services.prefs.setIntPref(this.heightPref, this.frame.height);

    this._nbox.removeChild(this._splitter);
    this._nbox.removeChild(this.frame);
  }
}


/**
 * Host object for the in-browser sidebar
 */
function SidebarHost(hostTab) {
  this.hostTab = hostTab;

  new EventEmitter(this);
}

SidebarHost.prototype = {
  type: "side",

  widthPref: "devtools.toolbox.sidebar.width",

  /**
   * Create a box in the sidebar of the host tab and call a callback with
   * The iframe to populate the toolbox in.
   *
   * @param {function} callback
   *        Callback called when the UI has been created, the iframe
   *        is the first argument to the callback.
   */
  createUI: function RH_createUI(callback) {
    let gBrowser = this.hostTab.ownerDocument.defaultView.gBrowser;
    let ownerDocument = gBrowser.ownerDocument;

    this._splitter = ownerDocument.createElement("splitter");
    this._splitter.setAttribute("class", "devtools-side-splitter");

    this.frame = ownerDocument.createElement("iframe");
    this.frame.id = "devtools-toolbox-side-iframe";
    this.frame.width = Services.prefs.getIntPref(this.widthPref);

    this._sidebar = gBrowser.getSidebarContainer(this.hostTab.linkedBrowser);
    this._sidebar.appendChild(this._splitter);
    this._sidebar.appendChild(this.frame);

    loadFrame(this.frame, callback);

    focusTab(this.hostTab);
  },

  /**
   * Destroy the sidebar
   */
  destroyUI: function RH_destroyUI() {
    Services.prefs.setIntPref(this.widthPref, this.frame.width);

    this._sidebar.removeChild(this._splitter);
    this._sidebar.removeChild(this.frame);
  }
}

/**
 * Host object for the toolbox in a separate window
 */
function WindowHost() {
  this._boundUnload = this._boundUnload.bind(this);

  new EventEmitter(this);
}

WindowHost.prototype = {
  type: "window",

  WINDOW_URL: "chrome://browser/content/devtools/framework/toolbox-window.xul",

  /**
   * Create a new xul window and call a callback with the iframe to
   * populate the toolbox in.
   *
   * @param {function} callback
   *        Callback called when the UI has been created, the iframe
   *        is the first argument to the callback.
   */
  createUI: function WH_createUI(callback) {
    let flags = "chrome,centerscreen,resizable,dialog=no";
    let win = Services.ww.openWindow(null, this.WINDOW_URL, "_blank",
                                     flags, null);

    let boundLoad = function(event) {
      win.removeEventListener("load", boundLoad, true);
      this.frame = win.document.getElementById("toolbox-iframe");
      callback(this.frame);
    }.bind(this);
    win.addEventListener("load", boundLoad, true);
    win.addEventListener("unload", this._boundUnload);

    win.focus();

    this._window = win;
  },

  /**
   * Catch the user closing the window.
   */
  _boundUnload: function(event) {
    if (event.target.location != this.WINDOW_URL) {
      return;
    }
    this._window.removeEventListener("unload", this._boundUnload);

    this.emit("window-closed");
  },

  /**
   * Destroy the window
   */
  destroyUI: function WH_destroyUI() {
    this._window.removeEventListener("unload", this._boundUnload);
    this._window.close();
  }
}


/**
 * Load initial blank page into iframe and call callback when loaded
 */
function loadFrame(frame, callback) {
  frame.addEventListener("DOMContentLoaded", function onLoad() {
    frame.removeEventListener("DOMContentLoaded", onLoad, true);
    callback(frame);
  }, true);

  frame.setAttribute("src", "about:blank");
}

/**
 *  Switch to the given tab in a browser and focus the browser window
 */
function focusTab(tab) {
  let browserWindow = tab.ownerDocument.defaultView;
  browserWindow.focus();
  browserWindow.gBrowser.selectedTab = tab;
}
