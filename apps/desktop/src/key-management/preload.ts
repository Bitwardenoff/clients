import { ipcRenderer } from "electron";

import { BiometricsStatus } from "@bitwarden/common/key-management/biometrics/biometrics-status";
import { UserKey } from "@bitwarden/common/types/key";

import { BiometricMessage, BiometricAction } from "../types/biometric-message";

const biometric = {
  authenticateWithBiometrics: (): Promise<boolean> =>
    ipcRenderer.invoke("biometric", {
      action: BiometricAction.Authenticate,
    } satisfies BiometricMessage),
  getBiometricsStatus: (): Promise<BiometricsStatus> =>
    ipcRenderer.invoke("biometric", {
      action: BiometricAction.GetStatus,
    } satisfies BiometricMessage),
  unlockWithBiometricsForUser: (userId: string): Promise<UserKey | null> =>
    ipcRenderer.invoke("biometric", {
      action: BiometricAction.UnlockForUser,
      userId: userId,
    } satisfies BiometricMessage),
  getBiometricsStatusForUser: (userId: string): Promise<BiometricsStatus> =>
    ipcRenderer.invoke("biometric", {
      action: BiometricAction.GetStatusForUser,
      userId: userId,
    } satisfies BiometricMessage),
  provideBiometricUnlockKeyForUser: (userId: string, value: string): Promise<void> =>
    ipcRenderer.invoke("biometric", {
      action: BiometricAction.ProvideBiometricUnlockKeyForUser,
      userId: userId,
      key: value,
    } satisfies BiometricMessage),
  enableBiometricUnlockForUser: (userId: string, value: string): Promise<boolean> =>
    ipcRenderer.invoke("biometric", {
      action: BiometricAction.EnableBiometricUnlockForUser,
      userId: userId,
      key: value,
    } satisfies BiometricMessage),
  disableBiometricUnlockForUser: (userId: string): Promise<void> =>
    ipcRenderer.invoke("biometric", {
      action: BiometricAction.DisableBiometricUnlockForUser,
      userId: userId,
    } satisfies BiometricMessage),
  setupBiometrics: (): Promise<void> =>
    ipcRenderer.invoke("biometric", {
      action: BiometricAction.Setup,
    } satisfies BiometricMessage),
  setClientKeyHalf: (userId: string, value: string): Promise<void> =>
    ipcRenderer.invoke("biometric", {
      action: BiometricAction.SetClientKeyHalf,
      userId: userId,
      key: value,
    } satisfies BiometricMessage),
  getShouldAutoprompt: (): Promise<boolean> =>
    ipcRenderer.invoke("biometric", {
      action: BiometricAction.GetShouldAutoprompt,
    } satisfies BiometricMessage),
  setShouldAutoprompt: (should: boolean): Promise<void> =>
    ipcRenderer.invoke("biometric", {
      action: BiometricAction.SetShouldAutoprompt,
      data: should,
    } satisfies BiometricMessage),
};

export default {
  biometric,
};
