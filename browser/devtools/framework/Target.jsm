/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

this.EXPORTED_SYMBOLS = [ "TargetFactory" ];

const Cu = Components.utils;
const Ci = Components.interfaces;
Cu.import("resource:///modules/devtools/EventEmitter.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");


/**
 * Functions for creating Targets
 */
this.TargetFactory = {
  /**
   * Construct a Target
   * @param {XULTab} tab
   *        The tab to use in creating a new target
   * @return A target object
   */
  forTab: function TF_forTab(tab) {
    return new TabTarget(tab);
  },

  /**
   * Construct a Target
   * @param {nsIDOMWindow} window
   *        The chromeWindow to use in creating a new target
   * @return A target object
   */
  forWindow: function TF_forWindow(window) {
    return new WindowTarget(window);
  },

  /**
   * Construct a Target for a remote global
   * @param {FIXME} actor
   *        The connection to a remote mozilla instance
   * @return A target object
   */
  forRemote: function TF_forRemote(actor) {
    return new RemoteTarget(actor);
  },

  /**
   * Get all of the targets known to some browser instance (local if null)
   * @return An array of target objects
   */
  allTargets: function TF_allTargets() {
    let windows = [];
    let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                       .getService(Components.interfaces.nsIWindowMediator);
    let en = wm.getXULWindowEnumerator(null);
    while (en.hasMoreElements()) {
      windows.push(en.getNext());
    }

    return windows.map(function(window) {
      return TargetFactory.forWindow(window);
    });
  },
};

/**
 * The 'version' property allows the developer tools equivalent of browser
 * detection. Browser detection is evil, however while we don't know what we
 * will need to detect in the future, it is an easy way to postpone work.
 * We should be looking to use 'supports()' in place of version where
 * possible.
 */
function getVersion() {
  // FIXME: return something better
  return 20;
}

/**
 * A better way to support feature detection, but we're not yet at a place
 * where we have the features well enough defined for this to make lots of
 * sense.
 */
function supports(feature) {
  // FIXME: return something better
  return false;
};

/**
 * A Target represents something that we can debug. Targets are generally
 * read-only. Any changes that you wish to make to a target should be done via
 * a Tool that attaches to the target. i.e. a Target is just a pointer saying
 * "the thing to debug is over there".
 *
 * Providing a generalized abstraction of a web-page or web-browser (available
 * either locally or remotely) is beyond the scope of this class (and maybe
 * also beyond the scope of this universe) However Target does attempt to
 * abstract some common events and read-only properties common to many Tools.
 *
 * Supported read-only properties:
 * - name, isRemote, url
 *
 * Target extends EventEmitter and provides support for the following events:
 * - close: The target window has been closed. All tools attached to this
 *     target should close. This event is not currently cancelable.
 * - navigate: The target window has navigated to a different URL
 *
 * Optional events:
 * - will-navigate: The target window will navigate to a different URL
 * - hidden: The target is not visible anymore (for TargetTab, another tab is selected)
 * - visible: The target is visible (for TargetTab, tab is selected)
 *
 * Target also supports 2 functions to help allow 2 different versions of
 * Firefox debug each other. The 'version' property is the equivalent of
 * browser detection - simple and easy to implement but gets fragile when things
 * are not quite what they seem. The 'supports' property is the equivalent of
 * feature detection - harder to setup, but more robust long-term.
 *
 * Comparing Targets: 2 instances of a Target object can point at the same
 * thing, so t1 !== t2 and t1 != t2 even when they represent the same object.
 * To compare to targets use 't1.equals(t2)'.
 */
function Target() {
  throw new Error("Use TargetFactory.newXXX or Target.getXXX to create a Target in place of 'new Target()'");
}

Object.defineProperty(Target.prototype, "version", {
  get: getVersion,
  enumerable: true
});


/**
 * A TabTarget represents a page living in a browser tab. Generally these will
 * be web pages served over http(s), but they don't have to be.
 */
function TabTarget(tab) {
  new EventEmitter(this);
  this._tab = tab;
  this._setupListeners();
}

TabTarget.prototype = {
  supports: supports,
  get version() { return getVersion(); },

  get tab() {
    return this._tab;
  },

  get name() {
    return this._tab.linkedBrowser.contentDocument.title;
  },

  get url() {
    return this._tab.linkedBrowser.contentDocument.location.href;
  },

  get remote() {
    return false;
  },

  /**
   * Listen to the different tabs events.
   */
  _setupListeners: function TabTarget__setupListeners() {
    this._webProgressListener.target = this;
    this.tab.linkedBrowser.addProgressListener(this._webProgressListener);
    this.tab.addEventListener("TabClose", this);
    this.tab.parentNode.addEventListener("TabSelect", this);
  },

  /**
   * Handle tabs events.
   */
  handleEvent: function (event) {
    switch (event.type) {
      case "TabClose":
        this.destroy();
        break;
      case "TabSelect":
        if (this.tab.selected) {
          this.emit("visible", event);
        } else {
          this.emit("hidden", event);
        }
        break;
    }
  },

  /**
   * Handle webProgress events.
   */
  _webProgressListener: {
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIWebProgressListener, Ci.nsISupportsWeakReference]),
    onProgressChange: function() {},
    onStateChange: function(aProgress, aRequest, aFlag, aStatus) {
      let isStart = aFlag & Ci.nsIWebProgressListener.STATE_START;
      let isDocument = aFlag & Ci.nsIWebProgressListener.STATE_IS_DOCUMENT;
      let isNetwork = aFlag & Ci.nsIWebProgressListener.STATE_IS_NETWORK;
      let isRequest = aFlag & Ci.nsIWebProgressListener.STATE_IS_REQUEST;

      // Skip non-interesting states.
      if (!isStart || !isDocument || !isRequest || !isNetwork) {
        return;
      }

      if (this.target) {
        this.target.emit("will-navigate", aRequest);
      }
    },
    onSecurityChange: function() {},
    onStatusChange: function() {},
    onLocationChange: function(webProgress){
      let window = webProgress.DOMWindow;
      if (this.target) {
        this.target.emit("navigate", window);
      }
    },
  },

  /**
   * Target is not alive anymore.
   */
  destroy: function() {
    if (this._destroyed) {
      return;
    }
    this.tab.linkedBrowser.removeProgressListener(this._webProgressListener)
    this._webProgressListener.target = null;
    this.tab.removeEventListener("TabClose", this);
    this.tab.parentNode.removeEventListener("TabSelect", this);
    this._tab = null;
    this._destroyed = true;
    this.emit("close");
  },
};


/**
 * A WindowTarget represents a page living in a xul window or panel. Generally
 * these will have a chrome: URL
 */
function WindowTarget(window) {
  new EventEmitter(this);
  this._window = window;
}

WindowTarget.prototype = {
  supports: supports,
  get version() { return getVersion(); },

  get window() {
    return this._window;
  },

  get name() {
    return this._window.document.title;
  },

  get url() {
    return this._window.document.location.href;
  },

  get remote() {
    return false;
  },
};

/**
 * A RemoteTarget represents a page living in a remote Firefox instance.
 */
function RemoteTarget(actor) {
  new EventEmitter(this);
  this._actor = actor;
}

RemoteTarget.prototype = {
  supports: supports,
  get version() { return getVersion(); },

  get actor() {
    return this._actor;
  },

  get name() {
    throw new Error("FIXME: implement");
  },

  get url() {
    throw new Error("FIXME: implement");
  },

  get remote() {
    return true;
  },
};
