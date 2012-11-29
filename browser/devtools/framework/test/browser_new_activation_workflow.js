/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests devtools API

const Cu = Components.utils;

let toolbox, target;

let tempScope = {};
Cu.import("resource:///modules/devtools/Target.jsm", tempScope);
let TargetFactory = tempScope.TargetFactory;

function test() {
  addTab("about:blank", function(aBrowser, aTab) {
    loadWebConsole(aTab);
    target = TargetFactory.forTab(gBrowser.selectedTab);
  });
}

function loadWebConsole(aTab) {
  ok(gDevTools, "gDevTools exists");

  gDevTools.showToolbox(target, "webconsole").then(checkToolLoading);
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
    gDevTools.showToolbox(target, "styleeditor").then(function() {
      is(toolbox.currentToolId, "styleeditor", "The style editor is selected");
      finishUp();
    });
  }.bind(this));

  toolbox.destroy();
}

function finishUp() {
  toolbox.destroy();
  toolbox = null;
  target = null;
  gBrowser.removeCurrentTab();
  finish();
}
