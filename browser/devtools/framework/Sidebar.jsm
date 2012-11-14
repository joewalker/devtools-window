/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes;
const Cu = Components.utils;
const Ci = Components.interfaces;

this.EXPORTED_SYMBOLS = ["ToolSidebar"];

Cu.import("resource:///modules/devtools/EventEmitter.jsm");

const XULNS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

/**
 * ToolSidebar provides methods to register tabs in the sidebar.
 * It's assumed that the sidebar contains a xul:tabbox.
 *
 * @param {Node} tabbox
 *  <tabbox> node;
 * @param {ToolPanel} panel
 *  Related ToolPanel instance;
 * @param {Boolean} showTabstripe
 *  Show the tabs.
 */
this.ToolSidebar = function ToolSidebar(tabbox, panel, showTabstripe=true)
{
  new EventEmitter(this);

  this._tabbox = tabbox;
  this._panelDoc = this._tabbox.ownerDocument;
  this._toolPanel = panel;

  this._tabbox.addEventListener("select", this, true);

  this._tabs = new Map();

  if (!showTabstripe) {
    this._tabbox.setAttribute("hidetabs", "true");
  }
}

ToolSidebar.prototype = {
  /**
   * Register a tab. A tab is a document.
   * The document must have a title, which will be used as the name of the tab.
   *
   * @param {string} tab uniq id
   * @param {string} url
   */
  addTab: function ToolSidebar_addTab(id, url) {
    let iframe = this._panelDoc.createElementNS(XULNS, "iframe");
    iframe.className = "iframe-" + id;
    iframe.setAttribute("flex", "1");
    iframe.setAttribute("src", url);

    let onIFrameLoaded = function() {
      let tab = this._tabbox.tabs.appendItem(iframe.contentDocument.title);
      iframe.removeEventListener("DOMContentLoaded", onIFrameLoaded, true);
      if ("setPanel" in iframe.contentWindow) {
        iframe.contentWindow.setPanel(this._toolPanel, iframe);
      }
      this.emit("new-tab-registered", id);
      this.emit(id + "-ready");
      this._tabs.set(id, tab);
      if (this._tabbox.selectedIndex < 0) {
        this.select(id);
      }
    }.bind(this);

    iframe.addEventListener("DOMContentLoaded", onIFrameLoaded, true);

    let tabpanel = this._panelDoc.createElementNS(XULNS, "tabpanel");
    tabpanel.appendChild(iframe);
    this._tabbox.tabpanels.appendChild(tabpanel);
  },

  /**
   * Select a specific tab.
   */
  select: function ToolSidebar_select(id) {
    if (this._tabs.has(id)) {
      this._tabbox.selectedTab = this._tabs.get(id);
    }
  },

  /**
   * Toggle sidebar's visibility state.
   */
  toggle: function ToolSidebar_toggle() {
    if (this._tabbox.hasAttribute("hidden")) {
      this.show();
    } else {
      this.hide();
    }
  },

  /**
   * Show the sidebar.
   */
  show: function ToolSidebar_show() {
    this._tabbox.removeAttribute("hidden");
  },

  /**
   * Show the sidebar.
   */
  hide: function ToolSidebar_hide() {
    this._tabbox.setAttribute("hidden", "true");
  },

  /**
   * Return the window containing the tab content.
   */
  getWindowForTab: function ToolSidebar_getWindowForTab(id) {
    if (!this._tabs.has(id)) {
      return null;
    }

    let idx = this._tabs.get(id).tabIndex;
    let panel = this._tabbox.tabpanels.childNodes[idx];
    return panel.firstChild.contentWindow;
  },

  /**
   * Event handler.
   */
  handleEvent: function ToolSidebar_eventHandler(event) {
    if (event.type == "select") {
      let newTool;
      let previousTool = this._currentTool;
      for (let [id, tab] of this._tabs) {
        if (tab === this._tabbox.selectedTab) {
          newTool = id;
          break;
        }
      }
      this._currentTool = newTool;
      if (previousTool) {
        this.emit(previousTool + "-unselected");
      }
      this.emit(this._currentTool + "-selected");
    }
  },

  /**
   * Clean-up.
   */
  destroy: function ToolSidebar_destroy() {
    this._tabbox.removeEventListener("select", this, true);

    while (this._tabbox.tabpanels.hasChildNodes()) {
      this._tabbox.tabpanels.removeChild(this._tabbox.tabpanels.firstChild);
    }

    while (this._tabbox.tabs.hasChildNodes()) {
      this._tabbox.tabs.removeChild(this._tabbox.tabs.firstChild);
    }

    this._tabs = null;
    this._tabbox = null;
    this._panelDoc = null;
    this._toolPanel = null;
  },
}
