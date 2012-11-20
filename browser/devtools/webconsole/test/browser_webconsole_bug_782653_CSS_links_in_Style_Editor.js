/* vim:set ts=2 sw=2 sts=2 et: */
/* ***** BEGIN LICENSE BLOCK *****
 * Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 * ***** END LICENSE BLOCK ***** */

const TEST_URI = "http://example.com/browser/browser/devtools/webconsole/test" +
                 "/test-bug-782653-css-errors.html";

let nodes, hud, SEC;

function test()
{
  addTab(TEST_URI);
  browser.addEventListener("load", function onLoad() {
    browser.removeEventListener("load", onLoad, true);
    openConsole(null, testViewSource);
  }, true);
}

function testViewSource(aHud)
{
  hud = aHud;

  registerCleanupFunction(function() {
    nodes = hud = SEC = null;
  });

  waitForSuccess({
    name: "find the location node",
    validatorFn: function()
    {
      return hud.outputNode.querySelector(".webconsole-location");
    },
    successFn: function()
    {
      nodes = hud.outputNode.querySelectorAll(".webconsole-location");

      let target = TargetFactory.forTab(gBrowser.selectedTab);
      let toolbox = gDevTools.getToolboxForTarget(target);
      toolbox.once("styleeditor-selected", onStyleEditorReady);

      EventUtils.sendMouseEvent({ type: "click" }, nodes[0]);
    },
    failureFn: finishTest,
  });
}

function onStyleEditorReady(aEvent, aPanel)
{
  info(aEvent + " event fired");

  SEC = aPanel.styleEditorChrome;
  let win = aPanel.panelWindow;
  ok(win, "Style Editor Window is defined");
  ok(SEC, "Style Editor Chrome is defined");

  waitForFocus(function() {
    info("style editor window focused");
    checkStyleEditorForSheetAndLine(0, 7, function() {
      info("first check done");
      let target = TargetFactory.forTab(gBrowser.selectedTab);
      let toolbox = gDevTools.getToolboxForTarget(target);
      toolbox.once("webconsole-selected", function(aEvent) {
        info(aEvent + " event fired");
        toolbox.once("styleeditor-selected", function() {
          info(aEvent + " event fired");
          checkStyleEditorForSheetAndLine(1, 6, function() {
            info("second check done");
            finishTest();
          });
        });

        EventUtils.sendMouseEvent({ type: "click" }, nodes[1]);
      });
      toolbox.selectTool("webconsole");
    });
  }, win);
}

function checkStyleEditorForSheetAndLine(aStyleSheetIndex, aLine, aCallback)
{
  let foundEditor = null;
  waitForSuccess({
    name: "style editor for stylesheet index",
    validatorFn: function()
    {
      for (let editor of SEC.editors) {
        if (editor.styleSheetIndex == aStyleSheetIndex) {
          foundEditor = editor;
          return true;
        }
      }
      return false;
    },
    successFn: function()
    {
      performLineCheck(foundEditor, aLine, aCallback);
    },
    failureFn: finishTest,
  });
}

function performLineCheck(aEditor, aLine, aCallback)
{
  function checkForCorrectState()
  {
    is(aEditor.sourceEditor.getCaretPosition().line, aLine,
       "correct line is selected");
    is(SEC.selectedStyleSheetIndex, aEditor.styleSheetIndex,
       "correct stylesheet is selected in the editor");

    aCallback && executeSoon(aCallback);
  }

  waitForSuccess({
    name: "source editor load",
    validatorFn: function()
    {
      return aEditor.sourceEditor;
    },
    successFn: checkForCorrectState,
    failureFn: finishTest,
  });
}
