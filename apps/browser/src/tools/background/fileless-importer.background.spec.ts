import { mock } from "jest-mock-extended";

import { PolicyService } from "@bitwarden/common/admin-console/services/policy/policy.service";
import { AuthService } from "@bitwarden/common/auth/abstractions/auth.service";
import { AuthenticationStatus } from "@bitwarden/common/auth/enums/authentication-status";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { ConfigService } from "@bitwarden/common/platform/services/config/config.service";

import NotificationBackground from "../../autofill/background/notification.background";
import { BrowserApi } from "../../platform/browser/browser-api";
import { FilelessImportPortNames, FilelessImportType } from "../enums/fileless-import.enums";

import FilelessImporterBackground from "./fileless-importer.background";

function createPortMock(name: string): chrome.runtime.Port {
  return mock<chrome.runtime.Port>({
    name,
    onMessage: {
      addListener: jest.fn(),
    },
    onDisconnect: {
      addListener: jest.fn(),
    },
  });
}

describe("FilelessImporterBackground", () => {
  let filelessImporterBackground: FilelessImporterBackground;
  const configService = mock<ConfigService>();
  const authService = mock<AuthService>();
  const notificationBackground = mock<NotificationBackground>();
  const policyService = mock<PolicyService>();

  beforeEach(() => {
    filelessImporterBackground = new FilelessImporterBackground(
      configService,
      authService,
      policyService,
      notificationBackground
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("cancelFilelessImport", () => {
    const sender = mock<chrome.runtime.MessageSender>();
    const tab = mock<chrome.tabs.Tab>();
    sender.tab = tab;

    it("sends a `closeNotificationBar` message to the sender tab", () => {
      jest.spyOn(BrowserApi, "tabSendMessageData");

      filelessImporterBackground["cancelFilelessImport"]("test", sender);

      expect(BrowserApi.tabSendMessageData).toHaveBeenCalledWith(tab, "closeNotificationBar");
    });

    it("triggers the lp importer to download the CSV", () => {
      jest.spyOn(filelessImporterBackground as any, "triggerLpImporterCsvDownload");

      filelessImporterBackground["cancelFilelessImport"](FilelessImportType.LP, sender);

      expect(filelessImporterBackground["triggerLpImporterCsvDownload"]).toHaveBeenCalled();
    });
  });

  describe("displayFilelessImportNotification", () => {
    it("injects a `requestFilelessImport` notification into passed tab", () => {
      jest.spyOn(filelessImporterBackground["notificationBackground"], "requestFilelessImport");

      const tab = mock<chrome.tabs.Tab>();

      filelessImporterBackground["displayFilelessImportNotification"](tab, FilelessImportType.LP);

      expect(
        filelessImporterBackground["notificationBackground"].requestFilelessImport
      ).toHaveBeenCalledWith(tab, FilelessImportType.LP);
    });
  });

  describe("triggerLpImporterCsvDownload", () => {
    it("posts a `triggerCsvDownload` message to the content script", () => {
      filelessImporterBackground["lpImporterPort"] = mock<chrome.runtime.Port>();

      filelessImporterBackground["triggerLpImporterCsvDownload"]();

      expect(filelessImporterBackground["lpImporterPort"].postMessage).toHaveBeenCalledWith({
        command: "triggerCsvDownload",
      });
    });

    it("disconnects the lpImporterPort", () => {
      filelessImporterBackground["lpImporterPort"] = mock<chrome.runtime.Port>();

      filelessImporterBackground["triggerLpImporterCsvDownload"]();

      expect(filelessImporterBackground["lpImporterPort"].disconnect).toHaveBeenCalled();
    });
  });

  describe("setupExtensionMessageListeners", () => {
    it("sets up a runtime onConnect listener", () => {
      filelessImporterBackground["setupExtensionMessageListeners"]();

      expect(chrome.runtime.onConnect.addListener).toHaveBeenCalledWith(
        filelessImporterBackground["handlePortOnConnect"]
      );
    });
  });

  describe("handlePortOnConnect", () => {
    it("returns early if the connected port's name is not for a fileless importer port", () => {
      const port = createPortMock("test");
      jest.spyOn(filelessImporterBackground["authService"], "getAuthStatus");
      jest.spyOn(filelessImporterBackground["configService"], "getFeatureFlag");

      filelessImporterBackground["handlePortOnConnect"](port);

      expect(filelessImporterBackground["authService"].getAuthStatus).not.toHaveBeenCalled();
      expect(filelessImporterBackground["configService"].getFeatureFlag).not.toHaveBeenCalled();
      expect(port.postMessage).not.toHaveBeenCalled();
      expect(port.disconnect).not.toHaveBeenCalled();
    });

    it("returns early if the feature flag is not set to true", async () => {
      const port = createPortMock("lp-fileless-importer");
      jest
        .spyOn(filelessImporterBackground["authService"], "getAuthStatus")
        .mockResolvedValue(AuthenticationStatus.Unlocked);
      jest
        .spyOn(filelessImporterBackground["configService"], "getFeatureFlag")
        .mockResolvedValue(false);
      jest
        .spyOn(filelessImporterBackground as any, "removeIndividualVault")
        .mockResolvedValue(false);

      await filelessImporterBackground["handlePortOnConnect"](port);

      expect(filelessImporterBackground["authService"].getAuthStatus).toHaveBeenCalled();
      expect(filelessImporterBackground["configService"].getFeatureFlag).toHaveBeenCalledWith(
        FeatureFlag.BrowserFilelessImport
      );
      expect(port.postMessage).toHaveBeenCalledWith({
        command: "verifyFeatureFlag",
        filelessImportEnabled: false,
      });
      expect(port.onMessage.addListener).not.toHaveBeenCalled();
      expect(port.onDisconnect.addListener).not.toHaveBeenCalled();
    });

    it("returns early if the user auth status is not unlocked", async () => {
      const port = createPortMock("lp-fileless-importer");
      jest
        .spyOn(filelessImporterBackground["authService"], "getAuthStatus")
        .mockResolvedValue(AuthenticationStatus.Locked);
      jest
        .spyOn(filelessImporterBackground["configService"], "getFeatureFlag")
        .mockResolvedValue(true);
      jest
        .spyOn(filelessImporterBackground as any, "removeIndividualVault")
        .mockResolvedValue(false);

      await filelessImporterBackground["handlePortOnConnect"](port);

      expect(filelessImporterBackground["authService"].getAuthStatus).toHaveBeenCalled();
      expect(filelessImporterBackground["configService"].getFeatureFlag).toHaveBeenCalledWith(
        FeatureFlag.BrowserFilelessImport
      );
      expect(port.postMessage).toHaveBeenCalledWith({
        command: "verifyFeatureFlag",
        filelessImportEnabled: false,
      });
      expect(port.onMessage.addListener).not.toHaveBeenCalled();
      expect(port.onDisconnect.addListener).not.toHaveBeenCalled();
    });

    it("returns early if the remove individual policy vault is active", async () => {
      const port = createPortMock("lp-fileless-importer");
      jest
        .spyOn(filelessImporterBackground["authService"], "getAuthStatus")
        .mockResolvedValue(AuthenticationStatus.Unlocked);
      jest
        .spyOn(filelessImporterBackground["configService"], "getFeatureFlag")
        .mockResolvedValue(true);
      jest
        .spyOn(filelessImporterBackground as any, "removeIndividualVault")
        .mockResolvedValue(true);

      await filelessImporterBackground["handlePortOnConnect"](port);

      expect(filelessImporterBackground["authService"].getAuthStatus).toHaveBeenCalled();
      expect(filelessImporterBackground["configService"].getFeatureFlag).toHaveBeenCalledWith(
        FeatureFlag.BrowserFilelessImport
      );
      expect(port.postMessage).toHaveBeenCalledWith({
        command: "verifyFeatureFlag",
        filelessImportEnabled: false,
      });
      expect(port.onMessage.addListener).not.toHaveBeenCalled();
      expect(port.onDisconnect.addListener).not.toHaveBeenCalled();
    });

    it("sets up the port's onMessage and onDisconnect listeners", async () => {
      const port = createPortMock("lp-fileless-importer");
      jest
        .spyOn(filelessImporterBackground["authService"], "getAuthStatus")
        .mockResolvedValue(AuthenticationStatus.Unlocked);
      jest
        .spyOn(filelessImporterBackground["configService"], "getFeatureFlag")
        .mockResolvedValue(true);
      jest
        .spyOn(filelessImporterBackground as any, "removeIndividualVault")
        .mockResolvedValue(false);

      await filelessImporterBackground["handlePortOnConnect"](port);

      expect(port.postMessage).toHaveBeenCalledWith({
        command: "verifyFeatureFlag",
        filelessImportEnabled: true,
      });
      expect(port.onMessage.addListener).toHaveBeenCalledWith(
        filelessImporterBackground["handleImporterPortMessage"]
      );
      expect(port.onDisconnect.addListener).toHaveBeenCalledWith(
        filelessImporterBackground["handleImporterPortDisconnect"]
      );
    });

    it("stores the importNotificationsPort", async () => {
      const port = createPortMock(FilelessImportPortNames.NotificationBar);
      jest
        .spyOn(filelessImporterBackground["authService"], "getAuthStatus")
        .mockResolvedValue(AuthenticationStatus.Unlocked);
      jest
        .spyOn(filelessImporterBackground["configService"], "getFeatureFlag")
        .mockResolvedValue(true);
      jest
        .spyOn(filelessImporterBackground as any, "removeIndividualVault")
        .mockResolvedValue(false);

      await filelessImporterBackground["handlePortOnConnect"](port);

      expect(filelessImporterBackground["importNotificationsPort"]).toEqual(port);
    });
  });

  describe("handleImporterPortMessage", () => {
    it("returns without triggering a handler if the command does not exist", () => {
      const port = mock<chrome.runtime.Port>({
        name: "lp-fileless-importer",
      });
      const message = { command: "test" };

      filelessImporterBackground["handleImporterPortMessage"](message, port);

      expect(filelessImporterBackground["lpImporterPortMessageHandlers"]["test"]).toBeUndefined();
    });

    it("triggers a handler if the command exists", () => {
      const port = mock<chrome.runtime.Port>({
        name: "lp-fileless-importer",
      });
      const message = { command: "test" };
      filelessImporterBackground["lpImporterPortMessageHandlers"]["test"] = jest.fn();

      filelessImporterBackground["handleImporterPortMessage"](message, port);

      expect(
        filelessImporterBackground["lpImporterPortMessageHandlers"]["test"]
      ).toHaveBeenCalled();
    });
  });

  describe("handleImporterPortDisconnect", () => {
    it("sets the port reference to null", () => {
      const port = mock<chrome.runtime.Port>({
        name: "lp-fileless-importer",
      });
      filelessImporterBackground["lpImporterPort"] = port;

      filelessImporterBackground["handleImporterPortDisconnect"](port);

      expect(filelessImporterBackground["lpImporterPort"]).toBeNull();
    });
  });
});
