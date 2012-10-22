/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const URL = "data:text/html;charset=utf8,<p>JavaScript Profiler test</p>";

let gTab, gPanel;

function test() {
  waitForExplicitFinish();

  setUp(URL, function onSetUp(tab, browser, panel) {
    gTab = tab;
    gPanel = panel;

    Services.obs.addObserver(onStart, "jsprofiler-started", false);
    Services.obs.addObserver(onStop, "jsprofiler-stopped", false);

    testUI();
  });
}

function testUI() {
  ok(gPanel, "Profiler panel exists");

  let toggle = gPanel.document.getElementById("profiler-toggle");
  ok(toggle, "Toggle button exists");
  ok(toggle.getAttribute("label") == "Start", "Toggle button says 'Start'");
  ok(!toggle.hasAttribute("disabled"), "Toggle button is enabled");

  toggle.click();
}

function onStart() {
  Services.obs.removeObserver(onStart, "jsprofiler-started");

  let toggle = gPanel.document.getElementById("profiler-toggle");
  ok(toggle.getAttribute("label") == "Stop", "Toggle button says 'Stop'");

  gPanel.controller.isActive(function (err, isActive) {
    ok(isActive, "Profiler is running");

    toggle.click();
  });
}

function onStop() {
  Services.obs.removeObserver(onStop, "jsprofiler-stopped");

  let toggle = gPanel.document.getElementById("profiler-toggle");
  ok(toggle.getAttribute("label") == "Start", "Toggle button says 'Start' again");

  gPanel.controller.isActive(function (err, isActive) {
    ok(!isActive, "Profiler is idle");

    tearDown(gTab, function onTearDown() {
      let panel = gDevTools.getPanelForTarget("jsprofiler", gTab);
      ok(!panel, "JS Profiler is destroyed");

      gPanel = null;
      gTab = null;
    });
  });
}
