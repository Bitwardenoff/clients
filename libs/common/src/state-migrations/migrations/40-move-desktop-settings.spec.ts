import { runMigrator } from "../migration-helper.spec";

import { MoveDesktopSettingsMigrator } from "./40-move-desktop-settings";

describe("MoveDesktopSettings", () => {
  const sut = new MoveDesktopSettingsMigrator(39, 40);

  it("can migrate truthy values", async () => {
    const output = await runMigrator(sut, {
      authenticatedAccounts: ["user1"] as const,
      global: {
        window: {
          width: 400,
          height: 400,
          displayBounds: {
            height: 200,
            width: 200,
            x: 200,
            y: 200,
          },
        },
        enableAlwaysOnTop: true,
        enableCloseToTray: true,
        enableMinimizeToTray: true,
        enableStartToTray: true,
        enableTray: true,
        openAtLogin: true,
        alwaysShowDock: true,
      },
      user1: {
        settings: {
          enableAlwaysOnTop: true,
          minimizeOnCopyToClipboard: true,
        },
      },
    });

    expect(output).toEqual({
      authenticatedAccounts: ["user1"],
      global: {},
      global_desktopSettings_window: {
        width: 400,
        height: 400,
        displayBounds: {
          height: 200,
          width: 200,
          x: 200,
          y: 200,
        },
      },
      global_desktopSettings_alwaysOnTop: true,
      global_desktopSettings_closeToTray: true,
      global_desktopSettings_minimizeToTray: true,
      global_desktopSettings_startToTray: true,
      global_desktopSettings_trayEnabled: true,
      global_desktopSettings_openAtLogin: true,
      global_desktopSettings_alwaysShowDock: true,
      user1: {
        settings: {},
      },
      user_user1_desktopSettings_alwaysOnTop: true,
      user_user1_desktopSettings_minimizeOnCopy: true,
    });
  });

  it("can migrate falsey values", async () => {
    const output = await runMigrator(sut, {
      authenticatedAccounts: ["user1"],
      global: {
        window: null,
        enableAlwaysOnTop: false,
        enableCloseToTray: false,
        enableMinimizeToTray: false,
        enableStartToTray: false,
        enableTray: false,
        openAtLogin: false,
        alwaysShowDock: false,
      },
      user1: {
        settings: {
          enableAlwaysOnTop: false,
          minimizeOnCopyToClipboard: false,
        },
      },
    });

    expect(output).toEqual({
      authenticatedAccounts: ["user1"],
      global: {},
      global_desktopSettings_window: null,
      global_desktopSettings_alwaysOnTop: false,
      global_desktopSettings_closeToTray: false,
      global_desktopSettings_minimizeToTray: false,
      global_desktopSettings_startToTray: false,
      global_desktopSettings_trayEnabled: false,
      global_desktopSettings_openAtLogin: false,
      global_desktopSettings_alwaysShowDock: false,
      user1: {
        settings: {},
      },
      user_user1_desktopSettings_alwaysOnTop: false,
      user_user1_desktopSettings_minimizeOnCopy: false,
    });
  });
});
