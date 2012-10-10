/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const Cu = Components.utils;
const Ci = Components.interfaces;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/devtools/EventEmitter.jsm");
Cu.import("resource:///modules/devtools/ToolboxHosts.jsm");
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, "gDevTools",
                                  "resource:///modules/devtools/gDevTools.jsm");

const EXPORTED_SYMBOLS = [ "Toolbox" ];

/**
 * A "Toolbox" is the component that holds all the tools for one specific
 * target. Visually, it's a document (about:devtools) that includes the tools
 * tabs and all the iframes where the tool panels will be living in.
 */
function Toolbox(target, hostType, selectedTool) {
  this._target = target;
  this._toolPanels = new Map();

  this._onLoad = this._onLoad.bind(this);
  this._handleEvent = this._handleEvent.bind(this);
  this.destroy = this.destroy.bind(this);

  if (!hostType) {
    hostType = Services.prefs.getCharPref(this._prefs.LAST_HOST);
  }
  if (!selectedTool) {
    selectedTool = Services.prefs.getCharPref(this._prefs.LAST_TOOL);
  }
  let definitions = gDevTools.getToolDefinitions();
  if (!definitions.get(selectedTool)) {
    selectedTool = "webconsole";
  }
  this._defaultToolId = selectedTool;

  this._host = this._createHost(hostType);

  new EventEmitter(this);

  gDevTools.on("tool-registered", this._handleEvent);
  gDevTools.on("tool-unregistered", this._handleEvent);
}

Toolbox.prototype = {
  _URL: "chrome://browser/content/devtools/framework/toolbox.xul",

  _prefs: {
    LAST_HOST:  "devtools.toolbox.host",
    LAST_TOOL: "devtools.toolbox.selectedTool"
  },

  _handleEvent: function TB_handleEvent(aEventId, ...args) {
    let toolId;

    switch(aEventId) {
      /**
       * Handler for the tool-registered event.
       * @param  {String} aToolId
       *         The ID of the registered tool.
       */
      case "tool-registered":
        toolId = args[0];

        let defs = gDevTools.getToolDefinitions();
        let tool = defs.get(toolId);

        this._buildTabForTool(tool);
        break;

      /**
       * Handler for the tool-unregistered event.
       * @param  {String} aToolId
       *         The ID of the unregistered tool.
       */
      case "tool-unregistered":
        toolId = args[0];

        let doc = this._host.frame.contentWindow.document;
        let radio = doc.getElementById("toolbox-tab-" + toolId);
        let panel = doc.getElementById("toolbox-panel-" + toolId);

        if (this._currentToolId == toolId) {
          let nextToolName = null;
          if (radio.nextSibling) {
            nextToolName = radio.nextSibling.getAttribute("toolid");
          }
          if (radio.previousSibling) {
            nextToolName = radio.previousSibling.getAttribute("toolid");
          }
          if (nextToolName) {
            this.selectTool(nextToolName);
          }
        }

        if (radio) {
          radio.parentNode.removeChild(radio);
        }

        if (panel) {
          panel.parentNode.removeChild(panel);
        }

        if (this._toolPanels.has(toolId)) {
          let instance = this._toolPanels.get(toolId);
          instance.destroy();
          this._toolPanels.delete(toolId);
        }
        break;
    }
  },

  /**
   * Returns a *copy* of the _toolPanels collection.
   */
  getToolPanels: function TB_getToolPanels() {
    let panels = new Map();

    for (let [key, value] of this._toolPanels) {
      panels.set(key, value);
    }
    return panels;
  },

  /**
   * Get/alter the target of a Toolbox so we're debugging something different.
   * See TargetType for more details.
   * TODO: Do we allow |toolbox.target = null;| ?
   */
  get target() {
    return this._target;
  },

  set target(aValue) {
    this._target = aValue;
  },

  /**
   * Get/alter the host of a Toolbox, i.e. is it in browser or in a separate
   * tab. See HostType for more details.
   */
  get hostType() {
    return this._host.type;
  },

  set hostType(aValue) {
    this._switchToHost(aValue);
  },

  /**
   * Get/alter the currently displayed tool.
   */
  get currentToolId() {
    return this._currentToolId;
  },

  set currentToolId(aValue) {
    this._currentToolId = aValue;
  },

  /**
   * Get the iframe containing the toolbox UI
   */
  get frame() {
    return this._host.frame;
  },

  /**
   * Open the toolbox
   */
  open: function TBOX_open() {
    this._host.createUI(function (iframe) {
      iframe.addEventListener("DOMContentLoaded", this._onLoad, true);
      iframe.setAttribute("src", this._URL);
    }.bind(this));
  },

  /**
   * Onload handler for the toolbox's iframe
   */
  _onLoad: function TBOX_onLoad() {
    let frame = this._host.frame;
    frame.removeEventListener("DOMContentLoaded", this._onLoad, true);

    let doc = frame.contentDocument;
    let buttons = doc.getElementsByClassName("toolbox-dock-button");

    for (let i = 0; i < buttons.length; i++) {
      let button = buttons[i];
      button.addEventListener("command", function() {
        let position = button.getAttribute("data-position");
        this._switchToHost(position);
      }
      .bind(this), true);
    }

    let closeButton = doc.getElementById("toolbox-close");
    closeButton.addEventListener("command", this.destroy, true);

    this._buildTabs();
    this._buildButtons(frame);

    this.selectTool(this._defaultToolId);

    this.emit("load");
  },

  /**
   * Add tabs to the toolbox UI for registered tools
   */
  _buildTabs: function TBOX_buildTabs() {
    for (let [id, definition] of gDevTools.getToolDefinitions()) {
      this._buildTabForTool(definition);
    }
  },

  _buildButtons: function TBOX_buildButtons(frame) {
    let window = frame.ownerDocument.defaultView;
    // FIXME: Once we move the DeveloperToolbar into the Devtools Window we
    // might not need this check.
    if (!window.DeveloperToolbar || !window.DeveloperToolbar.display) {
      return;
    }

    let requisition = window.DeveloperToolbar.display.requisition;

    let toolbarSpec = getToolbarSpec();
    let doc = frame.contentDocument;
    let container = doc.getElementById("toolbox-buttons");

    let buttons = createButtons(toolbarSpec, doc, requisition);

    buttons.forEach(function(button) {
      container.appendChild(button);
    }.bind(this));
  },

  /**
   * Build a tab for one tool definition and add to the toolbox
   *
   * @param {string} aToolDefinition
   *        Tool definition of the tool to build a tab for.
   */
  _buildTabForTool: function TBOX_buildTabForTool(aToolDefinition) {
    let doc = this._host.frame.contentDocument;
    let tabs = doc.getElementById("toolbox-tabs");
    let deck = doc.getElementById("toolbox-deck");

    let definition = aToolDefinition;
    let id = definition.id;

    let radio = doc.createElement("radio");
    radio.setAttribute("label", definition.label);
    radio.className = "toolbox-tab devtools-tab";
    radio.id = "toolbox-tab-" + id;
    radio.setAttribute("toolid", id);
    radio.addEventListener("command", function(id) {
      this.selectTool(id);
    }.bind(this, id));

    let vbox = doc.createElement("vbox");
    vbox.className = "toolbox-panel";
    vbox.id = "toolbox-panel-" + id;

    let iframe = doc.createElement("iframe");
    iframe.className = "toolbox-panel-iframe";
    iframe.id = "toolbox-panel-iframe-" + id;
    iframe.setAttribute("toolid", id);
    iframe.setAttribute("flex", 1);

    tabs.appendChild(radio);
    vbox.appendChild(iframe);
    deck.appendChild(vbox);
  },

  /**
   * Switch to the tool with the given id
   *
   * @param {string} id
   *        The id of the tool to switch to
   */
  selectTool: function TBOX_selectTool(id) {
    let doc = this._host.frame.contentDocument;
    let tab = doc.getElementById("toolbox-tab-" + id);
    let tabstrip = doc.getElementById("toolbox-tabs");

    // select the right tab
    let index = -1;
    let tabs = tabstrip.childNodes;
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i] === tab) {
        index = i;
        break;
      }
    }
    tabstrip.selectedIndex = index;

    // and select the right iframe
    let deck = doc.getElementById("toolbox-deck");
    deck.selectedIndex = index;

    let iframe = doc.getElementById("toolbox-panel-iframe-" + id);

    // only build the tab's content if we haven't already
    if (!iframe.toolLoaded) {
      iframe.toolLoaded = true;

      let definition = gDevTools.getToolDefinitions().get(id);

      let boundLoad = function() {
        iframe.removeEventListener("DOMContentLoaded", boundLoad, true);
        let instance = definition.build(iframe.contentWindow, this.target);
        this._toolPanels.set(id, instance);
      }.bind(this);

      iframe.addEventListener("DOMContentLoaded", boundLoad, true);
      iframe.setAttribute("src", definition.url);
    }

    Services.prefs.setCharPref(this._prefs.LAST_TOOL, id);

    this._currentToolId = id;
  },

  /**
   * Create a host object based on the given host type.
   *
   * @param string hostType
   *        The host type of the new host object
   */
  _createHost: function TBOX_createHost(hostType) {
    let hostTab = this._getHostTab();
    let newHost = new Hosts[hostType](hostTab);

    // clean up the toolbox if its window is closed
    newHost.on("window-closed", this.destroy);

    return newHost;
  },

  /**
   * Switch to a new host for the toolbox UI. E.g.
   * bottom, sidebar, separate window.
   */
  _switchToHost: function TBOX_switchToHost(hostType) {
    if (hostType == this._host.type) {
      return;
    }

    let newHost = this._createHost(hostType);

    newHost.createUI(function(iframe) {
      // change toolbox document's parent to the new host
      iframe.QueryInterface(Components.interfaces.nsIFrameLoaderOwner);
      iframe.swapFrameLoaders(this._host.frame);

      // destroy old host's UI
      this._host.destroyUI();
      this._host.off("window-closed", this.destroy);

      this._host = newHost;

      Services.prefs.setCharPref(this._prefs.LAST_HOST, this._host.type);

      this._setDockButtons();
    }.bind(this));
  },

  /**
   * Get the most appropriate host tab, either the target or the current tab
   */
  _getHostTab: function TBOX_getHostTab() {
    if (this._target.type == gDevTools.TargetType.TAB) {
      return this._target.value;
    } else {
      let win = Services.wm.getMostRecentWindow("navigator:browser");
      return win.gBrowser.selectedTab;
    }
  },

  /**
   * Set the docking buttons to reflect the current host
   */
  _setDockButtons: function TBOX_setDockButtons() {
    let doc = this._host.frame.contentDocument;

    let buttons = doc.querySelectorAll(".toolbox-dock-button");
    for (let button of buttons) {
      if (button.id == "toolbox-dock-" + this._host.type) {
        button.checked = true;
      }
      else {
        button.checked = false;
      }
    }
  },

  /**
   * Remove all UI elements, detach from target and clear up
   */
  destroy: function TBOX_destroy() {
    this._host.destroyUI();

    gDevTools.off("tool-registered", this._handleEvent);
    gDevTools.off("tool-unregistered", this._handleEvent);

    this.emit("destroyed");
  }
};



//------------------------------------------------------------------------------

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import("resource:///modules/devtools/gcli.jsm");
Components.utils.import("resource://gre/modules/devtools/Require.jsm");
Components.utils.import("resource://gre/modules/devtools/Console.jsm");

var Requisition = require("gcli/cli").Requisition;

XPCOMUtils.defineLazyGetter(this, "prefBranch", function() {
  var prefService = Components.classes["@mozilla.org/preferences-service;1"]
          .getService(Components.interfaces.nsIPrefService);
  return prefService.getBranch(null)
          .QueryInterface(Components.interfaces.nsIPrefBranch2);
});

/**
 * Read a toolbarSpec from preferences
 */
function getToolbarSpec() {
  try {
    var value = prefBranch.getComplexValue("devtools.window.toolbarspec", Ci.nsISupportsString).data;
    return JSON.parse(value);
  }
  catch (ex) {
    return [ "tilt toggle", "scratchpad open", "screenshot" ];
  }
}

/**
 * A toolbarSpec is an array of buttonSpecs. A buttonSpec is an array of
 * strings each of which is a GCLI command (including args if needed).
 */
function createButtons(toolbarSpec, document, requisition) {
  var reply = [];

  toolbarSpec.forEach(function(buttonSpec) {
    var button = document.createElement("toolbarbutton");
    reply.push(button);

    if (typeof buttonSpec == "string") {
      buttonSpec = { typed: buttonSpec };
    }
    // Ask GCLI to parse the typed string (doesn't execute it)
    requisition.update(buttonSpec.typed);

    // Ignore invalid commands
    var command = requisition.commandAssignment.value;
    if (command == null) {
      // TODO: Have a broken icon
      // button.icon = 'Broken';
      button.setAttribute("label", "💩");
      button.setAttribute("tooltip", "Unknown command: " + buttonSpec.typed);
      button.setAttribute("disabled", "true");
    }
    else {
      button.setAttribute("icon", "command.icon");
      button.setAttribute("tooltip", "command.manual");
      button.setAttribute("label", buttonSpec.typed.substring(0, 1));

      button.addEventListener("click", function() {
        requisition.update(buttonSpec.typed);
        //if (requisition.getStatus() == Status.VALID) {
          requisition.exec();
        /*
        }
        else {
          console.error('incomplete commands not yet supported');
        }
        */
      }, false);

      // Allow the command button to be toggleable
      /*
      if (command.checkedState) {
        button.setAttribute("type", "checkbox");
        button.setAttribute("checked", command.checkedState.get() ? "true" : "false");
        command.checkedState.on("change", function() {
          button.checked = command.checkedState.get();
        });
      }
      */
    }
  });

  requisition.update('');

  return reply;
}
