/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests devtools API

function test() {
  addTab("about:blank", function(aBrowser, aTab) {
    runTests(aTab);
    gBrowser.removeCurrentTab();
    finish();
  });
}

function runTests(aTab) {
  let toolId = "test-tool";

  let toolDefinition = {
    id: "test-tool",
    killswitch: "devtools.test-tool.enabled",
    icon: "chrome://browser/skin/devtools/alerticon-warning.png",
    url: "chrome://browser/content/devtools/csshtmltree.xul",
    label: "someLabel",
    build: function(aFrame) {
      let target = TargetFactory.forTab(aTab);
      return new DevToolInstance(target, this.id);
    },
  };

  ok(gDevTools, "gDevTools exists");
  is(gDevTools.getToolDefinitions().has(toolId), false,
    "The tool is not registered");

  gDevTools.registerTool(toolDefinition);
  is(gDevTools.getToolDefinitions().has(toolId), true,
    "The tool is registered");

  gDevTools.openToolbox(gBrowser.selectedTab, gDevTools.HostType.TAB, toolId);

  let toolBoxes = gDevTools.getToolBoxes(gBrowser.selectedTab);

  let tb = toolBoxes.get(gBrowser.selectedTab);
  is(tb.target, gBrowser.selectedTab, "toolbox target is correct");
  is(tb.host, gDevTools.HostType.TAB, "toolbox host is correct");
  is(tb._currentToolId, toolId, "toolbox _currentToolId is correct");

  let toolInstances = tb.getToolInstances();
  is(toolInstances.has(toolId), true, "The tool is in the toolbox");

  let toolInstance = toolInstances.get(toolId);
  is(toolInstance.target.tab, gBrowser.selectedTab,
    "toolInstance target is correct");
  is(toolInstance.id, toolId, "toolInstance id is correct");

  gDevTools.unregisterTool(toolId);
  is(gDevTools.getToolDefinitions().has(toolId), false,
    "The tool is no longer registered");

  // Test killswitch
  Services.prefs.setBoolPref(toolDefinition.killswitch, false);
  gDevTools.registerTool(toolDefinition);
  is(gDevTools.getToolDefinitions().has(toolId), false,
    "The tool is not registered (the killswitch disables it)");
  gDevTools.unregisterTool(toolId);

  gDevTools.destroy();
}

/**
* When a Toolbox is started it creates a DevToolInstance for each of the tools
* by calling toolDefinition.build(). The returned object should
* at least implement these functions. They will be used by the ToolBox.
*
* There may be no benefit in doing this as an abstract type, but if nothing
* else gives us a place to write documentation.
*/
function DevToolInstance(aTarget, aId) {
  this._target = aTarget;
  this._id = aId;
}

DevToolInstance.prototype = {
  /**
* Get the target of a Tool so we're debugging something different.
* TODO: Not sure about that. Maybe it's the ToolBox's job to destroy the tool
* and start it again with a new target.
* JOE: If we think that, does the same go for Toolbox? I'm leaning towards
* Keeping these in both cases. Either way I like symmetry.
* Certainly target should be read-only to the public or we could have
* one tool in a toolbox having a different target to the others
*/
  get target() {
    return this._target;
  },

  set target(aValue) {
    this._target = aValue;
  },

  /**
* Get the type of this tool.
* TODO: If this function isn't used then it should be removed
*/
  get id() {
    return this._id;
  },

  set id(aValue) {
    this._id = value;
  },

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
