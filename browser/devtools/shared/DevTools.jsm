/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const EXPORTED_SYMBOLS = [ "gDevTools" ];

/**
 * gDevTools is a singleton that controls Firefox Developer Tools.
 *
 * It is an instance of a DevTools class that holds a set of tools. This lets us
 * have alternative sets of tools, for example to allow a Firebug type
 * alternative. It has the same lifetime as the browser.
 */
function DevTools() {}

DevTools.prototype = {
  /**
   * A Toolbox target is an object with this shape:
   * {
   *   type: TargetType.[TAB|REMOTE|CHROME],
   *   value: ...
   * }
   *
   * When type = TAB, then 'value' contains a XUL Tab
   * When type = REMOTE, then 'value' contains an object with host and port
   *   properties, for example:
   *   { type: TargetType.TAB, value: { host: 'localhost', port: 4325 } }
   * When type = CHROME, then 'value' contains a XUL window
   */
  TargetType: {
    TAB: "tab",
    REMOTE: "remote",
    CHROME: "chrome"
  },

  /**
   * The developer tools can be 'hosted' either embedded in a browser window, or
   * in a separate tab. Other hosts may be possible here, like a separate XUL
   * window. A Toolbox host is an object with this shape:
   * {
   *   type: HostType.[IN_BROWSER|TAB],
   *   element: ...
   * }
   *
   * Definition of the 'element' property is left as an exercise to the implementor
   */
  HostType: {
    IN_BROWSER: "browser",
    TAB: "tab"
  },

  ToolEvent: {
    TOOLREADY: "devtools-tool-ready",
    TOOLHIDE: "devtools-tool-hide",
    TOOLSHOW: "devtools-tool-show",
    TOOLCLOSED: "devtools-tool-closed",
    TOOLBOXREADY: "devtools-toolbox-ready",
    TOOLBOXCLOSED: "devtools-toolbox-closed",
  },

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
   *          ToolInstance (function|required)
   * - showInContextMenu: Should the tool be added to the context menu? (boolean|optional)
   * MIKE: Maybe use targets toolbox & contextMenu instead? // Paul: too inspector-specific
   * MIKE: Why too inspector-specific? Users can create whatever tools they want.
   */
  registerTool: function DT_registerTool(aToolDefinition) {

  },

  /**
   * Removes all tools that match the given |aId|
   * Needed so that add-ons can remove themselves when they are deactivated
   */
  unregisterTool: function DT_unregisterTool(aId) {

  },

  /**
   * Allow ToolBoxes to get at the list of tools that they should populate
   * themselves with
   */
  getToolDefinitions: function DT_getToolDefinitions() {

  },

  /**
   * Create a toolbox to debug aTarget using a window displayed in aHostType
   * (optionally with aDefaultToolId opened)
   */
  openToolbox: function DT_openToolbox(aTarget, aHost, aDefaultToolId) {

  },

  /**
   * Return a map(DevToolsTarget, DevToolBox) of all the Toolboxes
   * map is a copy, not reference (can't be altered)
   */
  getToolBoxes: function DT_getToolBoxes() {

  },

  /*
   * Events:
   * All events come with an reference to the original target {tool, toolbox}
   *
   * Totally WIP - more will emerge during the implementation:
   * ToolEvent: {
       TOOLREADY: "devtools-tool-ready",
       TOOLHIDE: "devtools-tool-hide",
       TOOLSHOW: "devtools-tool-show",
       TOOLCLOSED: "devtools-tool-closed",
       TOOLBOXREADY: "devtools-toolbox-ready",
       TOOLBOXCLOSED: "devtools-toolbox-closed",
     }
   */
  /**
   * Add a ToolEvent listener.
   * @param  {ToolEvent} aEvent
   *         The ToolEvent to listen for.
   * @param  {Function} aListener
   *         MIKE: Why not just pass in the handler instead of the listener?
   */
  on: function DT_on(aEvent, aListener) {

  },

  off: function DT_off(aEvent, aListener) {

  },
};

/**
 * The set of tools contained in each Firefox Developer Tools window. We need to
 * create it here so that the object exports correctly.
 */
const gDevTools = new DevTools();

//------------------------------------------------------------------------------

/**
 * A "Toolbox" is the component that holds all the tools for one specific
 * target. Visually, it's a document (about:devtools) that includes the tools
 * tabs and all the iframes where the tool instances will be living in.
 */
function Toolbox(aTarget, aHost, aDefaultToolId) {}

Toolbox.prototype = {
  /**
   * Remove all UI elements, detach from target and clear up
   */
  destroy: function TBOX_destroy() {

  },
};

/**
 * Get/alter the target of a Toolbox so we're debugging something different.
 * See TargetType for more details.
 * TODO: Do we allow |toolbox.target = null;| ?
 */
Object.defineProperty(Toolbox.prototype, 'target', {
  get: function TBOX_getTarget() {

  },

  set: function TBOX_setTarget() {

  }
});

/**
 * Get/alter the host of a Toolbox, i.e. is it in browser or in a separate
 * tab. See HostType for more details.
 */
Object.defineProperty(Toolbox.prototype, 'host', {
  get: function TBOX_getHost() {

  },

  set: function TBOX_setHost() {

  }
});

/**
 * Get/alter the currently displayed tool.
 */
Object.defineProperty(Toolbox.prototype, 'currentToolId', {
  get: function TBOX_getCurrentToolId() {

  },

  set: function TBOX_setCurrentToolId() {

  }
});

//------------------------------------------------------------------------------

/**
 * When a Toolbox is started it creates a DevToolInstance for each of the tools
 * by calling toolDefinition.build(). The returned object should
 * at least implement these functions. They will be used by the ToolBox.
 *
 * There may be no benefit in doing this as an abstract type, but if nothing
 * else gives us a place to write documentation.
 */
function DevToolInstance() {}

DevToolInstance.prototype = {
  /**
   * The Toolbox in which this Tool was hosted has been closed, possibly due to
   * the target being closed. We should clear-up.
   */
  destroy: function DTI_destroy() {

  },

  /**
   * This tool is being hidden.
   * TODO: What is the definition of hidden?
   */
  hide: function DTI_hide() {

  },

  /**
   * This tool is being shown.
   */
  show: function DTI_show() {

  },
};

/**
 * Get the target of a Tool so we're debugging something different.
 * TODO: Not sure about that. Maybe it's the ToolBox's job to destroy the tool
 * and start it again with a new target.
 *   JOE: If we think that, does the same go for Toolbox? I'm leaning towards
 *        Keeping these in both cases. Either way I like symmetry.
 *        Certainly target should be read-only to the public or we could have
 *        one tool in a toolbox having a different target to the others
 */
Object.defineProperty(DevToolInstance.prototype, 'target', {
  get: function DTI_getTarget() {

  },

  set: function DTI_setTarget() {

  }
});
/**
 * Get the type of this tool.
 * TODO: If this function isn't used then it should be removed
 */
Object.defineProperty(DevToolInstance.prototype, 'id', {
  get: function DTI_getId() {

  },

  set: function DTI_setId() {

  }
});
