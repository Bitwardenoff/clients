import type { Jsonify } from "type-fest";

import type { FolderView } from "@bitwarden/common/vault/models/view/folder.view";

require("./bar.scss");

document.addEventListener("DOMContentLoaded", () => {
  // delay 50ms so that we get proper body dimensions
  setTimeout(load, 50);
});

function load() {
  const theme = getQueryVariable("theme");
  document.documentElement.classList.add("theme_" + theme);

  const isVaultLocked = getQueryVariable("isVaultLocked") == "true";
  (document.getElementById("logo") as HTMLImageElement).src = isVaultLocked
    ? chrome.runtime.getURL("images/icon38_locked.png")
    : chrome.runtime.getURL("images/icon38.png");

  const i18n = {
    appName: chrome.i18n.getMessage("appName"),
    close: chrome.i18n.getMessage("close"),
    never: chrome.i18n.getMessage("never"),
    folder: chrome.i18n.getMessage("folder"),
    notificationAddSave: chrome.i18n.getMessage("notificationAddSave"),
    notificationAddDesc: chrome.i18n.getMessage("notificationAddDesc"),
    notificationChangeSave: chrome.i18n.getMessage("notificationChangeSave"),
    notificationChangeDesc: chrome.i18n.getMessage("notificationChangeDesc"),
  };

  document.getElementById("logo-link").title = i18n.appName;

  // i18n for "Add" template
  const addTemplate = document.getElementById("template-add") as HTMLTemplateElement;

  const neverButton = addTemplate.content.getElementById("never-save");
  neverButton.textContent = i18n.never;

  const selectFolder = addTemplate.content.getElementById("select-folder");
  selectFolder.setAttribute("aria-label", i18n.folder);
  selectFolder.dataset.isVaultLocked = isVaultLocked.toString();

  const addButton = addTemplate.content.getElementById("add-save");
  addButton.textContent = i18n.notificationAddSave;

  addTemplate.content.getElementById("add-text").textContent = i18n.notificationAddDesc;

  // i18n for "Change" (update password) template
  const changeTemplate = document.getElementById("template-change") as HTMLTemplateElement;

  const changeButton = changeTemplate.content.getElementById("change-save");
  changeButton.textContent = i18n.notificationChangeSave;

  changeTemplate.content.getElementById("change-text").textContent = i18n.notificationChangeDesc;

  // i18n for body content
  const closeButton = document.getElementById("close-button");
  closeButton.title = i18n.close;

  if (getQueryVariable("type") === "add") {
    handleTypeAdd(isVaultLocked);
  } else if (getQueryVariable("type") === "change") {
    handleTypeChange();
  }

  closeButton.addEventListener("click", (e) => {
    e.preventDefault();
    sendPlatformMessage({
      command: "bgCloseNotificationBar",
    });
  });

  window.addEventListener("resize", adjustHeight);
  adjustHeight();
}

function getQueryVariable(variable: string) {
  const query = window.location.search.substring(1);
  const vars = query.split("&");

  for (let i = 0; i < vars.length; i++) {
    const pair = vars[i].split("=");
    if (pair[0] === variable) {
      return pair[1];
    }
  }

  return null;
}

function handleTypeAdd(isVaultLocked: boolean) {
  setContent(document.getElementById("template-add") as HTMLTemplateElement);

  const addButton = document.getElementById("add-save");
  const neverButton = document.getElementById("never-save");

  addButton.addEventListener("click", (e) => {
    e.preventDefault();

    const folderId = (document.getElementById("select-folder") as HTMLSelectElement).value;

    const bgAddSaveMessage = {
      command: "bgAddSave",
      folder: folderId,
    };
    sendPlatformMessage(bgAddSaveMessage);
  });

  neverButton.addEventListener("click", (e) => {
    e.preventDefault();
    sendPlatformMessage({
      command: "bgNeverSave",
    });
  });

  if (!isVaultLocked) {
    const responseFoldersCommand = "notificationBarGetFoldersList";
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.command === responseFoldersCommand && msg.data) {
        fillSelectorWithFolders(msg.data.folders);
      }
    });
    sendPlatformMessage({
      command: "bgGetDataForTab",
      responseCommand: responseFoldersCommand,
    });
  }
}

function handleTypeChange() {
  setContent(document.getElementById("template-change") as HTMLTemplateElement);
  const changeButton = document.getElementById("change-save");
  changeButton.addEventListener("click", (e) => {
    e.preventDefault();

    const bgChangeSaveMessage = {
      command: "bgChangeSave",
    };
    sendPlatformMessage(bgChangeSaveMessage);
  });
}

function setContent(template: HTMLTemplateElement) {
  const content = document.getElementById("content");
  while (content.firstChild) {
    content.removeChild(content.firstChild);
  }

  const newElement = template.content.cloneNode(true) as HTMLElement;
  content.appendChild(newElement);
}

function sendPlatformMessage(msg: Record<string, any>) {
  chrome.runtime.sendMessage(msg);
}

function fillSelectorWithFolders(folders: Jsonify<FolderView[]>) {
  const select = document.getElementById("select-folder");
  select.appendChild(new Option(chrome.i18n.getMessage("selectFolder"), null, true));
  folders.forEach((folder) => {
    // Select "No Folder" (id=null) folder by default
    select.appendChild(new Option(folder.name, folder.id || "", false));
  });
}

function adjustHeight() {
  sendPlatformMessage({
    command: "bgAdjustNotificationBar",
    data: {
      height: document.querySelector("body").scrollHeight,
    },
  });
}
