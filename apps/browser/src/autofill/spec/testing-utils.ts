import { mock } from "jest-mock-extended";

export function triggerTestFailure() {
  expect(true).toBe("Test has failed.");
}

const scheduler = typeof setImmediate === "function" ? setImmediate : setTimeout;
export function flushPromises() {
  return new Promise(function (resolve) {
    scheduler(resolve);
  });
}

export function postWindowMessage(data: any, origin = "https://localhost/", source = window) {
  globalThis.dispatchEvent(new MessageEvent("message", { data, origin, source }));
}

export function sendExtensionRuntimeMessage(
  message: any,
  sender?: chrome.runtime.MessageSender,
  sendResponse?: CallableFunction,
) {
  (chrome.runtime.onMessage.addListener as unknown as jest.SpyInstance).mock.calls.forEach(
    (call) => {
      const callback = call[0];
      callback(
        message || {},
        sender || mock<chrome.runtime.MessageSender>(),
        sendResponse || jest.fn(),
      );
    },
  );
}

export function triggerRuntimeOnConnectEvent(port: chrome.runtime.Port) {
  (chrome.runtime.onConnect.addListener as unknown as jest.SpyInstance).mock.calls.forEach(
    (call) => {
      const callback = call[0];
      callback(port);
    },
  );
}

export function sendPortMessage(port: chrome.runtime.Port, message: any) {
  (port.onMessage.addListener as unknown as jest.SpyInstance).mock.calls.forEach((call) => {
    const callback = call[0];
    callback(message || {}, port);
  });
}

export function triggerPortOnDisconnectEvent(port: chrome.runtime.Port) {
  (port.onDisconnect.addListener as unknown as jest.SpyInstance).mock.calls.forEach((call) => {
    const callback = call[0];
    callback(port);
  });
}

export function triggerWindowOnFocusedChangedEvent(windowId: number) {
  (chrome.windows.onFocusChanged.addListener as unknown as jest.SpyInstance).mock.calls.forEach(
    (call) => {
      const callback = call[0];
      callback(windowId);
    },
  );
}

export function triggerTabOnActivatedEvent(activeInfo: chrome.tabs.TabActiveInfo) {
  (chrome.tabs.onActivated.addListener as unknown as jest.SpyInstance).mock.calls.forEach(
    (call) => {
      const callback = call[0];
      callback(activeInfo);
    },
  );
}

export function triggerTabOnReplacedEvent(addedTabId: number, removedTabId: number) {
  (chrome.tabs.onReplaced.addListener as unknown as jest.SpyInstance).mock.calls.forEach((call) => {
    const callback = call[0];
    callback(addedTabId, removedTabId);
  });
}

export function triggerTabOnUpdatedEvent(
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab,
) {
  (chrome.tabs.onUpdated.addListener as unknown as jest.SpyInstance).mock.calls.forEach((call) => {
    const callback = call[0];
    callback(tabId, changeInfo, tab);
  });
}

export function triggerTabOnRemovedEvent(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) {
  (chrome.tabs.onRemoved.addListener as unknown as jest.SpyInstance).mock.calls.forEach((call) => {
    const callback = call[0];
    callback(tabId, removeInfo);
  });
}

export function triggerOnAlarmEvent(alarm: chrome.alarms.Alarm) {
  (chrome.alarms.onAlarm.addListener as unknown as jest.SpyInstance).mock.calls.forEach((call) => {
    const callback = call[0];
    callback(alarm);
  });
}
