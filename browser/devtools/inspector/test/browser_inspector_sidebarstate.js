/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

let doc;
let inspector;

function createDocument()
{
  doc.body.innerHTML = '<h1>Sidebar state test</h1>';
  doc.title = "Sidebar State Test";

  openInspector(function(panel) {
    inspector = panel;
    inspector.sidebar.select("ruleview");
    inspectorRuleViewOpened();
  });
}

function inspectorRuleViewOpened()
{
  is(inspector.sidebar.getCurrentTabID(), "ruleview", "Rule View is selected by default");

  // Select the computed view and turn off the inspector.
  inspector.sidebar.select("computedview");

  gDevTools.once("toolbox-destroyed", inspectorClosed);
  let toolbox = gDevTools.getToolboxForTarget(gBrowser.selectedTab);
  executeSoon(function() {
    toolbox.destroy();
  });
}

function inspectorClosed()
{
  Services.obs.addObserver(computedViewPopulated,
    "StyleInspector-populated", false);

  openInspector(function(panel) {
    inspector = panel;
  });
}

function computedViewPopulated()
{
  Services.obs.removeObserver(computedViewPopulated,
    "StyleInspector-populated");
  is(inspector.sidebar.getCurrentTabID(), "computedview", "Computed view is selected by default.");

  finishTest();
}


function finishTest()
{
  gBrowser.removeCurrentTab();
  finish();
}

function test()
{
  waitForExplicitFinish();
  gBrowser.selectedTab = gBrowser.addTab();
  gBrowser.selectedBrowser.addEventListener("load", function() {
    gBrowser.selectedBrowser.removeEventListener("load", arguments.callee, true);
    doc = content.document;
    waitForFocus(createDocument, content);
  }, true);

  content.location = "data:text/html,basic tests for inspector";
}
