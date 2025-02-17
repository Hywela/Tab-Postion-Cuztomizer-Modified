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

console.log("✅ Service Worker Loaded");

// Keep the service worker alive
chrome.runtime.onStartup.addListener(() => {
    console.log("🔄 Service Worker Started");
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("📌 Service Worker Installed");
});

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
  };
// Handle tab creation
async function doOnCreated(tab) {
    console.log("📌 Tab Created: ", tab);

    newTabInProcess = true;
    if (FromOnRemoved) {
        FromOnRemoved = false;
        TabSwapMode = true;
        return;
    }

    let windowId;
    let index = -1;

    let data = await chrome.storage.sync.get([
        "AlwaysSameWindow", "AlwaysSameWindowException",
        "tabOpeningPosition", "tabClosingBehavior", "list", "newCreatedTab", "button_last_tab",
    ]);

    if (
        data.AlwaysSameWindow === "true" &&
        tab.windowId === PopupWindowId &&
        ActiveWindowId > 0 &&
        !isExceptionUrl(tab.url || "", data.AlwaysSameWindowException)
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
    matchArray = data.list || [];

    if (matchArray.length) {
        for (let item of matchArray) {
            if (tab.url?.includes(item.name) || tab.pendingUrl?.includes(item.name)) {
                sw = item.value;
                openingType = item.openingType;
            }
        }
    }

    if (!sw) sw = data.tabOpeningPosition;

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

    console.log("🛠 Tab Created & Processed");
});

// Handle tab activation
chrome.tabs.onActivated.addListener((info) => {
    if (FromOnCreated || FromOnRemoved || FromPopupAttaching) {
        FromOnCreated = false;
        FromOnRemoved = false;
        FromPopupAttaching = false;
        return;
    }
    console.log("🔄 Tab Activated: ", info);
    updateActiveTabInfo(info.tabId);
});

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
function updateActiveTabInfo(tabId) {
    chrome.tabs.get(tabId, (tab) => {
        if (!tab) return;
        let windowId = tab.windowId;
        CurrentTabIndex[windowId] = tab.index;
        TabIdsInActivatedOrder[windowId] = TabIdsInActivatedOrder[windowId] || [];
        if (!TabIdsInActivatedOrder[windowId].includes(tabId)) {
            TabIdsInActivatedOrder[windowId].push(tabId);
        }
    });
}

// Wait for tab to fully load
async function waitForTabLoad(tabId) {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.warn(`⏳ Tab ${tabId} took too long to load.`);
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

// Process new tab activation
function processNewTabActivation(tab, windowId, openingType) {
    chrome.storage.sync.get(["newCreatedTab"], (data) => {
        if (data.newCreatedTab === "foreground") {
            chrome.tabs.update(tab.id, { active: true });
        }
    });
}

// Utility function: Check if a URL matches exceptions
function isExceptionUrl(url, exceptionList) {
    if (!exceptionList || !url) return false;
    return exceptionList.split("\n").some(pattern => new RegExp(pattern).test(url));
}
