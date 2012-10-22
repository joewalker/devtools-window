/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

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
  function onOpen(subject, topic) {
    Services.obs.removeObserver(onOpen, "jsprofiler-created");
    executeSoon(callback);
  }

  Services.obs.addObserver(onOpen, "jsprofiler-created", false);
  gDevTools.openDefaultToolbox(tab, "jsprofiler");
}

function closeProfiler(tab, callback) {
  function onClose(subhect, topic) {
    Services.obs.removeObserver(onClose, "jsprofiler-destroyed");
    executeSoon(callback);
  }

  Services.obs.addObserver(onClose, "jsprofiler-destroyed", false);
  gDevTools.closeToolbox(tab);
}

function setUp(url, callback=function(){}) {
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
  });
}
