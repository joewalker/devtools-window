/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Hide highlighter:

// Fade out the highlighter when needed
let deck = this.chromeDoc.getElementById("devtools-sidebar-deck");
deck.addEventListener("mouseenter", this, true); // FIXME: removeEventListener
deck.addEventListener("mouseleave", this, true);

// From IUI

InspectorUI._registeredSidebars = [];

/**
 * Register an inspector sidebar template.
 * Already running sidebars will not be affected, see bug 740665.
 *
 * @param aRegistration Object
 * {
 *   id: "toolname",
 *   label: "Button or tab label",
 *   icon: "chrome://somepath.png",
 *   tooltiptext: "Button tooltip",
 *   accesskey: "S",
 *   contentURL: string URI, source of the tool's iframe content.
 *   load: Called when the sidebar has been created and the contentURL loaded.
 *         Passed an Inspector object and an iframe object.
 *   destroy: Called when the sidebar is destroyed by the inspector.
 *     Passed whatever was returned by the tool's create function.
 * }
 */
InspectorUI.registerSidebar = function IUI_registerSidebar(aRegistration)
{
  // Only allow a given tool ID to be registered once.
  if (InspectorUI._registeredSidebars.some(function(elt) elt.id == aRegistration.id))
    return false;

  InspectorUI._registeredSidebars.push(aRegistration);

  return true;
}

/**
 * Unregister a previously-registered inspector sidebar.
 * Already running sidebars will not be affected, see bug 740665.
 *
 * @param aID string
 */
InspectorUI.unregisterSidebar = function IUI_unregisterSidebar(aID)
{
  InspectorUI._registeredSidebars = InspectorUI._registeredSidebars.filter(function(aReg) aReg.id != aID);
}

///////////////////////////////////////////////////////////////////////////
//// Style Sidebar

/**
 * Manages the UI and loading of registered sidebar tools.
 * @param aOptions object
 *   Initialization information for the style sidebar, including:
 *     document: The chrome document in which the style sidebar
 *             should be created.
 *     inspector: The Inspector object tied to this sidebar.
 */
function InspectorStyleSidebar(aOptions)
{
  this._tools = {};
  this._chromeDoc = aOptions.document;
  this._inspector = aOptions.inspector;
}

InspectorStyleSidebar.prototype = {

  get visible() !this._box.hasAttribute("hidden"),
  get activePanel() this._deck.selectedPanel._toolID,

  destroy: function ISS_destroy()
  {
    // close the Layout View
    if (this._layoutview) {
      this._layoutview.destroy();
      this._layoutview = null;
    }

    for each (let toolID in Object.getOwnPropertyNames(this._tools)) {
      this.removeTool(toolID);
    }
    delete this._tools;
    this._teardown();
  },

  /**
   * Called by InspectorUI to create the UI for a registered sidebar tool.
   * Will create a toolbar button and an iframe for the tool.
   * @param aRegObj object
   *        See the documentation for InspectorUI.registerSidebar().
   */
  addTool: function ISS_addTool(aRegObj)
  {
    if (aRegObj.id in this._tools) {
      return;
    }

    let btn = this._chromeDoc.createElement("toolbarbutton");
    btn.setAttribute("label", aRegObj.label);
    btn.setAttribute("class", "devtools-toolbarbutton");
    btn.setAttribute("tooltiptext", aRegObj.tooltiptext);
    btn.setAttribute("accesskey", aRegObj.accesskey);
    btn.setAttribute("image", aRegObj.icon || "");
    btn.setAttribute("type", "radio");
    btn.setAttribute("group", "sidebar-tools");

    let spacer = this._toolbar.querySelector("spacer");
    this._toolbar.insertBefore(btn, spacer);
    // create tool iframe
    let frame = this._chromeDoc.createElement("iframe");
    frame.setAttribute("flex", "1");
    frame._toolID = aRegObj.id;

    // This is needed to enable tooltips inside the iframe document.
    frame.setAttribute("tooltip", "aHTMLTooltip");

    this._deck.appendChild(frame);

    // wire up button to show the iframe
    let onClick = function() {
      this.activatePanel(aRegObj.id);
    }.bind(this);
    btn.addEventListener("click", onClick, true);

    this._tools[aRegObj.id] = {
      id: aRegObj.id,
      registration: aRegObj,
      button: btn,
      frame: frame,
      loaded: false,
      context: null,
      onClick: onClick
    };
  },

  /**
   * Remove a tool from the sidebar.
   *
   * @param aID string
   *        The string ID of the tool to remove.
   */
  removeTool: function ISS_removeTool(aID)
  {
    if (!aID in this._tools) {
      return;
    }
    let tool = this._tools[aID];
    delete this._tools[aID];

    if (tool.loaded && tool.registration.destroy) {
      tool.registration.destroy(tool.context);
    }

    if (tool.onLoad) {
      tool.frame.removeEventListener("load", tool.onLoad, true);
      delete tool.onLoad;
    }

    if (tool.onClick) {
      tool.button.removeEventListener("click", tool.onClick, true);
      delete tool.onClick;
    }

    tool.button.parentNode.removeChild(tool.button);
    tool.frame.parentNode.removeChild(tool.frame);
  },

  /**
   * Hide or show the sidebar.
   */
  toggle: function ISS_toggle()
  {
    if (!this.visible) {
      this.show();
    } else {
      this.hide();
    }
  },

  /**
   * Shows the sidebar, updating the stored visibility pref.
   */
  show: function ISS_show()
  {
    this._box.removeAttribute("hidden");
    this._splitter.removeAttribute("hidden");
    this._toggleButton.checked = true;

    this._showDefault();

    this._inspector._sidebarOpen = true;
    Services.prefs.setBoolPref("devtools.inspector.sidebarOpen", true);

    // Instantiate the Layout View if needed.
    if (Services.prefs.getBoolPref("devtools.layoutview.enabled")
        && !this._layoutview) {
      this._layoutview = new LayoutView({
        document: this._chromeDoc,
        inspector: this._inspector,
      });
    }
  },

  /**
   * Hides the sidebar, updating the stored visibility pref.
   */
  hide: function ISS_hide()
  {
    this._teardown();
    this._inspector._sidebarOpen = false;
    Services.prefs.setBoolPref("devtools.inspector.sidebarOpen", false);
  },

  /**
   * Hides the sidebar UI elements.
   */
  _teardown: function ISS__teardown()
  {
    this._toggleButton.checked = false;
    this._box.setAttribute("hidden", true);
    this._splitter.setAttribute("hidden", true);
  },

  /**
   * Sets the current sidebar panel.
   *
   * @param aID string
   *        The ID of the panel to make visible.
   */
  activatePanel: function ISS_activatePanel(aID) {
    let tool = this._tools[aID];
    Services.prefs.setCharPref("devtools.inspector.activeSidebar", aID);
    this._inspector._activeSidebar = aID;
    this._deck.selectedPanel = tool.frame;
    this._showContent(tool);
    tool.button.setAttribute("checked", "true");
    let hasSelected = Array.forEach(this._toolbar.children, function(btn) {
      if (btn != tool.button) {
        btn.removeAttribute("checked");
      }
    });
  },

  /**
   * Make the iframe content of a given tool visible.  If this is the first
   * time the tool has been shown, load its iframe content and call the
   * registration object's load method.
   *
   * @param aTool object
   *        The tool object we're loading.
   */
  _showContent: function ISS__showContent(aTool)
  {
    // If the current tool is already loaded, notify that we're
    // showing this sidebar.
    if (aTool.loaded) {
      this._inspector.emit("sidebaractivated", aTool.id);
      this._inspector.emit("sidebaractivated-" + aTool.id);
      return;
    }

    // If we're already loading, we're done.
    if (aTool.onLoad) {
      return;
    }

    // This will be canceled in removeTool if necessary.
    aTool.onLoad = function(evt) {
      if (evt.target.location != aTool.registration.contentURL) {
        return;
      }
      aTool.frame.removeEventListener("load", aTool.onLoad, true);
      delete aTool.onLoad;
      aTool.loaded = true;
      aTool.context = aTool.registration.load(this._inspector, aTool.frame);

      this._inspector.emit("sidebaractivated", aTool.id);

      // Send an event specific to the activation of this panel.  For
      // this initial event, include a "createpanel" argument
      // to let panels watch sidebaractivated to refresh themselves
      // but ignore the one immediately after their load.
      // I don't really like this, we should find a better solution.
      this._inspector.emit("sidebaractivated-" + aTool.id, "createpanel");
    }.bind(this);
    aTool.frame.addEventListener("load", aTool.onLoad, true);
    aTool.frame.setAttribute("src", aTool.registration.contentURL);
  },

  /**
   * For testing purposes, mostly - return the tool-provided context
   * for a given tool.  Will only work after the tool has been loaded
   * and instantiated.
   */
  _toolContext: function ISS__toolContext(aID) {
    return aID in this._tools ? this._tools[aID].context : null;
  },

  /**
   * Also mostly for testing, return the list of tool objects stored in
   * the sidebar.
   */
  _toolObjects: function ISS__toolObjects() {
    return [this._tools[i] for each (i in Object.getOwnPropertyNames(this._tools))];
  },

  /**
   * If no tool is already selected, show the last-used sidebar.  If there
   * was no last-used sidebar, just show the first one.
   */
  _showDefault: function ISS__showDefault()
  {
    let hasSelected = Array.some(this._toolbar.children,
      function(btn) btn.hasAttribute("checked"));

    // Make sure the selected panel is loaded...
    this._showContent(this._tools[this.activePanel]);

    if (hasSelected) {
      return;
    }

    let activeID = this._inspector._activeSidebar;
    if (!activeID || !(activeID in this._tools)) {
      activeID = Object.getOwnPropertyNames(this._tools)[0];
    }
    this.activatePanel(activeID);
  },

  // DOM elements
  get _toggleButton() this._chromeDoc.getElementById("inspector-style-button"),
  get _box() this._chromeDoc.getElementById("devtools-sidebar-box"),
  get _splitter() this._chromeDoc.getElementById("devtools-side-splitter"),
  get _toolbar() this._chromeDoc.getElementById("devtools-sidebar-toolbar"),
  get _deck() this._chromeDoc.getElementById("devtools-sidebar-deck"),
};

);
