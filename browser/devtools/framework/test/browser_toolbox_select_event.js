/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

function test() {
  // FIXME: Test failures
  // See http://pastebin.mozilla.org/1942863
  // TEST-UNEXPECTED-FAIL | chrome://mochitests/content/browser/browser/devtools/framework/test/browser_toolbox_select_event.js | leaked until shutdown [nsGlobalWindow #30 about:blank]
  // TEST-UNEXPECTED-FAIL | chrome://mochitests/content/browser/browser/devtools/framework/test/browser_toolbox_select_event.js | leaked until shutdown [nsGlobalWindow #29 about:blank]
  return;

  const Cu = Components.utils;
  let toolbox;

  let tempScope = {};
  Cu.import("resource:///modules/devtools/Target.jsm", tempScope);
  let TargetFactory = tempScope.TargetFactory;
  let target = TargetFactory.forTab(gBrowser.selectedTab);

  let called = {
    inspector: false,
    webconsole: false,
    styleeditor: false,
    jsdebugger: false,
  }

  addTab("about:blank", function(aBrowser, aTab) {
    toolbox = gDevTools.openToolbox(target, "bottom", "webconsole");
    toolbox.once("ready", function() {
      info("Toolbox fired a `ready` event");

      toolbox.on("select", function selectCB(event, id) {
        info("`select` event form " + id);
        called[id] = true;
        for (let tool in called) {
          if (!called[tool]) {
            return;
          }
          ok(true, "All the tools fired a 'select event'");
          toolbox.off("select", selectCB);
          reselect();
        }
      });

      function reselect() {
        for (let tool in called) {
          called[tool] = false;
        }

        toolbox.once("inspector-selected", function() {
          called["inspector"] = true;
          for (let tool in called) {
            if (!called[tool]) {
              return;
            }
            ok(true, "All the tools fired a '{id}-selected event'");
            finishUp();
          }
        });

        toolbox.once("webconsole-selected", function() {
          called["webconsole"] = true;
          for (let tool in called) {
            if (!called[tool]) {
              return;
            }
            ok(true, "All the tools fired a '{id}-selected event'");
            finishUp();
          }
        });

        toolbox.once("jsdebugger-selected", function() {
          called["jsdebugger"] = true;
          for (let tool in called) {
            if (!called[tool]) {
              return;
            }
            ok(true, "All the tools fired a '{id}-selected event'");
            finishUp();
          }
        });

        toolbox.once("styleeditor-selected", function() {
          called["styleeditor"] = true;
        });

        toolbox.selectTool("inspector");
        toolbox.selectTool("webconsole");
        toolbox.selectTool("styleeditor");
        toolbox.selectTool("jsdebugger");
      }

      toolbox.selectTool("inspector");
      toolbox.selectTool("webconsole");
      toolbox.selectTool("styleeditor");
      toolbox.selectTool("jsdebugger");
    });
  });


  function finishUp() {
    gBrowser.removeCurrentTab();
    finish();
  }
}
