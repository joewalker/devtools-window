/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const PROFILER_ENABLED = "devtools.profiler.enabled";

function loadTab(url, callback) {
  let tab = gBrowser.addTab();
  gBrowser.selectedTab = tab;
  content.location.assign(url);

  let browser = gBrowser.getBrowserForTab(tab);
  if (browser.contentDocument.readyState === "complete") {
    callback(tab, browser);
    return;
  }

  let onLoad = function onLoad() {
    browser.removeEventListener("load", onLoad, true);
    callback(tab, browser);
  };

  browser.addEventListener("load", onLoad, true);
}

function openProfiler(tab, callback) {
  gDevTools.openDefaultToolbox(tab, "jsprofiler");

  let tb = gDevTools.getToolboxForTarget(tab);
  tb.once("jsprofiler-ready", callback);
}

function closeProfiler(tab, callback) {
  let panel = gDevTools.getPanelForTarget("jsprofiler", tab);
  panel.once("destroyed", function () {
    executeSoon(callback);
  });

  gDevTools.closeToolbox(tab);
}

function setUp(url, callback=function(){}) {
  Services.prefs.setBoolPref(PROFILER_ENABLED, true);

  loadTab(url, function onTabLoad(tab, browser) {
    openProfiler(tab, function onProfilerOpen() {
      let panel = gDevTools.getPanelForTarget("jsprofiler", tab);
      callback(tab, browser, panel);
    });
  });
}

function tearDown(tab, callback=function(){}) {
  closeProfiler(tab, function onProfilerClose() {
    callback();

    while (gBrowser.tabs.length > 1) {
      gBrowser.removeCurrentTab();
    }

    finish();
    Services.prefs.setBoolPref(PROFILER_ENABLED, false);
  });
}
