/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const URL = "data:text/html;charset=utf8,<p>JavaScript Profiler test</p>";

function test() {
  waitForExplicitFinish();

  setUp(URL, function onSetUp(tab, browser, panel) {
    ok(panel, "JS Profiler exists and active");

    tearDown(tab, function onTearDown() {
      let panel = gDevTools.getPanelForTarget("jsprofiler", tab);
      ok(!panel, "JS Profiler is destroyed");
    });
  });
}
