/* vim: set ts=2 et sw=2 tw=80: */
/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

function test()
{
  waitForExplicitFinish();

  Cu.import("resource:///modules/devtools/Target.jsm", this);

  gBrowser.selectedTab = gBrowser.addTab();
  gBrowser.selectedBrowser.addEventListener("load", function onLoad(evt) {
    gBrowser.selectedBrowser.removeEventListener(evt.type, onLoad, true);

    let target = TargetFactory.forTab(gBrowser.selectedTab);

    is(target.tab, gBrowser.selectedTab, "Target linked to the right tab.");

    target.once("hidden", function() {
      ok(true, "Hidden event received");
      target.once("visible", function() {
        ok(true, "Visible event received");
        target.once("will-navigate", function(event, request) {
          ok(true, "will-navigate event received");
          target.once("navigate", function() {
            ok(true, "navigate event received");
            target.once("close", function() {
              ok(true, "close event received");
              ok(!target.tab, "tab is null");
              finish();
            });
            gBrowser.removeCurrentTab();
          });
        });
        gBrowser.contentWindow.location = "about:config";
      });
      gBrowser.removeCurrentTab();
    });
    gBrowser.selectedTab = gBrowser.addTab();
  }, true);
}
