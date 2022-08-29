import { Observable } from "rxjs";

export abstract class VaultTimeoutService {
  checkVaultTimeout: () => Promise<void>;
  lock: (userId?: string) => Promise<void>;
  logOut: (userId?: string) => Promise<void>;
  setVaultTimeoutOptions: (vaultTimeout: number, vaultTimeoutAction: string) => Promise<void>;
  getVaultTimeout$: () => Observable<number>;
  isPinLockSet: () => Promise<[boolean, boolean]>;
  isBiometricLockSet: () => Promise<boolean>;
  clear: (userId?: string) => Promise<any>;
}
