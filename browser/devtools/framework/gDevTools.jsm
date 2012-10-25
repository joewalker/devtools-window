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
 * gDevTools is a singleton that controls Firefox Developer Tools.
 *
 * It is an instance of a DevTools class that holds a set of tools. This lets us
 * have alternative sets of tools, for example to allow a Firebug type
 * alternative. It has the same lifetime as the browser.
 */
function DevTools() {
  this._tools = new Map();
  this._toolboxes = new Map();

  // We need access to the browser window in order to add menu items. Because
  // this object is instantiated inside this jsm we need to use
  // getMostRecentWindow in order to do so.
  this._win = Services.wm.getMostRecentWindow("navigator:browser");

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

/**
 * Event constants.
 * FIXME: The supported list of events needs finalizing and documenting.
 */
DevTools.ToolEvent = {
  TOOLREADY: "devtools-tool-ready",
  TOOLHIDE: "devtools-tool-hide",
  TOOLSHOW: "devtools-tool-show",
  TOOLCLOSED: "devtools-tool-closed",
  TOOLBOXREADY: "devtools-toolbox-ready",
  TOOLBOXCLOSED: "devtools-toolbox-closed",
};

DevTools.prototype = {
  TargetType: DevTools.TargetType,
  HostType: DevTools.HostType,
  ToolEvent: DevTools.ToolEvent,

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
   * - build: Function that takes a single parameter, a frame, which has been
   *          populated with the markup from |url|. And returns an instance of
   *          ToolPanel (function|required)
   */
  registerTool: function DT_registerTool(toolDefinition) {
    let toolId = toolDefinition.id;

    toolDefinition.killswitch = toolDefinition.killswitch ||
      "devtools." + toolId + ".enabled";
    this._tools.set(toolId, toolDefinition);

    this._addToolToMenu(toolDefinition);

    this.emit("tool-registered", toolId);
  },

  /**
   * Removes all tools that match the given |toolId|
   * Needed so that add-ons can remove themselves when they are deactivated
   */
  unregisterTool: function DT_unregisterTool(toolId) {
    this._tools.delete(toolId);

    this.emit("tool-unregistered", toolId);
  },

  /**
   * Allow ToolBoxes to get at the list of tools that they should populate
   * themselves with
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
   * FIXME: There is probably a better way of doing this
   */
  openDefaultToolbox: function DT_openDefaultToolbox(tab, tool) {
    let target = {
      type: DevTools.TargetType.TAB,
      value: tab
    };
    gDevTools.openToolbox(target, undefined, tool);
  },

  /**
   * FIXME: There is probably a better way of doing this
   */
  closeToolbox: function DT_closeToolbox(tab) {
    let toolbox = this._toolboxes.get(tab);
    if (toolbox == null) {
      return;
    }
    toolbox.destroy();
  },

  /**
   * Toggle a toolbox for the given browser tab
   */
  toggleToolboxForTab: function toggleToolboxForTab(tab, tool) {
    let tb = this.getToolboxForTarget(tab);

    if (tb /* FIXME: && tool is showing */ ) {
      tb.destroy();
    } else {
      this.openDefaultToolbox(tab, tool);
    }
  },

  /**
   * Return a map(DevToolsTarget, DevToolBox) of all the Toolboxes
   * map is a copy, not reference (can't be altered)
   */
  getToolBoxes: function DT_getToolBoxes() {
    let toolboxes = new Map();

    for (let [key, value] of this._toolboxes) {
      toolboxes.set(key, value);
    }
    return toolboxes;
  },

  /**
   * Return the toolbox for a given target.
   */
  getToolboxForTarget: function(targetValue) {
    return this._toolboxes.get(targetValue);
  },

  /**
   * Return a tool panel for a target.
   */
  getPanelForTarget: function(toolName, targetValue) {
    let toolbox = this.getToolboxForTarget(targetValue);
    if (!toolbox) {
      return undefined;
    }
    return toolbox.getToolPanels().get(toolName);
  },

  /**
   * Add all tools to developer tools menu. Used when a new Firefox window is
   * opened.
   */
  _addAllToolsToMenu: function GDT_addAllToolsToMenu(chromeDoc) {
    let doc = chromeDoc || this._win.document;
    let fragCommands = doc.createDocumentFragment();
    let fragKeys = doc.createDocumentFragment();
    let fragBroadcasters = doc.createDocumentFragment();
    let fragAppMenuItems = doc.createDocumentFragment();
    let fragMenuItems = doc.createDocumentFragment();

    for (let [key, toolDefinition] of gDevTools._tools) {
      let [cmd, key, bc, item] =
        gDevTools._addToolToMenu(toolDefinition, chromeDoc, true);

      fragCommands.appendChild(cmd);
      fragKeys.appendChild(key);
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
    let amps = doc.getElementById("appmenu_devtools_separator");
    amp.insertBefore(fragAppMenuItems, amps);

    let mp = doc.getElementById("menuWebDeveloperPopup");
    let mps = doc.getElementById("menu_devtools_separator");
    mp.insertBefore(fragMenuItems, mps);
  },

  /**
   * Add a menu entry for a tool definition
   *
   * @param {string} toolDefinition
   *        Tool definition of the tool to add a menu entry.
   * @param {XULDocument} [chromeDoc]
   *        The document to which the tool menu item is to be added.
   * @param {Boolean} [noAppend]
   *        Return an array of elements instead of appending them to the
   *        document. Default is false.
   */
  _addToolToMenu: function GDT_addToolToMenu(toolDefinition, chromeDoc, noAppend) {
    let doc = chromeDoc || this._win.document;
    let id = toolDefinition.id;

    // Prevent multiple entries for the same tool.
    if (doc.getElementById("Tools:" + id)) {
      return;
    }

    let cmd = doc.createElement("command");
    cmd.setAttribute("id", "Tools:" + id);
    cmd.setAttribute("oncommand",
      'gDevTools.openToolForTab("' + id + '", gBrowser.selectedTab);');

    let key = doc.createElement("key");
    key.setAttribute("id", "key_" + id);

    if (toolDefinition.key.startsWith("VK_")) {
      key.setAttribute("keycode", toolDefinition.key);
    } else {
      key.setAttribute("key", toolDefinition.key);
    }

    key.setAttribute("oncommand",
      'gDevTools.openToolForTab("' + id + '", gBrowser.selectedTab);');
    key.setAttribute("modifiers", toolDefinition.modifiers);

    let bc = doc.createElement("broadcaster");
    bc.id = "devtoolsMenuBroadcaster_" + id;
    bc.setAttribute("label", toolDefinition.label);
    bc.setAttribute("command", "Tools:" + id);
    bc.setAttribute("key", "key_" + id);

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

      let mks = doc.getElementById("mainKeyset");
      mks.appendChild(key);

      let mbs = doc.getElementById("mainBroadcasterSet");
      mbs.appendChild(bc);

      let amp = doc.getElementById("appmenu_webDeveloper_popup");
      let amps = doc.getElementById("appmenu_devtools_separator");
      amp.insertBefore(item, amps);

      item = item.cloneNode();

      let mp = doc.getElementById("menuWebDeveloperPopup");
      let mps = doc.getElementById("menu_devtools_separator");
      mp.insertBefore(item, mps);
    }
  },

  /**
   * Open the toolbox for a specific tab.
   *
   * @param  {String} aId
   *         The id of the tool to open.
   * @param  {XULTab} aTab
   *         The tab that the toolbox should be pointing at.
   */
  openToolForTab: function DT_openToolForTab(aId, aTab) {
    let tb = gDevTools.getToolboxForTarget(aTab);

    if (tb) {
      tb.selectTool(aId);
    } else {
      let target = {
        type: gDevTools.TargetType.TAB,
        value: aTab
      }
      gDevTools.openToolbox(target, null, aId);
    }
  },

  _newWindowObserver: function GDT_newWindowObserver(aSubject, aTopic, aData) {
    let win = aSubject.QueryInterface(Ci.nsIInterfaceRequestor)
                      .getInterface(Ci.nsIDOMWindow);
    win.addEventListener("load", function GDT_winLoad() {
      win.removeEventListener("load", GDT_winLoad, false);
      gDevTools._addAllToolsToMenu(win.document);
    }, false);
  },

  destroy: function DT_destroy() {
    Services.obs.removeObserver(this._newWindowObserver, "xul-window-registered");

    delete this._tools;
    delete this._toolboxes;
    delete this._win;
  }
};

/**
 * The set of tools contained in each Firefox Developer Tools window. We need to
 * create it here so that the object exports correctly.
 */
const gDevTools = new DevTools();

/**
 * Register the set of default tools
 */
for (let definition of defaultTools) {
  gDevTools.registerTool(definition)
}
