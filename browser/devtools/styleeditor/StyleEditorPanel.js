Components.utils.import("resource:///modules/devtools/StyleEditorChrome.jsm");

// DevTools Panel API:

window.init = function(aContentWindow) {
  let chromeRoot = document.getElementById("style-editor-chrome");
  let chrome = new StyleEditorChrome(chromeRoot, aContentWindow);
  window.styleEditorChrome = chrome;
}

window.destroy = function() {
  // FIXME
}

// StyleEditor Specific Public API:

window.selectStyleSheet = function(aStyleSheet, aLine, aCol) {
  // FIXME
}
