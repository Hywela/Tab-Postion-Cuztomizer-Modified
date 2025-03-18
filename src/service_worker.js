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
var newTabInProcess = false;
let storageData = null;
var alwaysSameWindow = true;
var alwaysSameWindowException = true;
loadStorage();

var DEBUG = false;
if(!DEBUG){
   
    var methods = ["log", "debug", "warn", "info"];
    for(var i=0;i<methods.length;i++){
        console[methods[i]] = function(){};
    }
}

async function saveTolocalstorage(storage, input) {
  let obj = {};
  obj[storage] = input;
  console.log(`Saving ${storage}:`, input);
  await chrome.storage.local.set(obj);
}

async function getLocalstorage(storage) {
  return new Promise((resolve) => {
    chrome.storage.local.get([storage], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Storage Error:", chrome.runtime.lastError);
        resolve(null);
      } else {
        console.log(`Restored ${storage}:`, result[storage]);
        resolve(result[storage] !== undefined ? result[storage] : null);
      }
    });
  });
}
async function onRestore() {
  console.log("Restoring session data...");

  const tabIds = await getLocalstorage("TabIdsInActivatedOrder");
  TabIdsInActivatedOrder = tabIds && typeof tabIds === "object" ? tabIds : {};

  const currentIndex = await getLocalstorage("CurrentTabIndex");
  CurrentTabIndex = currentIndex && typeof currentIndex === "object" ? currentIndex : {};

  const activeWindow = await getLocalstorage("ActiveWindowId");
  ActiveWindowId = activeWindow !== undefined && activeWindow !== null ? activeWindow : -1;

  const lastActiveWindow = await getLocalstorage("LastActiveWindowId");
  LastActiveWindowId = lastActiveWindow !== undefined && lastActiveWindow !== null ? lastActiveWindow : -1;

  console.log("Restored session:", { TabIdsInActivatedOrder, CurrentTabIndex, ActiveWindowId, LastActiveWindowId });
}

async function onSuspend() {
  console.log("onSuspend: Saving state before suspension.");
  await saveTolocalstorage("TabIdsInActivatedOrder", TabIdsInActivatedOrder);
  await saveTolocalstorage("CurrentTabIndex", CurrentTabIndex);
  await saveTolocalstorage("ActiveWindowId", ActiveWindowId);
  await saveTolocalstorage("LastActiveWindowId", LastActiveWindowId);
}
// Listen for storage changes and update only the relevant keys
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync") {
    Object.keys(changes).forEach((key) => {
      storageData[key] = changes[key].newValue;
    });
  }
});
chrome.runtime.onStartup.addListener(async function () {
  console.log("onStartup: Restoring saved state.");
  await onRestore();
});

chrome.runtime.onInstalled.addListener(async function () {
  console.log("onInstalled: Restoring saved state.");
  await onRestore();
});

async function loadStorage(){
  alwaysSameWindow = (await getLocalstorage("AlwaysSameWindow")) || false; // Default to false if missing
  alwaysSameWindowException = (await getLocalstorage("AlwaysSameWindowException")) || false; // Default to false if missing
  console.log(alwaysSameWindow, "TESTING");
  storageData = await chrome.storage.sync.get([
    "AlwaysSameWindow", "AlwaysSameWindowException",
    "tabOpeningPosition", "tabClosingBehavior", "list", "newCreatedTab", "button_last_tab",
  ]);

  if (storageData.foregroundNewTab === "true") {
    storageData.newCreatedTab = "foreground";
  }
  storageData.foregroundNewTab = undefined;
}
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



chrome.windows.getAll(
  {
    populate: false
  },
  async function(windows) { // Make function async
    console.log("chrome.windows.getAll");
    await loadStorage(); // Ensure storage is loaded before proceeding

   
    for (var i = 0; i < windows.length; i++) {
      var windowId = windows[i].id;
      
      TabIdsInActivatedOrder[windowId] = new Array();
      
      if (windows[i].focused) {
        ActiveWindowId = windowId;
      }
    
      ChromeWrapper.chromeTabsQuery({ windowId: windowId }, function(tabs) {
      
        if (tabs.length > 0) {
          CurrentTabIndex[tabs[0].windowId] = tabs[0].index;
          pushToArray(tabs[0].id, tabs[0].groupId || -1, tabs[0].windowId);
        }
      
      });
      
    }//end if(!TabIdsInActivatedOrder[windowId]){
    }
  
);

function waitForTabLoad(loadingTabId) {
  return new Promise(function(resolve) {
    chrome.tabs.onUpdated.addListener(function _listener(tabId, info, tab) {
      console.log(info, tab, "waitForTabLoad");
      if (loadingTabId == tabId && tab.status == "complete") {  
          //tab.index = doOnCreated(tab);          
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
  console.log("doOnCreated", tab.windowId, )
   newTabInProcess = true;
   if (FromOnRemoved == 1) {
     FromOnRemoved = 0;
     TabSwapMode = 1;
     //console.log( tab.index + "Return 2 " + tab.id);
     return;
   }
   var windowId = tab.windowId;
   var index = -1;
   
   if (
     alwaysSameWindow == "true" &&
     tab.windowId == PopupWindowId &&
     ActiveWindowId > 0 &&
     !isExceptionUrl(tab.url, alwaysSameWindowException)
   ) {
    console.log("if, else 1 ", windowId );
     windowId = ActiveWindowId;
     pushToArray(tab.id, tab.groupId,tab.windowId);
    // TabIdsInActivatedOrder[tab.windowId].push(tab.id);
     index = CurrentTabIndex[windowId] + 1;
   } else {
    console.log("if, else 1", windowId);
     windowId = tab.windowId;
   }
   PopupWindowId = -1;
   if (TabIdsInActivatedOrder[windowId]) {
   if (TabIdsInActivatedOrder[windowId].length == 0) {
    pushToArray(tab.id, tab.groupId,tab.windowId);
     return;
   } }
   var sw = null;
   if(storageData.list !=null || undefined){
    matchArray = storageData.list;
   }
    
 console.log("windowd IDS in oncreated", windowId, )
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
   if (!sw) sw =  storageData.tabOpeningPosition;
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
      index = null;
       break;
   }



   if (index != -1 & index != null) {
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
 }
}

await processNewTabActivation(tab, windowId, openingType);
}

let creatingNewTab = false; // Prevent infinite loop
let deletedTabDone = true; // Prevent infinite loop
/*
chrome.tabs.onCreated.addListener(async function(tab) {
  if (creatingNewTab) {
    console.warn("Prevented infinite tab creation loop.");
    return;
  }
  ChromeWrapper.chromeTabsQuery({ active: true, currentWindow: true }, async function(tabs) {
    if (tabs.length === 0) return;

    let currentTab = tabs[0];
    let groupId = currentTab.groupId && currentTab.groupId !== -1 ? currentTab.groupId : null;
    let index = await doOnCreated(tab);
    let open = await processNewTabActivation(tab);
    console.log("INDEX", index);
    // Mark as creating to prevent infinite loop
   
    creatingNewTab = true;

    chrome.tabs.create({
      url: tab.pendingUrl || tab.url || "chrome://newtab/",
      index: index,
      windowId: tab.windowId,
      pinned: tab.pinned
    }, async function(newTab) {
      if (chrome.runtime.lastError) {
        console.warn(`Failed to create tab at index ${index}:`, chrome.runtime.lastError);
        creatingNewTab = false; // Reset flag on failure
        return;
      }

      console.log(`Tab created at index ${index}`);

      if (groupId !== null) {
        chrome.tabs.group({ tabIds: newTab.id, groupId: groupId }, function() {
          if (chrome.runtime.lastError) {
            console.warn(`Failed to add tab ${newTab.id} to group ${groupId}:`, chrome.runtime.lastError);
          } else {
            console.log(`Tab ${newTab.id} added to group ${groupId}`);
          }
        });
      }

      // Ensure the tab is highlighted (selected) if `open` is true


      // Remove the original incorrectly positioned tab
      deletedTabDone = false;
      chrome.tabs.remove(tab.id, function() {
        console.log(`Removed incorrectly positioned tab ${tab.id}`);
        creatingNewTab = false; // Reset flag after removal
      });
    });
 

    if (open) {
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
  
  });
});*/

chrome.tabs.onCreated.addListener(async function(tab) {
  console.log("chrome.tabs.onCreated.addListener");
  /* if (creatingNewTab) {
     console.warn("Prevented infinite tab creation loop.");
     return;
   }*/
 
   ChromeWrapper.chromeTabsQuery({ active: true, currentWindow: true }, async function(tabs) {
    // if (tabs.length === 0) return;
 
     let currentTab = tabs[0];
     let groupId = currentTab.groupId && currentTab.groupId !== -1 ? currentTab.groupId : null;
     await doOnCreated(tab);
     if (groupId !== null) {
      chrome.tabs.group({ tabIds: tab.id, groupId: groupId }, function() {
        if (chrome.runtime.lastError) {
          console.warn(`Failed to add tab ${tab.id} to group ${groupId}:`, chrome.runtime.lastError);
        } else {
          console.log(`Tab ${tab.id} added to group ${groupId}`);
        }
      });
    }
     newTabInProcess = false;
   });
   
 });
 onActivatedAddListener();
 function onActivatedAddListener() {
  try {
    chrome.tabs.onActivated.addListener(function(info) {
      console.log("chrome.tabs.onActivated.addListener");
      ChromeWrapper.chromeTabsQuery({}, async function(tabs) {
    
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
      });
      
    });
    console.log("Success.");
  } catch (error) {
    if (error == "Error: Tabs cannot be edited right now (user may be dragging a tab).") {
      setTimeout(() => onActivatedAddListener(), 50);
    } else {
      console.error(error);
    }
  }
    
 
}


chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  console.log("chrome.tabs.onUpdated.addListener");
  if (changeInfo.url) {
    savedUrls[tabId] = changeInfo.url;
  }
});





chrome.tabs.onRemoved.addListener((tabId, removeInfo)=>{
  console.log("chrome.tabs.onRemoved.addListener");
  FromOnRemoved = 1; 
    //onRemoved = true; 
  console.log("OnRemoved " + tabId + " R " +removeInfo.tabId + " Lock ");

  updateActivedTabOnRemoved(removeInfo.windowId, removeInfo.groupId, tabId);  

});//Function End

//
chrome.tabs.onMoved.addListener((tabId, moveInfo)=>{
  console.log("chrome.tabs.onMoved.addListener");
  ChromeWrapper.chromeTabsQuery({ windowId:moveInfo.windowId }, function(tabs) {
    CurrentTabIndex[tabs.windowId] = tabs.index;
  if(!newTabInProcess){
    movedTabChangeByIndex(moveInfo.fromIndex, moveInfo.toIndex, tabId);  
  }
  newTabInProcess = false; 
  });
  //waitForTabLoad(moveInfo.tabId).then(movedTabChangeByIndex(moveInfo.fromIndex,moveInfo.toIndex));

});//Function End

chrome.tabs.onDetached.addListener(function(tabId, detachInfo) {
  console.log("chrome.tabs.onDetached.addListener");
  FromOnRemoved = 1;
  
  updateActivedTabOnRemoved(detachInfo.oldWindowId, tabId);
  
   
});
chrome.windows.onCreated.addListener(function(window) {
  console.log("chrome.windows.onCreated.addListener");
  CurrentTabIndex[window.id] = 0;
  TabIdsInActivatedOrder[window.id] = new Array();
  console.log("NEW WINDOW", window.id)


  if (window.type == "popup") {
    PopupWindowId = window.id;
    if (ActiveWindowId == window.id || !(ActiveWindowId > 0)) {
      ActiveWindowId = LastActiveWindowId;
      LastActiveWindowId = -1;
      console.log("NEW WINDOW", window.id)
    }
  }
});
chrome.windows.onRemoved.addListener(function(windowId) {
  console.log("chrome.windows.onRemoved");
  CurrentTabIndex[windowId] = undefined;
  delete TabIdsInActivatedOrder[windowId];
  if (windowId == ActiveWindowId) {
    ActiveWindowId = -1;
  }
});
chrome.windows.onFocusChanged.addListener(function(windowId) {
  console.log("chrome.windows.onFocusChanged");

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



async function processNewTabActivation(tab, windowId, openingType) {
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
      var activateTabId = TabIdsInActivatedOrder[windowId][TabIdsInActivatedOrder[windowId].length - 1].tabId;
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
async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}
function updateIndex(tabId){
  //console.log("Update " + tabId) && localStorage["tabClosingBehavior"] != "default"
 
  if(tabId && storageData.tabClosingBehavior != "default"){
    console.log(tabId, "updateIndex" ,TabIdsInActivatedOrder );
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
async function updateActiveTabInfo(tabId, groupId) {

console.log("updateActiveTabInfo " + tabId);
try {
  await chrome.tabs.get(tabId, function(tab) {
    if (tab == undefined) return;
    var windowId = tab.windowId;
    CurrentTabIndex[windowId] = tab.index;
    if (TabIdsInActivatedOrder[windowId] == undefined) {
      TabIdsInActivatedOrder[windowId] = new Array();
    }
    if (
      TabIdsInActivatedOrder[windowId] &&
      TabIdsInActivatedOrder[windowId].length > 0 &&
      TabIdsInActivatedOrder[windowId][TabIdsInActivatedOrder[windowId].length - 1].tabId !== tabId
    ) {
      if (TabIdsInActivatedOrder[windowId].some(entry => entry.tabId === tabId)) {
        splice(tabId, windowId);
      }
      pushToArray(tabId, groupId, windowId);
    }
  });
  console.log("Success.");
} catch (error) {
  if (error == "Error: Tabs cannot be edited right now (user may be dragging a tab).") {
    setTimeout(() => updateActiveTabInfo(tabId, groupId), 50);
  } else {
    console.error(error);
  }
}

}
async function movedTabChangeByIndex(fromIndex, toIndex, tabId) {
  let windowId = null;

  // Find the windowId that contains the tabId
  for (const winId in TabIdsInActivatedOrder) {
    if (TabIdsInActivatedOrder[winId].some(entry => entry.tabId === tabId)) {
      windowId = winId;
      break;
    }
  }

  if (!windowId) return; // Exit if no matching windowId is found

  // Ensure indices are within bounds
  if (fromIndex >= 0 && toIndex >= 0 &&
      fromIndex < TabIdsInActivatedOrder[windowId].length &&
      toIndex < TabIdsInActivatedOrder[windowId].length) {

    // Swap the two tab objects
    [TabIdsInActivatedOrder[windowId][fromIndex], TabIdsInActivatedOrder[windowId][toIndex]] =
    [TabIdsInActivatedOrder[windowId][toIndex], TabIdsInActivatedOrder[windowId][fromIndex]];
  }
}


async function updateActivedTabOnRemoved(windowId,groupId, tabId) {
  try {
    var activeTabRemoved; 
  if (TabIdsInActivatedOrder[windowId]?.length) {

  const lastEntry = TabIdsInActivatedOrder[windowId][TabIdsInActivatedOrder[windowId].length - 1];
  activeTabRemoved = lastEntry ? lastEntry.tabId === tabId : false;
  
  //console.log("updateActivedTabOnRemoved " + activeTabRemoved + "  " + tabId);
  if (TabIdsInActivatedOrder[windowId].some(entry => entry.tabId === tabId)) {
    splice(tabId, windowId);
  }else {
  }
  }
  console.log("updateActivedTabOnRemoved half");
  if (!activeTabRemoved ) {
    ChromeWrapper.chromeTabsQuery({ windowId:windowId  }, function(tabs) {
      if (tabs == undefined) { return;  }
      //console.log("TEST" + CurrentTabIndex[tabs.windowId] + " tabId " + tabId) + " index " + tabs.index;
      //CurrentTabIndex[windowId] = tabs.index;

      let activateTabId = null;

      if (TabIdsInActivatedOrder[windowId] && TabIdsInActivatedOrder[windowId].length > 0) {
         activateTabId = TabIdsInActivatedOrder[windowId][TabIdsInActivatedOrder[windowId].length - 1].tabId;
        updateIndex(activateTabId);
      }
        FromOnRemoved = 0;
    });
  }else {matchRemove(windowId,groupId,tabId, deletedTabDone);

    deletedTabDone = true;
  }

   if (TabSwapMode == 1) {
    TabSwapMode = 0;
    return;
  } 
 } catch (error) {
   if (error == "Error: Tabs cannot be edited right now (user may be dragging a tab).") {
     setTimeout(() => updateActivedTabOnRemoved(windowId,groupId, tabId), 50);
   } else {
     console.error(error);
   }
 }
}

async function splice(tabId, windowId) {
  if (!TabIdsInActivatedOrder[windowId]) {
    console.warn(`splice: No array exists for window ${windowId}`);
    return;
  }

  // Ensure `tabId` is a number (match the type)
  tabId = Number(tabId);

  // Find the index of the object with the given tabId
  const index = TabIdsInActivatedOrder[windowId].findIndex(entry => Number(entry.tabId) === tabId);

  if (index === -1) {
    console.warn(`splice: Tab ID ${tabId} not found in window ${windowId}`);
    return;
  }
  // Remove the tab from the array
  TabIdsInActivatedOrder[windowId].splice(index, 1);
}


async function pushToArray(tabId, groupId, windowId) {
  if (!windowId){ console.log("undefined window in pushToaraay"); return; }// Prevents undefined windowId issues
  if (!TabIdsInActivatedOrder[windowId]) {
    console.log("New array in pushToaraay");
    TabIdsInActivatedOrder[windowId] = [];
  }

  // Ensure `tabId` does not already exist
  if (!TabIdsInActivatedOrder[windowId].some(entry => entry.tabId === tabId)) {
    console.log("Push to array", tabId);
    TabIdsInActivatedOrder[windowId].push({ tabId, groupId, windowId });
  } else {
    console.warn(`push: Tab ID ${tabId} already exists in window ${windowId}, skipping duplicate.`);
  }
}

function matchRemove(windowId, groupId, tabId, run){
  if(run){
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

      console.log("order");
    var activateTabId = null;

    if (TabIdsInActivatedOrder[windowId] && TabIdsInActivatedOrder[windowId].length > 0) {
      activateTabId = TabIdsInActivatedOrder[windowId][TabIdsInActivatedOrder[windowId].length - 1].tabId;
      updateIndex(activateTabId);
    }
       
       //console.log(" ID order " + activateTabId);
      
       //CurrentTabIndex[windowId] = activateTabId;
       
      break;
     default:
       //console.log("running?");
      updateIndex(activateTabId); FromOnRemoved = 0;
      break;
  }
}
}

function activateTabByIndex(windowId, tabIndex) {
  //console.log(" activateTabByIndex");
  if (TabIdsInActivatedOrder[windowId] &&
    TabIdsInActivatedOrder[windowId].length > 0 &&
    TabIdsInActivatedOrder[windowId][TabIdsInActivatedOrder[windowId].length - 1] != -1) {
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
    console.log("tabID", tab.id);
    updateActiveTabInfo(tab.id, tab.groupId);
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

  var lastEntry = TabIdsInActivatedOrder[windowId][TabIdsInActivatedOrder[windowId].length - 2];
  var activateTabId = lastEntry ? lastEntry.tabId : null;
      chrome.tabs.update(activateTabId, {
        selected: true
      });
      updateActiveTabInfo(activateTabId,  tab.groupId);
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