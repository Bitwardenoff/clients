import { MockProxy, any } from "jest-mock-extended";

import { MigrationHelper } from "../migration-helper";
import { mockMigrationHelper } from "../migration-helper.spec";

import {
  MoveBiometricClientKeyHalfToStateProviders,
  CLIENT_KEY_HALF,
} from "./14-move-biometric-client-key-half-state-to-providers";

function exampleJSON() {
  return {
    global: {
      otherStuff: "otherStuff1",
    },
    authenticatedAccounts: ["user-1", "user-2", "user-3"],
    "user-1": {
      settings: {
        disableAutoBiometricsPrompt: false,
        biometricUnlock: true,
        dismissedBiometricRequirePasswordOnStartCallout: true,
        otherStuff: "otherStuff2",
      },
      keys: {
        biometricEncryptionClientKeyHalf: "user1-key-half",
        otherStuff: "overStuff3",
      },
      otherStuff: "otherStuff4",
    },
    "user-2": {
      keys: {
        otherStuff: "otherStuff5",
      },
      otherStuff: "otherStuff6",
    },
  };
}

function rollbackJSON() {
  return {
    "user_user-1_biometricSettings_clientKeyHalf": "user1-key-half",
    global: {
      otherStuff: "otherStuff1",
    },
    authenticatedAccounts: ["user-1", "user-2", "user-3"],
    "user-1": {
      settings: {
        disableAutoBiometricsPrompt: false,
        biometricUnlock: true,
        dismissedBiometricRequirePasswordOnStartCallout: true,
        otherStuff: "otherStuff2",
      },
      keys: {
        otherStuff: "overStuff3",
      },
      otherStuff: "otherStuff4",
    },
    "user-2": {
      keys: {
        otherStuff: "otherStuff5",
      },
      otherStuff: "otherStuff6",
    },
  };
}

describe("DesktopBiometricState migrator", () => {
  let helper: MockProxy<MigrationHelper>;
  let sut: MoveBiometricClientKeyHalfToStateProviders;

  describe("migrate", () => {
    beforeEach(() => {
      helper = mockMigrationHelper(exampleJSON(), 13);
      sut = new MoveBiometricClientKeyHalfToStateProviders(13, 14);
    });

    it("should remove biometricEncryptionClientKeyHalf from all accounts", async () => {
      await sut.migrate(helper);
      expect(helper.set).toHaveBeenCalledTimes(2);
      expect(helper.set).toHaveBeenCalledWith("user-1", {
        settings: {
          disableAutoBiometricsPrompt: false,
          biometricUnlock: true,
          dismissedBiometricRequirePasswordOnStartCallout: true,
          otherStuff: "otherStuff2",
        },
        keys: {
          otherStuff: "overStuff3",
        },
        otherStuff: "otherStuff4",
      });
      expect(helper.set).toHaveBeenCalledWith("user-2", {
        keys: {
          otherStuff: "otherStuff5",
        },
        otherStuff: "otherStuff6",
      });
    });

    it("should set biometricEncryptionClientKeyHalf value for account that have it", async () => {
      await sut.migrate(helper);

      expect(helper.setToUser).toHaveBeenCalledWith("user-1", CLIENT_KEY_HALF, "user1-key-half");
    });

    it("should not call extra setToUser", async () => {
      await sut.migrate(helper);

      expect(helper.setToUser).toHaveBeenCalledTimes(1);
    });
  });

  describe("rollback", () => {
    beforeEach(() => {
      helper = mockMigrationHelper(rollbackJSON(), 14);
      sut = new MoveBiometricClientKeyHalfToStateProviders(13, 14);
    });

    it("should null out new values", async () => {
      await sut.rollback(helper);

      expect(helper.setToUser).toHaveBeenCalledWith("user-1", CLIENT_KEY_HALF, null);
    });

    it("should add explicit value back to accounts", async () => {
      await sut.rollback(helper);

      expect(helper.set).toHaveBeenCalledTimes(1);
      expect(helper.set).toHaveBeenCalledWith("user-1", {
        settings: {
          disableAutoBiometricsPrompt: false,
          biometricUnlock: true,
          dismissedBiometricRequirePasswordOnStartCallout: true,
          otherStuff: "otherStuff2",
        },
        keys: {
          biometricEncryptionClientKeyHalf: "user1-key-half",
          otherStuff: "overStuff3",
        },
        otherStuff: "otherStuff4",
      });
    });

    it.each(["user-2", "user-3"])(
      "should not try to restore values to missing accounts",
      async (userId) => {
        await sut.rollback(helper);

        expect(helper.set).not.toHaveBeenCalledWith(userId, any());
      },
    );
  });
});
