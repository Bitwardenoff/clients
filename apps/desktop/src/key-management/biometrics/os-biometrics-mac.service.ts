import { systemPreferences } from "electron";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { passwords } from "@bitwarden/desktop-napi";

import { OsBiometricService } from "./os-biometrics.service";

const serviceName = "Bitwarden_biometric";
const storageKeySuffix = `$_user_biometric`;

export default class OsBiometricsServiceMac implements OsBiometricService {
  constructor(private i18nservice: I18nService) {}

  async authenticateBiometric(): Promise<boolean> {
    try {
      await systemPreferences.promptTouchID(this.i18nservice.t("touchIdConsentMessage"));
      return true;
    } catch {
      return false;
    }
  }

  async isBiometricsAvailable(): Promise<boolean> {
    return systemPreferences.canPromptTouchID();
  }

  async unlockWithBiometrics(userId: string, _clientkeyHalfB64: string): Promise<string | null> {
    const success = await this.authenticateBiometric();

    if (!success) {
      return null;
    }

    return await passwords.getPassword(serviceName, userId + storageKeySuffix);
  }

  async enableBiometricUnlock(
    userId: string,
    unlockKey: string,
    _clientkeyHalfB64: string,
  ): Promise<boolean> {
    if (await this.valueUpToDate(serviceName, userId + storageKeySuffix, unlockKey)) {
      return true;
    }

    // require proving biometric access in order to write the key to the keychain
    if (!(await this.authenticateBiometric())) {
      return false;
    }

    await passwords.setPassword(serviceName, userId + storageKeySuffix, unlockKey);
    return true;
  }

  async disableBiometricUnlock(userId: string): Promise<void> {
    return await passwords.deletePassword(serviceName, userId + storageKeySuffix);
  }

  async provideUnlockKey(userId: string, unlockKey: string): Promise<void> {
    if (await this.valueUpToDate(serviceName, userId + storageKeySuffix, unlockKey)) {
      return;
    } else {
      await passwords.setPassword(serviceName, userId + storageKeySuffix, unlockKey);
    }
  }

  private async valueUpToDate(service: string, key: string, value: string): Promise<boolean> {
    try {
      const existing = await passwords.getPassword(service, key);
      return existing === value;
    } catch {
      return false;
    }
  }

  async needsSetup() {
    return false;
  }

  async canAutoSetup(): Promise<boolean> {
    return false;
  }

  async setupBiometrics(): Promise<void> {}
}
