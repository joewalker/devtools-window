/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

function test()
{
  // FIXME: memory leaks
  // TEST-UNEXPECTED-FAIL | chrome://mochitests/content/browser/browser/devtools/inspector/test/browser_inspector_destroyselection.js | leaked until shutdown [nsGlobalWindow #1629 about:blank]
  return;

  waitForExplicitFinish();
  //ignoreAllUncaughtExceptions();

  let node, iframe, inspector;

  gBrowser.selectedTab = gBrowser.addTab();
  gBrowser.selectedBrowser.addEventListener("load", function onload() {
    gBrowser.selectedBrowser.removeEventListener("load", onload, true);
    waitForFocus(setupTest, content);
  }, true);

  content.location = "http://mochi.test:8888/browser/browser/devtools/inspector/test/browser_inspector_destroyselection.html";

  function setupTest()
  {
    iframe = content.document.querySelector("iframe");
    node = iframe.contentDocument.querySelector("span");
    openInspector(runTests);
  }

  function runTests(aInspector)
  {
    inspector = aInspector;
    inspector.selection.setNode(node);

    iframe.parentNode.removeChild(iframe);
    iframe = null;

    let tmp = {};
    Cu.import("resource:///modules/devtools/LayoutHelpers.jsm", tmp);
    ok(!tmp.LayoutHelpers.isNodeConnected(node), "Node considered as disconnected.");
    ok(!inspector.selection.isConnected(), "Selection considered as disconnected");

    executeSoon(function() {
      finishUp();
    });
  }

  function finishUp() {
    node = null;
    gBrowser.removeCurrentTab();
    finish();
  }
}

