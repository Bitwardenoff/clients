import { OsBiometricService } from "./biometrics.service.abstraction";

export default class NoopBiometricsService implements OsBiometricService {
  constructor() {}

  async init() {}

  async osSupportsBiometric(): Promise<boolean> {
    return false;
  }

  async getBiometricEncryptedData(
    service: string,
    storageKey: string,
    clientKeyHalfB64: string,
  ): Promise<string | null> {
    return null;
  }

  async setBiometricEncryptedData(
    service: string,
    storageKey: string,
    value: string,
    clientKeyPartB64: string | undefined,
  ): Promise<void> {
    return;
  }

  async deleteBiometricEncryptedData(service: string, key: string): Promise<void> {}

  async authenticateBiometric(): Promise<boolean> {
    throw new Error("Not supported on this platform");
  }
}
