import { KeyDefinitionLike, MigrationHelper, StateDefinitionLike } from "../migration-helper";
import { Migrator } from "../migrator";

type ExpectedGlobalType = {
  enableAlwaysOnTop?: boolean;
  window?: object;
  enableTray?: boolean;
  enableMinimizeToTray?: boolean;
  enableCloseToTray?: boolean;
  enableStartToTray?: boolean;
  openAtLogin?: boolean;
  alwaysShowDock?: boolean;
};

const DESKTOP_SETTINGS_STATE: StateDefinitionLike = { name: "desktopSettings" };

const WINDOW_KEY: KeyDefinitionLike = { key: "window", stateDefinition: DESKTOP_SETTINGS_STATE };

const CLOSE_TO_TRAY_KEY: KeyDefinitionLike = {
  key: "closeToTray",
  stateDefinition: DESKTOP_SETTINGS_STATE,
};
const MINIMIZE_TO_TRAY_KEY: KeyDefinitionLike = {
  key: "minimizeToTray",
  stateDefinition: DESKTOP_SETTINGS_STATE,
};
const START_TO_TRAY_KEY: KeyDefinitionLike = {
  key: "startToTray",
  stateDefinition: DESKTOP_SETTINGS_STATE,
};
const TRAY_ENABLED_KEY: KeyDefinitionLike = {
  key: "trayEnabled",
  stateDefinition: DESKTOP_SETTINGS_STATE,
};
const OPEN_AT_LOGIN_KEY: KeyDefinitionLike = {
  key: "openAtLogin",
  stateDefinition: DESKTOP_SETTINGS_STATE,
};
const ALWAYS_SHOW_DOCK_KEY: KeyDefinitionLike = {
  key: "alwaysShowDock",
  stateDefinition: DESKTOP_SETTINGS_STATE,
};

export class MoveDesktopSettingsMigrator extends Migrator<39, 40> {
  async migrate(helper: MigrationHelper): Promise<void> {
    const legacyGlobal = await helper.get<ExpectedGlobalType>("global");

    let updatedGlobal = false;
    if (legacyGlobal?.window !== undefined) {
      await helper.setToGlobal(WINDOW_KEY, legacyGlobal.window);
      updatedGlobal = true;
      delete legacyGlobal.window;
    }

    if (legacyGlobal?.enableCloseToTray != null) {
      await helper.setToGlobal(CLOSE_TO_TRAY_KEY, legacyGlobal.enableCloseToTray);
      updatedGlobal = true;
      delete legacyGlobal.enableCloseToTray;
    }

    if (legacyGlobal?.enableMinimizeToTray != null) {
      await helper.setToGlobal(MINIMIZE_TO_TRAY_KEY, legacyGlobal.enableMinimizeToTray);
      updatedGlobal = true;
      delete legacyGlobal.enableMinimizeToTray;
    }

    if (legacyGlobal?.enableStartToTray != null) {
      await helper.setToGlobal(START_TO_TRAY_KEY, legacyGlobal.enableStartToTray);
      updatedGlobal = true;
      delete legacyGlobal.enableStartToTray;
    }

    if (legacyGlobal?.enableTray != null) {
      await helper.setToGlobal(TRAY_ENABLED_KEY, legacyGlobal.enableTray);
      updatedGlobal = true;
      delete legacyGlobal.enableTray;
    }

    if (legacyGlobal?.openAtLogin != null) {
      await helper.setToGlobal(OPEN_AT_LOGIN_KEY, legacyGlobal.openAtLogin);
      updatedGlobal = true;
      delete legacyGlobal.openAtLogin;
    }

    if (legacyGlobal?.alwaysShowDock != null) {
      await helper.setToGlobal(ALWAYS_SHOW_DOCK_KEY, legacyGlobal.alwaysShowDock);
      updatedGlobal = true;
      delete legacyGlobal.alwaysShowDock;
    }

    if (updatedGlobal) {
      await helper.set("global", legacyGlobal);
    }
  }

  async rollback(helper: MigrationHelper): Promise<void> {}
}
