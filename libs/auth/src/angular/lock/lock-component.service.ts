import { Observable } from "rxjs";

import { UserId } from "@bitwarden/common/types/guid";

export enum BiometricsDisableReason {
  NotSupportedOnOperatingSystem = "NotSupportedOnOperatingSystem",
  EncryptedKeysUnavailable = "BiometricsEncryptedKeysUnavailable",
  SystemBiometricsUnavailable = "SystemBiometricsUnavailable",
}

// The options here should match the top level properties of the UnlockOptions type.
export enum UnlockOption {
  MasterPassword = "masterPassword",
  Pin = "pin",
  Biometrics = "biometrics",
}

export type UnlockOptions = {
  masterPassword: {
    enabled: boolean;
  };
  pin: {
    enabled: boolean;
  };
  biometrics: {
    enabled: boolean;
    disableReason: BiometricsDisableReason | null;
  };
};

/**
 * The LockComponentService is a service which allows the single libs/auth LockComponent to delegate all
 * client specific functionality to client specific services implementations of LockComponentService.
 */
export abstract class LockComponentService {
  // Extension
  abstract getBiometricsError(error: any): string | null;
  abstract getPreviousUrl(): string | null;

  // Desktop only
  abstract isWindowVisible(): Promise<boolean>;
  abstract getBiometricsUnlockBtnText(): string;

  // Multi client
  abstract getAvailableUnlockOptions$(userId: UserId): Observable<UnlockOptions>;
}
