import { Injectable } from "@angular/core";

import { BiometricsService } from "@bitwarden/common/platform/biometrics/biometric.service";

@Injectable()
export class ElectronBiometricsService extends BiometricsService {
  async supportsBiometric(): Promise<boolean> {
    return await ipc.platform.biometric.osSupported();
  }

  async isBiometricUnlockAvailable(): Promise<boolean> {
    return await ipc.platform.biometric.osSupported();
  }

  /** This method is used to authenticate the user presence _only_.
   * It should not be used in the process to retrieve
   * biometric keys, which has a separate authentication mechanism.
   * For biometric keys, invoke "keytar" with a biometric key suffix */
  async authenticateBiometric(): Promise<boolean> {
    return await ipc.platform.biometric.authenticate();
  }
}
