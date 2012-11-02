/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const EXPORTED_SYMBOLS = [ "gDevTools", "DevTools" ];

const Cu = Components.utils;
const Ci = Components.interfaces;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/devtools/EventEmitter.jsm");
Cu.import("resource:///modules/devtools/ToolDefinitions.jsm");
Cu.import("resource:///modules/devtools/Toolbox.jsm");

/**
 * DevTools is a class that represents a set of developer tools. Each
 * instance of the DevTools class holds a set of tools and keeps track
 * of open toolboxes in the browser.
 */
function DevTools() {
  this._tools = new Map();
  this._toolboxes = new Map();

  this._newWindowObserver = this._newWindowObserver.bind(this);

  Services.obs.addObserver(this._newWindowObserver,
    "xul-window-registered", false);

  new EventEmitter(this);
}

/**
 * Each toolbox has a |target| that indicates what is being debugged/inspected.
 * A target is an object with this shape:
 * {
 *   type: DevTools.TargetType.[TAB|REMOTE|CHROME],
 *   value: ...
 * }
 *
 * When type = TAB, then 'value' contains a XUL Tab
 * When type = REMOTE, then 'value' contains an object with host and port
 *   properties, for example:
 *   { type: TargetType.TAB, value: { host: 'localhost', port: 4325 } }
 * When type = CHROME, then 'value' contains a XUL window
 */
DevTools.TargetType = {
  TAB: "tab",
  REMOTE: "remote",
  CHROME: "chrome"
};

/**
 * The developer tools can be 'hosted' either embedded in a browser window, or
 * in a separate tab. Other hosts may be possible here, like a separate XUL
 * window.
 *
 * A Toolbox host is an object with this shape:
 * {
 *   type: DevTools.HostType.[BOTTOM|TAB],
 *   element: ...
 * }
 *
 * Definition of the 'element' property is left as an exercise to the
 * implementor.
 */
DevTools.HostType = {
  BOTTOM: "bottom",
  SIDE: "side",
  WINDOW: "window",
  TAB: "tab"
};

DevTools.prototype = {
  TargetType: DevTools.TargetType,
  HostType: DevTools.HostType,

  /**
   * Register a new developer tool.
   *
   * A definition is a light object that holds different information about a
   * developer tool. This object is not supposed to have any operational code.
   * See it as a "manifest".
   * The only actual code lives in the build() function, which will be used to
   * start an instance of this tool.
   *
   * Each toolDefinition has the following properties:
   * - id: Unique identifier for this tool (string|required)
   * - killswitch: Property name to allow us to turn this tool on/off globally
   *               (string|required) (TODO: default to devtools.{id}.enabled?)
   * - icon: URL pointing to a graphic which will be used as the src for an
   *         16x16 img tag (string|required)
   * - url: URL pointing to a XUL/XHTML document containing the user interface
   *        (string|required)
   * - label: Localized name for the tool to be displayed to the user
   *          (string|required)
   * - build: Function that takes an iframe, which has been populated with the
   *          markup from |url|, and also the toolbox containing the panel.
   *          And returns an instance of ToolPanel (function|required)
   */
  registerTool: function DT_registerTool(toolDefinition) {
    let toolId = toolDefinition.id;

    toolDefinition.killswitch = toolDefinition.killswitch ||
      "devtools." + toolId + ".enabled";
    this._tools.set(toolId, toolDefinition);

    this._addToolToWindows(toolDefinition);

    this.emit("tool-registered", toolId);
  },

  /**
   * Removes all tools that match the given |toolId|
   * Needed so that add-ons can remove themselves when they are deactivated
   *
   * @param {string} toolId
   *        id of the tool to unregister
   */
  unregisterTool: function DT_unregisterTool(toolId) {
    this._tools.delete(toolId);

    this._removeToolFromWindows(toolId);

    this.emit("tool-unregistered", toolId);
  },

  /**
   * Allow ToolBoxes to get at the list of tools that they should populate
   * themselves with.
   *
   * @return {Map} tools
   *         A map of the the tool definitions registered in this instance
   */
  getToolDefinitions: function DT_getToolDefinitions() {
    let tools = new Map();

    for (let [key, value] of this._tools) {
      let enabled;

      try {
        enabled = Services.prefs.getBoolPref(value.killswitch);
      } catch(e) {
        enabled = true;
      }

      if (enabled) {
        tools.set(key, value);
      }
    }
    return tools;
  },

  /**
   * Create a toolbox to debug |target| using a window displayed in |hostType|
   * (optionally with |defaultToolId| opened)
   *
   * @param {Target} target
   *         The target the toolbox will debug
   * @param {DevTools.HostType} hostType
   *        The type of host (bottom, top, side)
   * @param {string} defaultToolId
   *        The id of the initial tool to show
   *
   * @return {Toolbox} toolbox
   *        The toolbox that was opened
   */
  openToolbox: function DT_openToolbox(target, hostType, defaultToolId) {
    if (this._toolboxes.has(target.value)) {
      // only allow one toolbox per target
      return null;
    }

    let tb = new Toolbox(target, hostType, defaultToolId);

    this._toolboxes.set(target.value, tb);
    tb.once("destroyed", function() {
      this._toolboxes.delete(target.value);
    }.bind(this));

    tb.open();

    return tb;
  },

  /**
   * Close the toolbox for a given tab
   *
   * @param  {XULTab} tab
   *         The tab the toolbox to close is debugging
   */
  closeToolbox: function DT_closeToolbox(tab) {
    let toolbox = this._toolboxes.get(tab);
    if (toolbox == null) {
      return;
    }
    toolbox.destroy();
  },

  /**
   * Open the toolbox for a specific tab.
   *
   * @param  {XULTab} tab
   *         The tab that the toolbox should be debugging
   * @param  {String} toolId
   *         The id of the tool to open
   *
   * @return {Toolbox} toolbox
   *         The toolbox that has been opened
   */
  openToolboxForTab: function DT_openToolboxForTab(tab, toolId) {
    let tb = this.getToolboxForTarget(tab);

    if (tb) {
      tb.selectTool(toolId);
    } else {
      let target = {
        type: gDevTools.TargetType.TAB,
        value: tab
      }
      tb = this.openToolbox(target, null, toolId);
    }
    return tb;
  },

  /**
   * Toggle a toolbox for the given browser tab.
   *
   * @param  {XULTab} tab
   *         The tab the toolbox is debugging
   * @param  {string} toolId
   *         The id of the tool to show in the toolbox, if it's to be opened.
   */
  toggleToolboxForTab: function DT_toggleToolboxForTab(tab, toolId) {
    let tb = this.getToolboxForTarget(tab);

    if (tb /* FIXME: && tool is showing */ ) {
      tb.destroy();
    } else {
      this.openToolboxForTab(tab, toolId);
    }
  },

  /**
   * Return a map(DevToolsTarget, DevToolbox) of all the Toolboxes
   * map is a copy, not reference (can't be altered).
   *
   * @return {Map} toolboxes
   *         A map of open toolboxes
   */
  getToolboxes: function DT_getToolboxes() {
    let toolboxes = new Map();

    for (let [key, value] of this._toolboxes) {
      toolboxes.set(key, value);
    }
    return toolboxes;
  },

  /**
   * Return the toolbox for a given target.
   *
   * @param  {object} targetValue
   *         Target value e.g. the tab that owns this toolbox
   *
   * @return {Toolbox} toolbox
   *         The toobox that is debugging the given target
   */
  getToolboxForTarget: function DT_getToolboxForTarget(targetValue) {
    return this._toolboxes.get(targetValue);
  },

  /**
   * Return a tool panel for a given tool and target.
   *
   * @param  {String} toolId
   *         The id of the tool to open.
   * @param  {object} targetValue
   *         The toolbox's target.
   *
   * @return {ToolPanel} panel
   *         Panel for the tool with the toolid
   */
  getPanelForTarget: function DT_getPanelForTarget(toolId, targetValue) {
    let toolbox = this.getToolboxForTarget(targetValue);
    if (!toolbox) {
      return undefined;
    }
    return toolbox.getToolPanels().get(toolId);
  },

  /**
   * Add the menuitem for a tool to all open browser windows.
   *
   * @param {object} toolDefinition
   *        properties of the tool to add
   */
  _addToolToWindows: function DT_addToolToWindows(toolDefinition) {
    let enumerator = Services.wm.getEnumerator("navigator:browser");
    while (enumerator.hasMoreElements()) {
      let win = enumerator.getNext();
      this._addToolToMenu(toolDefinition, win.document);
    }
  },

  /**
   * Add all tools to the developer tools menu of a window.
   *
   * @param {XULDocument} doc
   *        The document to which the tool items are to be added.
   */
  _addAllToolsToMenu: function DT_addAllToolsToMenu(doc) {
    let fragCommands = doc.createDocumentFragment();
    let fragKeys = doc.createDocumentFragment();
    let fragBroadcasters = doc.createDocumentFragment();
    let fragAppMenuItems = doc.createDocumentFragment();
    let fragMenuItems = doc.createDocumentFragment();

    for (let [key, toolDefinition] of this._tools) {
      let [cmd, key, bc, item] =
        this._addToolToMenu(toolDefinition, doc, true);

      fragCommands.appendChild(cmd);
      if (key) {
        fragKeys.appendChild(key);
      }
      fragBroadcasters.appendChild(bc);
      fragAppMenuItems.appendChild(item);
      item = item.cloneNode();
      fragMenuItems.appendChild(item);
    }

    let mcs = doc.getElementById("mainCommandSet");
    mcs.appendChild(fragCommands);

    let mks = doc.getElementById("mainKeyset");
    mks.appendChild(fragKeys);

    let mbs = doc.getElementById("mainBroadcasterSet");
    mbs.appendChild(fragBroadcasters);

    let amp = doc.getElementById("appmenu_webDeveloper_popup");
    if (amp) {
      let amps = doc.getElementById("appmenu_devtools_separator");
      amp.insertBefore(fragAppMenuItems, amps);
    }

    let mp = doc.getElementById("menuWebDeveloperPopup");
    let mps = doc.getElementById("menu_devtools_separator");
    mp.insertBefore(fragMenuItems, mps);
  },

  /**
   * Add a menu entry for a tool definition
   *
   * @param {string} toolDefinition
   *        Tool definition of the tool to add a menu entry.
   * @param {XULDocument} doc
   *        The document to which the tool menu item is to be added.
   * @param {Boolean} [noAppend]
   *        Return an array of elements instead of appending them to the
   *        document. Default is false.
   */
  _addToolToMenu: function DT_addToolToMenu(toolDefinition, doc, noAppend) {
    let id = toolDefinition.id;

    // Prevent multiple entries for the same tool.
    if (doc.getElementById("Tools:" + id)) {
      return;
    }

    let cmd = doc.createElement("command");
    cmd.setAttribute("id", "Tools:" + id);
    cmd.setAttribute("oncommand",
      'gDevTools.openToolboxForTab(gBrowser.selectedTab, "' + id + '");');

    let key = null;
    if (toolDefinition.key) {
      key = doc.createElement("key");
      key.setAttribute("id", "key_" + id);

      if (toolDefinition.key.startsWith("VK_")) {
        key.setAttribute("keycode", toolDefinition.key);
      } else {
        key.setAttribute("key", toolDefinition.key);
      }

      key.setAttribute("oncommand",
        'gDevTools.openToolboxForTab(gBrowser.selectedTab, "' + id + '");');
      key.setAttribute("modifiers", toolDefinition.modifiers);
    }

    let bc = doc.createElement("broadcaster");
    bc.id = "devtoolsMenuBroadcaster_" + id;
    bc.setAttribute("label", toolDefinition.label);
    bc.setAttribute("command", "Tools:" + id);

    if (key) {
      bc.setAttribute("key", "key_" + id);
    }

    let item = doc.createElement("menuitem");
    item.id = "appmenu_devToolbar" + id;
    item.setAttribute("observes", "devtoolsMenuBroadcaster_" + id);

    if (toolDefinition.accesskey) {
      item.setAttribute("accesskey", toolDefinition.accesskey);
    }

    if (noAppend) {
      return [cmd, key, bc, item];
    } else {
      let mcs = doc.getElementById("mainCommandSet");
      mcs.appendChild(cmd);

      if (key) {
        let mks = doc.getElementById("mainKeyset");
        mks.appendChild(key);
      }

      let mbs = doc.getElementById("mainBroadcasterSet");
      mbs.appendChild(bc);

      let amp = doc.getElementById("appmenu_webDeveloper_popup");
      if (amp) {
        let amps = doc.getElementById("appmenu_devtools_separator");
        amp.insertBefore(item, amps);
      }

      item = item.cloneNode();

      let mp = doc.getElementById("menuWebDeveloperPopup");
      let mps = doc.getElementById("menu_devtools_separator");
      mp.insertBefore(item, mps);
    }
  },

  /**
   * Add the menuitem for a tool to all open browser windows.
   *
   * @param {object} toolId
   *        id of the tool to remove
   */
  _removeToolFromWindows: function DT_removeToolFromWindows(toolId) {
    let enumerator = Services.wm.getEnumerator("navigator:browser");
    while (enumerator.hasMoreElements()) {
      let win = enumerator.getNext();
      this._removeToolFromMenu(toolId, win.document);
    }
  },

  /**
   * Remove a tool's menuitem from a window
   *
   * @param {string} toolDefinition
   *        Tool definition of the tool to add a menu entry for
   * @param {XULDocument} doc
   *        The document to which the tool menu item is to be removed from
   */
  _removeToolFromMenu: function DT_removeToolFromMenu(toolId, doc) {
    let command = doc.getElementById("Tools:" + toolId);
    command.parentNode.removeChild(command);

    let key = doc.getElementById("key_" + toolId);
    if (key) {
      key.parentNode.removeChild(key);
    }

    let bc = doc.getElementById("devtoolsMenuBroadcaster_" + toolId);
    bc.parentNode.removeChild(bc);

    let item = doc.getElementById("appmenu_devToolbar" + toolId);
    item.parentNode.removeChild(item);
  },

  /**
   * Observer for the event fired when a new Firefox window is opened
   */
  _newWindowObserver: function DT_newWindowObserver(subject, topic, data) {
    let win = subject.QueryInterface(Ci.nsIInterfaceRequestor)
                     .getInterface(Ci.nsIDOMWindow);
    let winLoad = function() {
      win.removeEventListener("load", winLoad, false);
      this._addAllToolsToMenu(win.document);
    }.bind(this);

    win.addEventListener("load", winLoad, false);
  },

  /**
   * Destroy this DevTools instance.
   */
  destroy: function DT_destroy() {
    Services.obs.removeObserver(this._newWindowObserver, "xul-window-registered");

    delete this._tools;
    delete this._toolboxes;
    delete this._win;
  }
};

/**
 * gDevTools is a singleton that controls the Firefox Developer Tools.
 *
 * It is an instance of a DevTools class that holds a set of tools. It has the
 * same lifetime as the browser.
 */
const gDevTools = new DevTools();

/**
 * Register the set of default tools
 */
for (let definition of defaultTools) {
  gDevTools.registerTool(definition)
}
