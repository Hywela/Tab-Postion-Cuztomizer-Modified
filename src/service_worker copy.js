// Service Worker for Manifest V3

let CurrentTabIndex = {};
let TabIdsInActivatedOrder = {};
let savedUrls = {}; 
let FromOnRemoved = false;
let FromOnCreated = false;
let FromPopupAttaching = false;
let TabSwapMode = false;
let ActiveWindowId = -1;
let LastActiveWindowId = -1;
let PopupWindowId = -1;
let ExternalFocusWindowId = -1;
let ExternalFocusDate = 0;
let PendingPopup = null;
let matchArray = null;
let newTabInProcess = false;

let storageData = chrome.storage.sync.get([
  "AlwaysSameWindow", "AlwaysSameWindowException",
  "tabOpeningPosition", "tabClosingBehavior", "list", "newCreatedTab", "button_last_tab",
]);

//console.log("✅ Service Worker Loaded");
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
// Keep the service worker alive
/*
chrome.runtime.onStartup.addListener(() => {
    //console.log("🔄 Service Worker Started");
    
});

chrome.runtime.onInstalled.addListener(() => {
    //console.log("📌 Service Worker Installed");
});
*/

// Handle tab creation
async function doOnCreated(tab) {
    //console.log("📌 Tab Created: ", tab);

    
    newTabInProcess = true;
    if (FromOnRemoved) {
        FromOnRemoved = false;
        TabSwapMode = true;
        return;
    }

    let windowId;
    let index = -1;

    

    storageData = await chrome.storage.sync.get([
        "AlwaysSameWindow", "AlwaysSameWindowException",
        "tabOpeningPosition", "tabClosingBehavior", "list", "newCreatedTab", "button_last_tab",
    ]);

    if (storageData.button_last_tab == "true") {
        chrome.contextMenus.create({
          title: "Last Tab", 
          contexts:["page"], 
          onclick: lastTab
        });
      }
    if (
      storageData.AlwaysSameWindow === "true" &&
        tab.windowId === PopupWindowId &&
        ActiveWindowId > 0 &&
        !isExceptionUrl(tab.url || "", storageData.AlwaysSameWindowException)
    ) {
        windowId = ActiveWindowId;
        TabIdsInActivatedOrder[tab.windowId] = TabIdsInActivatedOrder[tab.windowId] || [];
        TabIdsInActivatedOrder[tab.windowId].push(tab.id);
        index = (CurrentTabIndex[windowId] || 0) + 1;
    } else {
        windowId = tab.windowId;
    }

    PopupWindowId = -1;

    if (!TabIdsInActivatedOrder[windowId]) {
        return;
    }

    let sw = null;
    let openingType = null;
    matchArray = storageData.list || [];

    if (matchArray.length) {
        for (let item of matchArray) {
            if (tab.url?.includes(item.name) || tab.pendingUrl?.includes(item.name)) {
                sw = item.value;
                openingType = item.openingType;
            }
        }
    }

    if (!sw) sw =  storageData.tabOpeningPosition;

    switch (sw) {
        case "first": index = 0; break;
        case "last": index = 9999; break;
        case "right": index = (CurrentTabIndex[windowId] || 0) + 1; break;
        case "left": index = (CurrentTabIndex[windowId] || 0); break;
        case "default": break;
    }

    if (index !== -1) {
        if (windowId === tab.windowId) {
            chrome.tabs.move(tab.id, { index });
        } else {
            if (!tab.url) {
                PendingPopup = { tabId: tab.id, windowId, index };
                return;
            }
            chrome.tabs.move(tab.id, { windowId, index });
            FromPopupAttaching = true;
            chrome.tabs.update(tab.id, { active: true }, () => { FromPopupAttaching = false; });
        }
    }

    processNewTabActivation(tab, windowId, openingType);
}


chrome.tabs.onCreated.addListener(async (tab) => {
    let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    let url = tabs[0]?.url || "";
    await waitForTabLoad(tab.id);
    waitForTabLoad(tab.id).then(doOnCreated(tab));


    //console.log("🛠 Tab Created & Processed");
});

// Handle tab activation
chrome.tabs.onActivated.addListener((info) => {
    if (FromOnCreated || FromOnRemoved || FromPopupAttaching) {
        FromOnCreated = false;
        FromOnRemoved = false;
        FromPopupAttaching = false;
        return;
    }
    //console.log("🔄 Tab Activated: ", info);
    updateActiveTabInfo(info.tabId);
});
function matchRemove(windowId, tabId, data) {
    let sw = null;
    
    // Ensure `data` is defined and has `tabClosingBehavior`
    const tabClosingBehavior = data?.tabClosingBehavior || "default";

    if (matchArray && savedUrls[tabId]) {
        for (let item of matchArray) {
            if (savedUrls[tabId].includes(item.name)) {
                sw = item.closing;
            }
        }
    }

    if (!sw) sw = tabClosingBehavior; // Ensure there's a fallback behavior

    switch (sw) {
        case "first":
            activateTabByIndex(windowId, 0);
            FromOnRemoved = 0;
            break;
        case "last":
            activateTabByIndex(windowId, 9999);
            FromOnRemoved = 0;
            break;
        case "right":
            activateTabByIndex(windowId, CurrentTabIndex[windowId]);
            FromOnRemoved = 0;
            break;
        case "left":
            activateTabByIndex(windowId, CurrentTabIndex[windowId] - 1);
            FromOnRemoved = 0;
            break;
        case "order":
            let activateTabId = TabIdsInActivatedOrder[windowId]?.slice(-1)[0];
            updateIndex(activateTabId);
            break;
        default:
            //updateIndex(activateTabId);
            FromOnRemoved = 0;
            break;
    }
}


// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        savedUrls[tabId] = changeInfo.url;
    }

    if (changeInfo.url && PendingPopup && tab.id === PendingPopup.tabId) {
        chrome.storage.sync.get(["AlwaysSameWindowException"], (data) => {
            if (!isExceptionUrl(tab.url, data.AlwaysSameWindowException)) {
                chrome.tabs.move(tab.id, { windowId: PendingPopup.windowId, index: PendingPopup.index });
                savedUrls[tabId] = tab.url;
                processNewTabActivation(tab, PendingPopup.windowId, null);
            }
            PendingPopup = null;
        });
    }
});

// Update active tab information
/*function updateActiveTabInfo(tabId) {
    chrome.tabs.get(tabId, (tab) => {
        if (!tab) return;
        let windowId = tab.windowId;
        CurrentTabIndex[windowId] = tab.index;
        TabIdsInActivatedOrder[windowId] = TabIdsInActivatedOrder[windowId] || [];
        if (!TabIdsInActivatedOrder[windowId].includes(tabId)) {
            TabIdsInActivatedOrder[windowId].push(tabId);
        }
    });
}*/

// Wait for tab to fully load
async function waitForTabLoad(tabId) {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            //console.warn(`⏳ Tab ${tabId} took too long to load.`);
            resolve();
        }, 10000); // 10s timeout to prevent infinite waiting

        chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
            if (updatedTabId === tabId && changeInfo.status === "complete") {
                chrome.tabs.onUpdated.removeListener(listener);
                clearTimeout(timeout);
                resolve();
            }
        });
    });
}


function updateActivedTabOnRemoved(windowId, tabId) {
        let activeTabRemoved = TabIdsInActivatedOrder[windowId]?.slice(-1)[0] === tabId;
    
        if (TabIdsInActivatedOrder[windowId]?.includes(tabId)) {
            splice(tabId, windowId);
        }
    
        if (!activeTabRemoved) {
            ChromeWrapper.chromeTabsQuery({ windowId }, function (tabs) {
                if (!tabs) return;
    
                let lastTabId = TabIdsInActivatedOrder[windowId]?.slice(-1)[0];
                updateIndex(lastTabId);
                FromOnRemoved = 0;
            });
        } else {
            // Fetch `data` safely before calling `matchRemove`
            chrome.storage.sync.get(["tabClosingBehavior"], function (data) {
                if (chrome.runtime.lastError || !data || Object.keys(data).length === 0) {
                    //console.error("Error retrieving tabClosingBehavior or empty data:", chrome.runtime.lastError);
                    data = { tabClosingBehavior: "default" }; // Fallback value
                }
                matchRemove(windowId, tabId, data);
            });
        }
    
        if (TabSwapMode) {
            TabSwapMode = 0;
        }
    }
    
   function updateIndex(tabId){
   
    storageData =  chrome.storage.sync.get([
      "AlwaysSameWindow", "AlwaysSameWindowException",
      "tabOpeningPosition", "tabClosingBehavior", "list", "newCreatedTab", "button_last_tab",
  ]);

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
    if (ExternalFocusWindowId > 0) {
      var diff = new Date() - ExternalFucusDate;
      if (ExternalFocusWindowId == windowId && diff < 500) {
        chrome.windows.update(windowId, {
          focused: false
        });
      }
    }
  });


// Process new tab activation
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
  async function push(tabId, windowId) {

    //let unlock = await mutex.lock(); // wait until mutex is unlocked
    TabIdsInActivatedOrder[windowId].push(tabId);
      //console.log("Push " + tabId);
    //  unlock(); 
   
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
    async function splice(tabId, windowId) {

        //let unlock = await mutex.lock(); // wait until mutex is unlocked
        TabIdsInActivatedOrder[windowId].splice(
          TabIdsInActivatedOrder[windowId].indexOf(tabId),
          1 );
          //console.log("Spliced " + tabId);
        //  unlock(); 
       
      }

      chrome.tabs.onRemoved.addListener((tabId, removeInfo)=>{
        FromOnRemoved = 1; 
         //onRemoved = true; 
        //console.log("OnRemoved " + tabId + " R " +removeInfo.tabId + " Lock ");
      
         updateActivedTabOnRemoved(removeInfo.windowId, tabId);  
         
        
      });//Function End


      chrome.tabs.onMoved.addListener((tabId, moveInfo)=>{
        ChromeWrapper.chromeTabsQuery({ windowId:moveInfo.windowId }, function(tabs) {
          CurrentTabIndex[tabs.windowId] = tabs.index;
        if(!newTabInProcess){
          movedTabChangeByIndex(moveInfo.fromIndex, moveInfo.toIndex, tabId);  
        }
        newTabInProcess = false; 
        });
        //waitForTabLoad(moveInfo.tabId).then(movedTabChangeByIndex(moveInfo.fromIndex,moveInfo.toIndex));
      
      });//Function End

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
     
    /*     function isExceptionUrl(url, exceptionString) {
            var exceptions = exceptionString.split("\n");
            for (var i = 0; i < exceptions.length - 1; i++) {
              var re = new RegExp(exceptions[i]);
              if (url.search(re) != -1) {
                return true;
              }
            }
            return false;
          }*/
          
// Utility function: Check if a URL matches exceptions
function isExceptionUrl(url, exceptionList) {
    if (!exceptionList || !url) return false;
    return exceptionList.split("\n").some(pattern => new RegExp(pattern).test(url));
}
