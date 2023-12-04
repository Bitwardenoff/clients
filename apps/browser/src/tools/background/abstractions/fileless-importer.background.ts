type ImportNotificationMessageHandlers = {
  [key: string]: ({ message, port }: { message: any; port: chrome.runtime.Port }) => void;
  cancelFilelessImport: ({ message, port }: { message: any; port: chrome.runtime.Port }) => void;
};

type LpImporterMessageHandlers = {
  [key: string]: ({ message, port }: { message: any; port: chrome.runtime.Port }) => void;
  displayLpImportNotification: ({ port }: { port: chrome.runtime.Port }) => void;
  startLpImport: ({ message }: { message: any }) => void;
};

interface FilelessImporterBackground {
  init(): void;
}

export { ImportNotificationMessageHandlers, LpImporterMessageHandlers, FilelessImporterBackground };
