import Vue from "vue";
import App from "./App";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";
import "jquery/src/jquery.js";
import "bootstrap/dist/js/bootstrap.min.js";
import { BootstrapVue, IconsPlugin } from "bootstrap-vue";

Vue.use(BootstrapVue);
Vue.use(IconsPlugin);

const sameWindowFormExceptionDefault = "^chrome-devtools://\n^chrome://\n";

/* eslint-disable no-new */

String.prototype.trim = function() {
  return this.replace(/^\s+|\s+$/g, "");
};

function init() {
  initText();
  restoreOptions();
}
function popfromList(element) {
  list.splice(element.id, 1);
  var ul = document.getElementById("list");
  list.removeChild(list.childNodes[element.id]);
}
function initText() {
  var i18nTexts = [
    "optionTitle",
    "subOptionTitle",
    "subOptionTitle2",

    "open",
    "openFirst",
    "openLast",
    "openRight",
    "openLeft",
    "openDefault",

    "close",
    "closeFirst",
    "closeLast",
    "closeRight",
    "closeLeft",
    "closeOrder",
    "closeDefault",

    "new",
    "newForeground",
    "newBackground",
    "newDefault",

    "misc",
    "miscSameWindow",
    "miscSameWindowException",
    "miscExternalLinkDefault",
    "miscExternalLinkUnfocus"
  ];

  for (var i = 0; i < i18nTexts.length; i++) {
    document.getElementById(
      i18nTexts[i] + "Text"
    ).innerHTML = chrome.i18n.getMessage(i18nTexts[i]);
  }
}

function restoreOptions() {
  restoreFormButton(document.open, "tabOpeningPosition");
  restoreFormButton(document.close, "tabClosingBehavior");
  restoreFormButton(document.new_tab, "newCreatedTab");
  restoreSameWindowForm();
  restoreExternalLinkDefault();
  restoreExternalLinkUnfocus();
}

function restoreSameWindowForm() {
  var sameWindowForm = document.same_window;
  if (localStorage["AlwaysSameWindow"] == "true") {
    sameWindowForm.true.checked = true;
  }

  restoreSameWindowFormSub();

  sameWindowForm.addEventListener("click", saveSameWindowForm, false);
  sameWindowForm.exception.addEventListener(
    "input",
    saveSameWindowFormException,
    false
  );
  sameWindowForm.addEventListener(
    "reset",
    function(event) {
      event.preventDefault();
      delete localStorage["AlwaysSameWindowException"];
      restoreSameWindowFormSub();
    },
    false
  );
}

function restoreSameWindowFormSub() {
  var sameWindowForm = document.same_window;

  if (sameWindowForm.true.checked == false) {
    sameWindowForm.exception.disabled = true;
    sameWindowForm.reset.disabled = true;
    return;
  }

  sameWindowForm.exception.disabled = false;
  sameWindowForm.reset.disabled = false;

  if (localStorage["AlwaysSameWindowException"] == null) {
    localStorage["AlwaysSameWindowException"] = sameWindowFormExceptionDefault;
  }
  sameWindowForm.exception.value = localStorage["AlwaysSameWindowException"];
}

function restoreExternalLinkDefault() {
  var externalLinkDefault = document.external_link_default;
  if (localStorage["ExternalLinkDefault"] == "true") {
    externalLinkDefault.true.checked = true;
  }

  externalLinkDefault.addEventListener("click", saveExternalLinkDefault, false);
}

function restoreExternalLinkUnfocus() {
  var externalLinkUnfocus = document.external_link_unfocus;
  if (localStorage["ExternalLinkUnfocus"] == "true") {
    externalLinkUnfocus.true.checked = true;
  }

  externalLinkUnfocus.addEventListener("click", saveExternalLinkUnfocus, false);
}

function restoreFormButton(formName, storageKey) {
  var form = formName.button;
  var checked = false;
  for (var i = 0; i < form.length; i++) {
    if (form[i].value == localStorage[storageKey]) {
      form[i].checked = true;
      checked = true;
    }

    form[i].addEventListener(
      "click",
      function() {
        saveFormButton(formName, storageKey);
      },
      false
    );
  }
  if (checked == false) {
    form[form.length - 1].checked = true;
  }
}

function saveFormButton(formName, storageKey) {
  var form = formName.button;
  for (var i = 0; i < form.length; i++) {
    if (form[i].checked) {
      localStorage[storageKey] = form[i].value;
    }
  }
}

function saveSameWindowForm() {
  var sameWindowForm = document.same_window;
  localStorage["AlwaysSameWindow"] = sameWindowForm.true.checked
    ? "true"
    : "false";
  restoreSameWindowFormSub();
}

function saveSameWindowFormException() {
  var sameWindowForm = document.same_window;
  var exceptions = sameWindowForm.exception.value.split("\n");

  var saveString = "";
  for (var i = 0; i < exceptions.length; i++) {
    exceptions[i] = exceptions[i].trim();
    if (exceptions[i].length != 0) {
      saveString += exceptions[i] + "\n";
    }
  }

  localStorage["AlwaysSameWindowException"] = saveString;
}

function saveExternalLinkDefault() {
  var externalLinkDefault = document.external_link_default;
  localStorage["ExternalLinkDefault"] = externalLinkDefault.true.checked
    ? "true"
    : "false";
}

function saveExternalLinkUnfocus() {
  var externalLinkUnfocus = document.external_link_unfocus;
  localStorage["ExternalLinkUnfocus"] = externalLinkUnfocus.true.checked
    ? "true"
    : "false";
}
function restoreList() {
  chrome.storage.sync.set({ list: list }, function() {});
}

window.addEventListener("load", init, false);

new Vue({
  el: "#app",
  data: {},
  render: h => h(App)
});
