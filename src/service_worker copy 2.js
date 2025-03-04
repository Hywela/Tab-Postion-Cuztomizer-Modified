var CurrentTabIndex = {};
var TabIdsInActivatedOrder = {};
var savedUrls = {};
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
var newTabinProcess = false;

let storageData = chrome.storage.sync.get([
  "AlwaysSameWindow", "AlwaysSameWindowException",
  "tabOpeningPosition", "tabClosingBehavior", "list", "newCreatedTab", "button_last_tab","foregroundNewTab",
  "ExternalLinkDefault",
  "ExternalLinkUnfocus"
]);


const ChromeWrapper = {
  chromeTabsQuery: function (params, callback) {
    chrome.tabs.query(params, tabs => {
      if (chrome.runtime.lastError) {
        setTimeout(function () {
          //console.warn("Patch for xchrome.tabs.query (Chrome 91).");
          ChromeWrapper.chromeTabsQuery(params, callback)
        }, 100); // arbitrary delay
      } else {
        callback(tabs)
      }
    })
  }
}

if (storageData.foregroundNewTab == "true") {
  storageData.newCreatedTab = "foreground";
}
storageData.foregroundNewTab = undefined;

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
      
      ChromeWrapper.chromeTabsQuery({ windowId:windowId }, function(tabs) {
        CurrentTabIndex[tabs[0].windowId] = tabs[0].index;
        TabIdsInActivatedOrder[tabs[0].windowId].push(tabs[0].id);
      });
      chrome.storage.sync.get(["list"], function(items) {
        matchArray = items.list;
      });
    }
  }
);

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
// async function waitForGetID(activeTabRemoved, windowId) {
//  /* return new Promise(function(resolve) {
//     if (!activeTabRemoved) {
//     chrome.tabs.onUpdated.getSelected(windowId, function(tab)
//     {
//       if (tab == undefined) resolve();
//       CurrentTabIndex[windowId] = tab.index;
//       resolve();
//     });
//     resolve();
//   }});*/
// }

async function doOnCreated(tab) {
  //console.log( tab.index + "DoCrate " + tab.id);
  newTabinProcess = true;
  if (FromOnRemoved == 1) {
    FromOnRemoved = 0;
    TabSwapMode = 1;
    //console.log( tab.index + "Return 2 " + tab.id);
    return;
  }
  var windowId;
  var index = -1;
  if (
    storageData.AlwaysSameWindow == "true" &&
    tab.windowId == PopupWindowId &&
    ActiveWindowId > 0 &&
    !isExceptionUrl(tab.url, storageData.AlwaysSameWindowException)
  ) {
    //console.log("testing if ");
    windowId = ActiveWindowId;
    TabIdsInActivatedOrder[tab.windowId].push(tab.id);
    index = CurrentTabIndex[windowId] + 1;
  } else {
    //console.log("testing else");
    windowId = tab.windowId;
  }
  PopupWindowId = -1;
  if (TabIdsInActivatedOrder[windowId].length == 0) {
    //console.log( tab.index + "Return 3 " + tab.id);
    return;
  }
  var sw = null;
  chrome.storage.sync.get(["list"], function(items) {
    matchArray = items.list;
  });
  
   //Function End


  // Handle errors
let openingType = null;
  if (matchArray != null) {
    for (var i = 0; i < matchArray.length; i++) {
      if (
        tab.url.indexOf(matchArray[i].name) != -1 ||
        tab.pendingUrl.indexOf(matchArray[i].name) != -1
      ) {
        sw = matchArray[i].value;
        openingType = matchArray[i].openingType;
      }
    }
  }
  if (sw == null) sw = storageData.tabOpeningPosition;

  switch (sw) {
    case "first":
      index = 0;
      break;
    case "last":
      index = 9999;
      break;
    case "right":
      index = CurrentTabIndex[windowId]+1;
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

      //console.log("running 1");
    } else {
      if (tab.url == "") {
        PendingPopup = {
          tabId: tab.id,
          windowId: windowId,
          index: index
        };
        //console.log( tab.index + "Return 4" + tab.id);
        return;
      }
      //console.log("running 2");
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
  
  processNewTabActivation(tab, windowId, openingType);
}

chrome.tabs.onCreated.addListener(function(tab) {
  var url = "";
  ChromeWrapper.chromeTabsQuery({ active: true, currentWindow: true }, function(tabs) {
    url = tabs[0].url;
  });
  waitForTabLoad(tab.id).then(doOnCreated(tab));
});

chrome.tabs.onActivated.addListener(function(info) {

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

   updateActiveTabInfo(info.tabId); 
  

    //console.log("OnActivated " + info.tabId);
  
  // Update ID of currently active tab in the current window
  
});
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.url) {
    savedUrls[tabId] = changeInfo.url;
  }
});
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {


  if (changeInfo.url != null && PendingPopup && tab.id == PendingPopup.tabId) {
    if (!isExceptionUrl(tab.url, storageData.AlwaysSameWindowException)) {
      chrome.tabs.move(tab.id, {
        windowId: PendingPopup.windowId,
        index: PendingPopup.index
      });
      if(savedUrls[tabId] != null)
      savedUrls[tabId] = tab.url;
      processNewTabActivation(tab, PendingPopup.windowId, null);
    } else {
    }
    PendingPopup = null;
    
  }
  
  //if(changeInfo.status =="complete" ){ console.log(" RUNIN COMPLETE"); updateTabInfo(tabId); }
  
});




chrome.tabs.onRemoved.addListener((tabId, removeInfo)=>{
  FromOnRemoved = 1; 
   //onRemoved = true; 
  //console.log("OnRemoved " + tabId + " R " +removeInfo.tabId + " Lock ");

   updateActivedTabOnRemoved(removeInfo.windowId, tabId);  
   
  
});//Function End

//
chrome.tabs.onMoved.addListener((tabId, moveInfo)=>{
  ChromeWrapper.chromeTabsQuery({ windowId:moveInfo.windowId }, function(tabs) {
    CurrentTabIndex[tabs.windowId] = tabs.index;
  if(!newTabinProcess){
    movedTabChangeByIndex(moveInfo.fromIndex, moveInfo.toIndex, tabId);  
  }
  newTabinProcess = false; 
  });
  //waitForTabLoad(moveInfo.tabId).then(movedTabChangeByIndex(moveInfo.fromIndex,moveInfo.toIndex));

});//Function End

chrome.tabs.onDetached.addListener(function(tabId, detachInfo) {
  FromOnRemoved = 1;
  //console.log("onDetached " + tabId + " R " +removeInfo.tabId);
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

function processNewTabActivation(tab, windowId, openingType) {
  //console.log("processNewTabActivation");
  //console.log("processNewTabActivation   " + localStorage["newCreatedTab"]);
//console.log(tab.index + " processNewTabActivation " + tab.id);

if(openingType == null) openingType = storageData.newCreatedTab;

  switch (openingType) {
    case "foreground":
      chrome.tabs.update(tab.id, {
        selected: true
      });
      break;
    case "background":
      if (tab.url.match(/^chrome/)) {
        break;
      }
     // updateActiveTabInfo(tab.id);
      var activateTabId =
        TabIdsInActivatedOrder[windowId][
          TabIdsInActivatedOrder[windowId].length - 1
        ]; 
      if (activateTabId == undefined) {
        //console.log("activateTabId == undefined");
        break;
      }
      //console.log("activateTabId  "+ activateTabId);
      if(activateTabId){
        chrome.tabs.get(activateTabId, function(tab) {
          if (tab == undefined) return;
          var windowId = tab.windowId;
          CurrentTabIndex[windowId] = tab.index;
          chrome.tabs.update(activateTabId, {
            selected: true
          });
        
       });

       
      }
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

function updateIndex(tabId){
  //console.log("Update " + tabId) && localStorage["tabClosingBehavior"] != "default"
  if(tabId && storageData.tabClosingBehavior != "default"){
  chrome.tabs.get(tabId, function(tab) {
    if (tab == undefined) return;
    var windowId = tab.windowId;
    CurrentTabIndex[windowId] = tab.index;
    chrome.tabs.update(tabId, {
      selected: true
    });
    
  });
}else{

  
  
}
}
function updateActiveTabInfo(tabId) {

//console.log("updateActiveTabInfo " + tabId);
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
        splice(tabId, windowId);
      }
      push(tabId, windowId);
    }
  });

}
async function movedTabChangeByIndex(fromIndex, toIndex, tabId) {
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
      if (TabIdsInActivatedOrder[windowId].indexOf(tabId) != -1) { async() =>{
       // let unlock = await mutex.lock(); // wait until mutex is unlocked
        var toObject = TabIdsInActivatedOrder[windowId][toIndex];
        TabIdsInActivatedOrder[windowId][toIndex] = TabIdsInActivatedOrder[windowId][fromIndex];
        TabIdsInActivatedOrder[windowId][fromIndex] = toObject; 
    //console.log("Spliced " + tabId);
   // unlock(); 
          
      }
      }      
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
  //console.log("updateActivedTabOnRemoved " + activeTabRemoved + "  " + tabId);
  if (TabIdsInActivatedOrder[windowId].indexOf(tabId) != -1) {
   splice(tabId,windowId);
  }else {
       
  }

  if (!activeTabRemoved ) {
    ChromeWrapper.chromeTabsQuery({ windowId:windowId  }, function(tabs) {
      if (tabs == undefined) { return;  }
      //console.log("TEST" + CurrentTabIndex[tabs.windowId] + " tabId " + tabId) + " index " + tabs.index;
      //CurrentTabIndex[windowId] = tabs.index;
      updateIndex(TabIdsInActivatedOrder[windowId][
        TabIdsInActivatedOrder[windowId].length - 1]);
        FromOnRemoved = 0;
    });
  }else matchRemove(windowId,tabId);

   if (TabSwapMode == 1) {
    TabSwapMode = 0;
    return;
  } 
  
  
}
async function splice(tabId, windowId) {

  //let unlock = await mutex.lock(); // wait until mutex is unlocked
  TabIdsInActivatedOrder[windowId].splice(
    TabIdsInActivatedOrder[windowId].indexOf(tabId),
    1 );
    //console.log("Spliced " + tabId);
  //  unlock(); 
 
}
async function push(tabId, windowId) {

  //let unlock = await mutex.lock(); // wait until mutex is unlocked
  TabIdsInActivatedOrder[windowId].push(tabId);
    //console.log("Push " + tabId);
  //  unlock(); 
 
}

function matchRemove(windowId, tabId){
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
  if (sw == null) sw = storageData.tabClosingBehavior;
  switch (sw) {
    case "first":
      activateTabByIndex(windowId, 0); FromOnRemoved = 0;
      break;
    case "last":
      activateTabByIndex(windowId, 9999); FromOnRemoved = 0;
      break;
    case "right":
      activateTabByIndex(windowId, CurrentTabIndex[windowId]); FromOnRemoved = 0;
      break;
    case "left":
        activateTabByIndex(windowId, CurrentTabIndex[windowId] - 1);  FromOnRemoved = 0;
      break;
    case "order":
      var activateTabId =
        TabIdsInActivatedOrder[windowId][
          TabIdsInActivatedOrder[windowId].length - 1];
       
       //console.log(" ID order " + activateTabId);
       updateIndex(activateTabId);
       //CurrentTabIndex[windowId] = activateTabId;
       
      break;
     default:
       //console.log("running?");
      updateIndex(activateTabId); FromOnRemoved = 0;
      break;
  }

}

function activateTabByIndex(windowId, tabIndex) {
  //console.log(" activateTabByIndex");
  if(TabIdsInActivatedOrder[windowId][
    TabIdsInActivatedOrder[windowId].length - 1] != -1){
//console.log(" activateTabByIndex - IF");

    }
  ChromeWrapper.chromeTabsQuery({ windowId:windowId }, 
      function(tabs) {
        var tab;
        if (tabs.length - 1 <= tabIndex) {
          tab = tabs[tabs.length - 1];
        } else {
          tab = tabs[tabIndex] || tabs[0];
        }
        if(tab == undefined) { return;}
        chrome.tabs.update(tab.id, {
          selected: true,
    });// update
    if(tab == undefined) { return; }
    updateActiveTabInfo(tab.id);
  });// query

}// function

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
      updateActiveTabInfo(activateTabId);
  }
  

      /*
      chrome.commands.onCommand.addListener( function(command) {

        switch (command) {
          case "new_tab":
            chrome.tabs.create({});
            break;
          case "duplicate_tab":
            chrome.tabs.getCurrent(function(tab) {
            chrome.tabs.create({
              active: false,
              url: tab.url
            });
          });
            chrome.tabs.create({});
            break;
          case "close_tab":
            chrome.tabs.getCurrent(function(tab) {
              chrome.tabs.remove(tab.id, function() { });
          });
            break;
          case "random_tab":
           alert("Testing");
            break;
        }
      });*/