import { Injectable } from "@angular/core";

import { BiometricsStatus } from "@bitwarden/common/key-management/biometrics/biometrics-status";
import { UserId } from "@bitwarden/common/types/guid";
import { UserKey } from "@bitwarden/common/types/key";

import { DesktopBiometricsService } from "./desktop.biometrics.service";

/**
 * This service implement the base biometrics service to provide desktop specific functions,
 * specifically for the renderer process by passing messages to the main process.
 */
@Injectable()
export class RendererBiometricsService extends DesktopBiometricsService {
  async authenticateWithBiometrics(): Promise<boolean> {
    return await ipc.keyManagement.biometric.authenticateWithBiometrics();
  }

  async getBiometricsStatus(): Promise<BiometricsStatus> {
    return await ipc.keyManagement.biometric.getBiometricsStatus();
  }

  async unlockWithBiometricsForUser(userId: UserId): Promise<UserKey | null> {
    return await ipc.keyManagement.biometric.unlockWithBiometricsForUser(userId);
  }

  async getBiometricsStatusForUser(id: UserId): Promise<BiometricsStatus> {
    return await ipc.keyManagement.biometric.getBiometricsStatusForUser(id);
  }

  async provideBiometricProtectedUnlockKeyForUser(userId: UserId, value: string): Promise<void> {
    return await ipc.keyManagement.biometric.provideBiometricUnlockKeyForUser(userId, value);
  }

  async enableBiomtricUnlockForUser(userId: UserId, unlockKey: string): Promise<boolean> {
    return await ipc.keyManagement.biometric.enableBiometricUnlockForUser(userId, unlockKey);
  }

  async disableBiometricUnlockForUser(userId: UserId): Promise<void> {
    return await ipc.keyManagement.biometric.disableBiometricUnlockForUser(userId);
  }

  async setupBiometrics(): Promise<void> {
    return await ipc.keyManagement.biometric.setupBiometrics();
  }

  async setClientKeyHalfForUser(userId: UserId, value: string): Promise<void> {
    return await ipc.keyManagement.biometric.setClientKeyHalf(userId, value);
  }

  async getShouldAutopromptNow(): Promise<boolean> {
    return await ipc.keyManagement.biometric.getShouldAutoprompt();
  }

  async setShouldAutopromptNow(value: boolean): Promise<void> {
    return await ipc.keyManagement.biometric.setShouldAutoprompt(value);
  }
}
