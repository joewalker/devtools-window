/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const TEST_BASE = "chrome://mochitests/content/browser/browser/devtools/styleeditor/test/";
const TEST_BASE_HTTP = "http://example.com/browser/browser/devtools/styleeditor/test/";
const TEST_BASE_HTTPS = "https://example.com/browser/browser/devtools/styleeditor/test/";

let gChromeWindow;               //StyleEditorChrome window

// Import the GCLI test helper
let testDir = gTestPath.substr(0, gTestPath.lastIndexOf("/"));
Services.scriptloader.loadSubScript(testDir + "/helpers.js", this);

function cleanup()
{
  gChromeWindow = null;
  while (gBrowser.tabs.length > 1) {
    gBrowser.removeCurrentTab();
  }
}

function launchStyleEditorChrome(aCallback, aSheet, aLine, aCol)
{
  let tab = gBrowser.selectedTab;
  let panel = gDevTools.getPanelForTarget("styleeditor", tab);
  if (panel && panel.isReady) {
    gChromeWindow = panel._panelWin;
    gChromeWindow.styleEditorChrome._alwaysDisableAnimations = true;
    panel.selectStyleSheet(aSheet, aLine, aCol);
    aCallback(gChromeWindow.styleEditorChrome);
  } else {
    let toolbox = gDevTools.openToolboxForTab(tab, "styleeditor");
    toolbox.once("styleeditor-ready", function(event, panel) {
      gChromeWindow = panel._panelWin;
      gChromeWindow.styleEditorChrome._alwaysDisableAnimations = true;
      panel.selectStyleSheet(aSheet, aLine, aCol);
      aCallback(gChromeWindow.styleEditorChrome);
    });
  }
}

function addTabAndLaunchStyleEditorChromeWhenLoaded(aCallback, aSheet, aLine, aCol)
{
  gBrowser.selectedTab = gBrowser.addTab();
  gBrowser.selectedBrowser.addEventListener("load", function onLoad() {
    gBrowser.selectedBrowser.removeEventListener("load", onLoad, true);
    launchStyleEditorChrome(aCallback, aSheet, aLine, aCol);
  }, true);
}

registerCleanupFunction(cleanup);
