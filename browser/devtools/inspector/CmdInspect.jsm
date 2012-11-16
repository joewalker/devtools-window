/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
this.EXPORTED_SYMBOLS = [ ];

Cu.import("resource:///modules/devtools/gcli.jsm");
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, "gDevTools",
                                  "resource:///modules/devtools/gDevTools.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "TargetFactory",
                                  "resource:///modules/devtools/Target.jsm");

/**
 * 'inspect' command
 */
gcli.addCommand({
  name: "inspect",
  description: gcli.lookup("inspectDesc"),
  manual: gcli.lookup("inspectManual"),
  params: [
    {
      name: "selector",
      type: "node",
      description: gcli.lookup("inspectNodeDesc"),
      manual: gcli.lookup("inspectNodeManual")
    }
  ],
  exec: function Command_inspect(args, context) {
    let browserDoc = context.environment.chromeDocument;
    let browserWindow = browserDoc.defaultView;
    let tab = browserWindow.gBrowser.selectedTab;
    let target = TargetFactory.forTab(tab);

    let node = args.selector;

    let inspector = gDevTools.getPanelForTarget("inspector", tab);
    if (inspector && inspector.isReady) {
      inspector.selection.setNode(node, "gcli");
    } else {
      let toolbox = gDevTools.openToolboxForTab(target, "inspector");
      toolbox.once("inspector-ready", function(event, panel) {
        let inspector = gDevTools.getPanelForTarget("inspector", tab);
        inspector.selection.setNode(node, "gcli");
      }.bind(this));
    }
  }
});
