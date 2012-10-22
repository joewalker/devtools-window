/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const URL = "data:text/html;charset=utf8,<p>JavaScript Profiler test</p>";

function test() {
  waitForExplicitFinish();

  setUp(URL, function onSetUp(tab, browser, panel) {
    ok(panel, "JS Profiler exists and active");

    testUI(tab, browser, panel);

    tearDown(tab, function onTearDown() {
      let panel = gDevTools.getPanelForTarget("jsprofiler", tab);
      ok(!panel, "JS Profiler is destroyed");
    });
  });
}

function testUI(tab, browser, panel) {
  let toggle = panel.document.getElementById("profiler-toggle");

  ok(toggle, "Toggle button exists");
  ok(!toggle.hasAttribute("disabled"), "Toggle button is enabled");
}
