/* vim: set ts=2 et sw=2 tw=80: */
/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

let tempScope = {};
Cu.import("resource:///modules/devtools/Target.jsm", tempScope);
let TargetFactory = tempScope.TargetFactory;

function test()
{
  waitForExplicitFinish();

  gBrowser.selectedTab = gBrowser.addTab();
  let target = TargetFactory.forTab(gBrowser.selectedTab);

  gBrowser.selectedBrowser.addEventListener("load", function onLoad(evt) {
    gBrowser.selectedBrowser.removeEventListener(evt.type, onLoad, true);
    gDevTools.showToolbox(target).then(testReady);
  }, true);

  content.location = "data:text/html,test for dynamically registering and unregistering tools";
}

function testReady(toolbox)
{
  ok(toolbox.isReady, "toolbox isReady is set");
  cleanup(toolbox);
}

function cleanup(toolbox)
{
  toolbox.destroy();
  gBrowser.removeCurrentTab();
  finish();
}
