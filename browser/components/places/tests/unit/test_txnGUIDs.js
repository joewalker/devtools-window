/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *  vim: sw=2 ts=2 et lcs=trail\:.,tab\:>~ :
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Marco Bonardo <mak77@bonardo.net>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * This test will ensure any transactions service that is going to create
 * a new item, won't replace the GUID when undoing and redoing the action.
 */
var bmsvc = PlacesUtils.bookmarks;
var txnsvc = PlacesUIUtils.ptm;

function test_GUID_persistance(aTxn) {
  aTxn.doTransaction();
  var itemId = bmsvc.getIdForItemAt(bmsvc.unfiledBookmarksFolder, 0);
  var GUID = bmsvc.getItemGUID(itemId);
  aTxn.undoTransaction();
  aTxn.redoTransaction();
  do_check_eq(GUID, bmsvc.getItemGUID(itemId));
  aTxn.undoTransaction();
}

function run_test() {
  // Create folder.
  var createFolderTxn = txnsvc.createFolder("Test folder",
                                            bmsvc.unfiledBookmarksFolder,
                                            bmsvc.DEFAULT_INDEX);
  test_GUID_persistance(createFolderTxn);

  // Create bookmark.
  var createBookmarkTxn = txnsvc.createItem(uri("http://www.example.com"),
                                            bmsvc.unfiledBookmarksFolder,
                                            bmsvc.DEFAULT_INDEX,
                                            "Test bookmark");
  test_GUID_persistance(createBookmarkTxn);

  // Create separator.
  var createSeparatorTxn = txnsvc.createSeparator(bmsvc.unfiledBookmarksFolder,
                                                  bmsvc.DEFAULT_INDEX);
  test_GUID_persistance(createFolderTxn);

  // Create livemark.
  var createLivemarkTxn = txnsvc.createLivemark(uri("http://feeduri.com"),
                                               uri("http://siteuri.com"),
                                               "Test livemark",
                                               bmsvc.unfiledBookmarksFolder,
                                               bmsvc.DEFAULT_INDEX);
  test_GUID_persistance(createLivemarkTxn);

  // Tag URI.
  var tagURITxn = txnsvc.tagURI(uri("http://www.example.com"), ["foo"]);
  test_GUID_persistance(tagURITxn);
}
