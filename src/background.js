var CurrentTabIndex = new Array();
var TabIdsInActivatedOrder = new Array();
var savedUrls = []; //need to be revorked - patch solution
var FromOnRemoved = 0;
var FromOnCreated = 0;
var FromPopupAttaching = 0;
var TabSwapMode = 0;
var ActiveWindowId = -1;
var LastActiveWindowId = -1;
var PopupWindowId = -1;
var ExternalFucusWindowId = -1;
var ExternalFucusDate = 0;
var PendingPopup = null;
var matchArray = null;

if (localStorage["foregroundNewTab"] == "true") {
  localStorage["newCreatedTab"] = "foreground";
}
localStorage["foregroundNewTab"] = undefined;

chrome.windows.getAll(
  {
    populate: false
  },
  function(windows) {
    for (var i = 0; i < windows.length; i++) {
      var windowId = windows[i].id;
      TabIdsInActivatedOrder[windowId] = new Array();
      if (windows[i].focused) {
        ActiveWindowId = windowId;
      }
      chrome.tabs.getSelected(windowId, function(tab) {
        CurrentTabIndex[tab.windowId] = tab.index;
        TabIdsInActivatedOrder[tab.windowId].push(tab.id);
      });
      chrome.storage.sync.get(["list"], function(items) {
        matchArray = items.list;
      });
    }
  }
);
async function writeAllTabUrlToConsole() {
  var tabs = null;
  try {
    // Get all the tabs
    tabs = await chrome.tabs.query({});
  } catch (err) {
    // Handle errors
  }
  return tabs;
}
function waitForTabLoad(loadingTabId) {
  return new Promise(function(resolve) {
    chrome.tabs.onUpdated.addListener(function _listener(tabId, info, tab) {
      if (loadingTabId == tabId && tab.status == "complete") {  
        savedUrls[tabId] = tab.url;  
        chrome.tabs.onUpdated.removeListener(_listener);
        resolve();
      }
    });
  });
}


async function doOnCreated(tab) {
  if (FromOnRemoved == 1) {
    FromOnRemoved = 0;
    TabSwapMode = 1;
    return;
  }
  var windowId;
  var index = -1;
  if (
    localStorage["AlwaysSameWindow"] == "true" &&
    tab.windowId == PopupWindowId &&
    ActiveWindowId > 0 &&
    !isExceptionUrl(tab.url, localStorage["AlwaysSameWindowException"])
  ) {
    windowId = ActiveWindowId;
    TabIdsInActivatedOrder[tab.windowId].push(tab.id);
    index = CurrentTabIndex[windowId] + 1;
  } else {
    windowId = tab.windowId;
  }
  PopupWindowId = -1;
  if (TabIdsInActivatedOrder[windowId].length == 0) {
    return;
  }
  var sw = null;
  chrome.storage.sync.get(["list"], function(items) {
    matchArray = items.list;
  });

  // Handle errors

  if (matchArray != null) {
    for (var i = 0; i < matchArray.length; i++) {
      if (
        tab.url.indexOf(matchArray[i].name) != -1 ||
        tab.pendingUrl.indexOf(matchArray[i].name) != -1
      ) {
        sw = matchArray[i].value;
      }
    }
  }
  if (sw == null) sw = localStorage["tabOpeningPosition"];

  switch (sw) {
    case "first":
      index = 0;
      break;
    case "last":
      index = 9999;
      break;
    case "right":
      index = CurrentTabIndex[windowId] + 1;
      break;
    case "left":
      index = CurrentTabIndex[windowId];
      break;
    case "default":
      break;
  }
  if (index != -1) {
    if (windowId == tab.windowId) {
      chrome.tabs.move(tab.id, {
        index: index
      });
    } else {
      if (tab.url == "") {
        PendingPopup = {
          tabId: tab.id,
          windowId: windowId,
          index: index
        };
        return;
      }
      chrome.tabs.move(tab.id, {
        windowId: windowId,
        index: index
      });
      FromPopupAttaching = 1;
      chrome.tabs.update(
        tab.id,
        {
          selected: true
        },
        function(tab) {
          FromPopupAttaching = 0;
        }
      );
    }
  }
  processNewTabActivation(tab, windowId);
}

chrome.tabs.onCreated.addListener(function(tab) {
  var url = "";
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    url = tabs[0].url;
  });
  waitForTabLoad(tab.id).then(doOnCreated(tab));
});


chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.url != null && PendingPopup && tab.id == PendingPopup.tabId) {
    if (!isExceptionUrl(tab.url, localStorage["AlwaysSameWindowException"])) {
      chrome.tabs.move(tab.id, {
        windowId: PendingPopup.windowId,
        index: PendingPopup.index
      });
      processNewTabActivation(tab, PendingPopup.windowId);
    } else {
    }
    PendingPopup = null;
  }
});
chrome.tabs.onRemoved.addListener(function(tabId) {
  FromOnRemoved = 1;
  chrome.windows.getCurrent(function(window) {
    updateActivedTabOnRemoved(window.id, tabId);
  });
});
chrome.tabs.onMoved.addListener(function(tabId, moveInfo) {
  chrome.tabs.getSelected(moveInfo.windowId, function(tab) {
    CurrentTabIndex[tab.windowId] = tab.index;
  });
});
chrome.tabs.onSelectionChanged.addListener(function(tabId, selectInfo) {
  if (FromOnCreated == 1) {
    FromOnCreated = 0;
    return;
  }
  if (FromOnRemoved == 1) {
    FromOnRemoved = 0;
    return;
  }
  if (FromPopupAttaching == 1) {
    FromPopupAttaching = 0;
    return;
  }
  updateActiveTabInfo(tabId);
});
chrome.tabs.onDetached.addListener(function(tabId, detachInfo) {
  FromOnRemoved = 1;
  updateActivedTabOnRemoved(detachInfo.oldWindowId, tabId);
});
chrome.windows.onCreated.addListener(function(window) {
  CurrentTabIndex[window.id] = 0;
  TabIdsInActivatedOrder[window.id] = new Array();
  if (window.type == "popup") {
    PopupWindowId = window.id;
    if (ActiveWindowId == window.id || !(ActiveWindowId > 0)) {
      ActiveWindowId = LastActiveWindowId;
      LastActiveWindowId = -1;
    }
  }
});
chrome.windows.onRemoved.addListener(function(windowId) {
  CurrentTabIndex[windowId] = undefined;
  delete TabIdsInActivatedOrder[windowId];
  if (windowId == ActiveWindowId) {
    ActiveWindowId = -1;
  }
});
chrome.windows.onFocusChanged.addListener(function(windowId) {
  if (ActiveWindowId > 0) {
    LastActiveWindowId = ActiveWindowId;
  }
  ActiveWindowId = windowId;
  if (ExternalFucusWindowId > 0) {
    var diff = new Date() - ExternalFucusDate;
    if (ExternalFucusWindowId == windowId && diff < 500) {
      chrome.windows.update(windowId, {
        focused: false
      });
    }
  }
});
chrome.webNavigation.onCommitted.addListener(function(details) {
  if (details.frameId != 0) {
    return;
  }
  if (
    localStorage["ExternalLinkDefault"] == "true" &&
    (details.transitionType == "start_page" ||
      details.transitionType == "auto_toplevel")
  ) {
    chrome.tabs.move(details.tabId, {
      index: 9999
    });
    chrome.tabs.update(details.tabId, {
      selected: true
    });
  }
  if (
    localStorage["ExternalLinkUnfocus"] == "true" &&
    (details.transitionType == "start_page" ||
      details.transitionType == "auto_toplevel")
  ) {
    chrome.tabs.get(details.tabId, function(tab) {
      ExternalFucusWindowId = tab.windowId;
      ExternalFucusDate = new Date();
      chrome.windows.update(tab.windowId, {
        focused: false
      });
    });
  }
});
function processNewTabActivation(tab, windowId) {
  switch (localStorage["newCreatedTab"]) {
    case "foreground":
      chrome.tabs.update(tab.id, {
        selected: true
      });
      break;
    case "background":
      if (tab.url.match(/^chrome/)) {
        break;
      }
      var activateTabId =
        TabIdsInActivatedOrder[windowId][
          TabIdsInActivatedOrder[windowId].length - 1
        ];
      if (activateTabId == undefined) {
        break;
      }
      FromOnCreated = 1;
      chrome.tabs.update(
        activateTabId,
        {
          selected: true
        },
        function(tab) {
          FromOnCreated = 0;
        }
      );
      break;
    default:
      if (PendingPopup && tab.id == PendingPopup.tabId) {
        chrome.tabs.update(tab.id, {
          selected: true
        });
      }
      break;
  }
}
function updateActiveTabInfo(tabId) {
  chrome.tabs.get(tabId, function(tab) {
    if (tab == undefined) return;
    var windowId = tab.windowId;
    CurrentTabIndex[windowId] = tab.index;
    if (TabIdsInActivatedOrder[windowId] == undefined) {
      TabIdsInActivatedOrder[windowId] = new Array();
    }
    if (
      TabIdsInActivatedOrder[windowId][
        TabIdsInActivatedOrder[windowId].length - 1
      ] != tabId
    ) {
      if (TabIdsInActivatedOrder[windowId].indexOf(tabId) != -1) {
        TabIdsInActivatedOrder[windowId].splice(
          TabIdsInActivatedOrder[windowId].indexOf(tabId),
          1
        );
      }
      TabIdsInActivatedOrder[windowId].push(tabId);
    }
  });
}

function updateActivedTabOnRemoved(windowId, tabId) {
  var activeTabRemoved;
  if (
    TabIdsInActivatedOrder[windowId][
      TabIdsInActivatedOrder[windowId].length - 1
    ] === tabId
  ) {
    activeTabRemoved = true;
  } else {
    activeTabRemoved = false;
  }
  if (TabIdsInActivatedOrder[windowId].indexOf(tabId) != -1) {
    TabIdsInActivatedOrder[windowId].splice(
      TabIdsInActivatedOrder[windowId].indexOf(tabId),
      1
    );
  }
  FromOnRemoved = 0;
  if (!activeTabRemoved) {
    chrome.tabs.getSelected(windowId, function(tab) {
      if (tab == undefined) return;
      CurrentTabIndex[windowId] = tab.index;
    });
    return;
  }
  if (TabSwapMode == 1) {
    TabSwapMode = 0;
    return;
  }
  var sw = null;

  // Handle errors and match of closing
if(matchArray != null){
  if (matchArray != null || savedUrls[tabId] != null) {
    for (var i = 0; i < matchArray.length; i++) {
      
      if (savedUrls[tabId].indexOf(matchArray[i].name) != -1
      ) {
        sw = matchArray[i].closing;
      }
    }
  }
}
  if (sw == null) sw = localStorage["tabClosingBehavior"];
  switch (sw) {
    case "default":
      chrome.tabs.getSelected(windowId, function(tab) {
        updateActiveTabInfo(tab.id);
      });
      break;
    case "first":
      activateTabByIndex(windowId, 0); 
      break;
    case "last":
      activateTabByIndex(windowId, 9999); 
      break;
    case "right":
      activateTabByIndex(windowId, CurrentTabIndex[windowId]);
      break;
    case "left":
      activateTabByIndex(windowId, CurrentTabIndex[windowId] - 1);
      break;
    case "order":
      var activateTabId =
        TabIdsInActivatedOrder[windowId][
          TabIdsInActivatedOrder[windowId].length - 1
        ];
        chrome.tabs.update(activateTabId, {
          selected: true
        });
        updateActiveTabInfo(activateTabId);
      break;
     default:
      chrome.tabs.getSelected(windowId, function(tab) {
        updateActiveTabInfo(tab.id);
      });
      break;
  }
}
function activateTabByIndex(windowId, tabIndex) {
  chrome.windows.getAll(
    {
      populate: true
    },
    function(windows) {
      for (var i = 0; i < windows.length; i++) {
        if (windows[i].id == windowId) {
          var tabs = windows[i].tabs;
          if (tabs.length == 0) {
            break;
          }
          var tab;
          if (tabs.length - 1 <= tabIndex) {
            tab = tabs[tabs.length - 1];
          } else {
            tab = tabs[tabIndex] || tabs[0];
          }
          chrome.tabs.update(tab.id, {
            selected: true,
          });
          updateActiveTabInfo(tab.id);
          break;
        }
      }
    }
  );
}
function isExceptionUrl(url, exceptionString) {
  var exceptions = exceptionString.split("\n");
  for (var i = 0; i < exceptions.length - 1; i++) {
    var re = new RegExp(exceptions[i]);
    if (url.search(re) != -1) {
      return true;
    }
  }
  return false;
}

function lastTab(info,tab) {
  var windowId = tab.windowId;

  var activateTabId =
        TabIdsInActivatedOrder[windowId][
          TabIdsInActivatedOrder[windowId].length - 2
        ];
      chrome.tabs.update(activateTabId, {
        selected: true
      });
      waitforUpdate(activateTabId).then(updateActiveTabInfo(activateTabId));
  }
  
      chrome.contextMenus.create({
        title: "Last Tab", 
        contexts:["page"], 
        onclick: lastTab
      });
  