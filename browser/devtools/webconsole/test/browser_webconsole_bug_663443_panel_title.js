/* vim:set ts=2 sw=2 sts=2 et: */
/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const TEST_URI = "data:text/html;charset=utf-8,<p>test for bug 663443. test1";

function consoleOpened() {
  document.removeEventListener("popupshown", consoleOpened, false);

  let HUD = HUDService.getHudByWindow(content);
  is(HUD.ui.contentLocation, "FIXME", "Web Console opened in a panel");

  let waitForTitleChange = {
    name: "panel title change",
    validatorFn: function() {
      dump("waitForTitleChange HUD.ui.contentLocation=" + HUD.ui.contentLocation + "\n");
      return HUD.ui.contentLocation == "FIXME";
    },
    successFn: testEnd,
    failureFn: testEnd,
  };

  waitForSuccess({
    name: "initial panel title",
    validatorFn: function() {
      dump("initial panel title HUD.ui.contentLocation=" + HUD.ui.contentLocation + "\n");
      return HUD.ui.contentLocation == "FIXME";
    },
    successFn: function() {
      content.location = "data:text/html;charset=utf-8,<p>test2 for bug 663443";
      waitForSuccess(waitForTitleChange);
    },
    failureFn: testEnd,
  });
}

function testEnd() {
  closeConsole(null, finishTest);
}

function test() {
  addTab(TEST_URI);
  browser.addEventListener("load", function onLoad() {
    browser.removeEventListener("load", onLoad, true);

    document.addEventListener("popupshown", consoleOpened, false);

    openConsole();
  }, true);
}
