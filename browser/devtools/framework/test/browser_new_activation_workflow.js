/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests devtools API

const Cu = Components.utils;

let toolbox;

function test() {
  addTab("about:blank", function(aBrowser, aTab) {
    loadWebConsole(aTab);
  });
}

function loadWebConsole(aTab) {
  ok(gDevTools, "gDevTools exists");

  let target = {
    type: gDevTools.TargetType.TAB,
    value: gBrowser.selectedTab
  };
  toolbox = gDevTools.openToolbox(target, "bottom", "webconsole");
  toolbox.once("load", checkToolLoading);
}

function checkToolLoading() {
  is(toolbox.currentToolId, "webconsole", "The web console is selected");
  selectAndCheckById("jsdebugger");
  selectAndCheckById("styleeditor");
  testToggle();
}

function selectAndCheckById(id) {
  let doc = toolbox.frame.contentDocument;

  toolbox.selectTool(id);
  let tab = doc.getElementById("toolbox-tab-" + id);
  is(tab.selected, true, "The " + id + " tab is selected");
}

function testToggle() {
  toolbox.once("destroyed", function() {
    let target = {
      type: gDevTools.TargetType.TAB,
      value: gBrowser.selectedTab
    };
    toolbox = gDevTools.openToolbox(target, "bottom", "styleeditor");
    toolbox.once("load", checkStyleEditorLoaded);
  }.bind(this));

  gDevTools.toggleToolboxForTab(gBrowser.selectedTab);
}

function checkStyleEditorLoaded() {
  is(toolbox.currentToolId, "styleeditor", "The style editor is selected");
  finishUp();
}

function finishUp() {
  toolbox.destroy();
  toolbox = null;
  gBrowser.removeCurrentTab();
  finish();
}
