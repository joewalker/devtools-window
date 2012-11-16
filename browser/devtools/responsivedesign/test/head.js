/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let tempScope = {};
Cu.import("resource:///modules/devtools/Target.jsm", tempScope);
let TargetFactory = tempScope.TargetFactory;

// Import the GCLI test helper
let testDir = gTestPath.substr(0, gTestPath.lastIndexOf("/"));
Services.scriptloader.loadSubScript(testDir + "/helpers.js", this);

function openInspector(callback)
{
  let tab = gBrowser.selectedTab;
  let target = TargetFactory.forTab(tab);

  let inspector = gDevTools.getPanelForTarget("inspector", tab);
  if (inspector && inspector.isReady) {
    callback(inspector);
  } else {
    let toolbox = gDevTools.openToolboxForTab(target, "inspector");
    toolbox.once("inspector-ready", function(event, panel) {
      let inspector = gDevTools.getPanelForTarget("inspector", tab);
      callback(inspector);
    });
  }
}

