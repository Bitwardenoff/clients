import { mock } from "jest-mock-extended";

import { postWindowMessage, sendExtensionRuntimeMessage } from "../jest/testing-utils";

describe("ContentMessageHandler", () => {
  const sendMessageSpy = jest.spyOn(chrome.runtime, "sendMessage");
  let portOnDisconnectAddListenerCallback: CallableFunction;
  chrome.runtime.connect = jest.fn(() =>
    mock<chrome.runtime.Port>({
      onDisconnect: {
        addListener: jest.fn((callback) => {
          portOnDisconnectAddListenerCallback = callback;
        }),
        removeListener: jest.fn(),
      },
    }),
  );

  beforeEach(() => {
    require("./content-message-handler");
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe("handled window messages", () => {
    it("ignores messages from other sources", () => {
      postWindowMessage({ command: "authResult" }, "https://localhost/", null);

      expect(sendMessageSpy).not.toHaveBeenCalled();
    });

    it("ignores messages without a command", () => {
      postWindowMessage({});

      expect(sendMessageSpy).not.toHaveBeenCalled();
    });

    it("sends an authResult message", () => {
      postWindowMessage({ command: "authResult", lastpass: true, code: "code", state: "state" });

      expect(sendMessageSpy).toHaveBeenCalledWith({
        command: "authResult",
        code: "code",
        state: "state",
        lastpass: true,
        referrer: "localhost",
      });
    });

    it("sends a webAuthnResult message", () => {
      postWindowMessage({ command: "webAuthnResult", data: "data", remember: true });

      expect(sendMessageSpy).toHaveBeenCalledWith({
        command: "webAuthnResult",
        data: "data",
        remember: true,
        referrer: "localhost",
      });
    });

    it("sends a duoResult message", () => {
      const mockCode = "mockCode";
      const command = "duoResult";

      postWindowMessage({ command: command, code: mockCode });

      expect(sendMessageSpy).toHaveBeenCalledWith({
        command: command,
        code: mockCode,
        referrer: "localhost",
      });
    });
  });

  describe("handled extension messages", () => {
    it("ignores the message to the extension background if it is not present in the forwardCommands list", () => {
      sendExtensionRuntimeMessage({ command: "someOtherCommand" });

      expect(sendMessageSpy).not.toHaveBeenCalled();
    });

    it("forwards the message to the extension background if it is present in the forwardCommands list", () => {
      jest.spyOn(chrome.runtime, "sendMessage").mockResolvedValue(undefined);

      sendExtensionRuntimeMessage({ command: "bgUnlockPopoutOpened" });

      expect(sendMessageSpy).toHaveBeenCalledTimes(1);
      expect(sendMessageSpy).toHaveBeenCalledWith({ command: "bgUnlockPopoutOpened" });
    });
  });

  describe("extension disconnect action", () => {
    it("removes the window message listener and the extension message listener", () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      portOnDisconnectAddListenerCallback(mock<chrome.runtime.Port>());

      expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
      expect(removeEventListenerSpy).toHaveBeenCalledWith("message", expect.any(Function));
      expect(chrome.runtime.onMessage.removeListener).toHaveBeenCalledTimes(1);
      expect(chrome.runtime.onMessage.removeListener).toHaveBeenCalledWith(expect.any(Function));
    });
  });
});
