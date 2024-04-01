import { defer, firstValueFrom } from "rxjs";

import { UserDecryptionOptionsServiceAbstraction } from "@bitwarden/auth/common";

import { VaultTimeoutSettingsService as VaultTimeoutSettingsServiceAbstraction } from "../../abstractions/vault-timeout/vault-timeout-settings.service";
import { PolicyService } from "../../admin-console/abstractions/policy/policy.service.abstraction";
import { PolicyType } from "../../admin-console/enums";
import { TokenService } from "../../auth/abstractions/token.service";
import { VaultTimeoutAction } from "../../enums/vault-timeout-action.enum";
import { CryptoService } from "../../platform/abstractions/crypto.service";
import { StateService } from "../../platform/abstractions/state.service";
import { BiometricStateService } from "../../platform/biometrics/biometric-state.service";
import { StateProvider } from "../../platform/state";
import { UserId } from "../../types/guid";

/**
 * - DISABLED: No Pin set
 * - PERSISTENT: Pin is set and survives client reset
 * - TRANSIENT: Pin is set and requires password unlock after client reset
 */
export type PinLockType = "DISABLED" | "PERSISTANT" | "TRANSIENT";

export class VaultTimeoutSettingsService implements VaultTimeoutSettingsServiceAbstraction {
  constructor(
    private userDecryptionOptionsService: UserDecryptionOptionsServiceAbstraction,
    private cryptoService: CryptoService,
    private tokenService: TokenService,
    private policyService: PolicyService,
    private stateService: StateService,
    private biometricStateService: BiometricStateService,
    private stateProvider: StateProvider,
  ) {}

  async setVaultTimeoutOptions(timeout: number, action: VaultTimeoutAction): Promise<void> {
    // We swap these tokens from being on disk for lock actions, and in memory for logout actions
    // Get them here to set them to their new location after changing the timeout action and clearing if needed
    const accessToken = await this.tokenService.getAccessToken();
    const refreshToken = await this.tokenService.getRefreshToken();
    const clientId = await this.tokenService.getClientId();
    const clientSecret = await this.tokenService.getClientSecret();

    await this.stateService.setVaultTimeout(timeout);

    const currentAction = await this.stateService.getVaultTimeoutAction();

    if (
      (timeout != null || timeout === 0) &&
      action === VaultTimeoutAction.LogOut &&
      action !== currentAction
    ) {
      // if we have a vault timeout and the action is log out, reset tokens
      await this.tokenService.clearTokens();
    }

    await this.stateService.setVaultTimeoutAction(action);

    await this.tokenService.setTokens(accessToken, action, timeout, refreshToken, [
      clientId,
      clientSecret,
    ]);

    await this.cryptoService.refreshAdditionalKeys();
  }

  availableVaultTimeoutActions$(userId?: string) {
    return defer(() => this.getAvailableVaultTimeoutActions(userId));
  }

  async isPinLockSet(userId?: string): Promise<PinLockType> {
    // we can't check the protected pin for both because old accounts only
    // used it for MP on Restart
    const pinIsEnabled = !!(await this.stateService.getProtectedPin({ userId }));
    const aUserKeyPinIsSet = !!(await this.stateService.getPinKeyEncryptedUserKey({ userId }));
    const anOldUserKeyPinIsSet = !!(await this.stateService.getEncryptedPinProtected({ userId }));

    if (aUserKeyPinIsSet || anOldUserKeyPinIsSet) {
      return "PERSISTANT";
    } else if (pinIsEnabled && !aUserKeyPinIsSet && !anOldUserKeyPinIsSet) {
      return "TRANSIENT";
    } else {
      return "DISABLED";
    }
  }

  async isBiometricLockSet(userId?: string): Promise<boolean> {
    const biometricUnlockPromise =
      userId == null
        ? firstValueFrom(this.biometricStateService.biometricUnlockEnabled$)
        : this.biometricStateService.getBiometricUnlockEnabled(userId as UserId);
    return await biometricUnlockPromise;
  }

  async getVaultTimeout(userId?: UserId): Promise<number> {
    const currentVaultTimeout = await this.stateService.getVaultTimeout({ userId });
    const maxVaultTimeoutPolicies = await firstValueFrom(
      this.policyService.getAll$(PolicyType.MaximumVaultTimeout, userId),
    );

    if (maxVaultTimeoutPolicies?.length) {
      const maxVaultTimeoutPolicy = maxVaultTimeoutPolicies[0].data;

      // Remove negative values, and ensure it's smaller than maximum allowed value according to policy
      let policyCompliantTimeout = Math.min(currentVaultTimeout, maxVaultTimeoutPolicy.minutes);

      if (currentVaultTimeout == null || policyCompliantTimeout < 0) {
        policyCompliantTimeout = maxVaultTimeoutPolicy.minutes;
      }

      // TODO @jlf0dev: Can we move this somwhere else? Maybe add it to the initialization process?
      // ( Apparently I'm the one that reviewed the original PR that added this :) )
      // We really shouldn't need to set the value here, but multiple services relies on this value being correct.
      if (currentVaultTimeout !== policyCompliantTimeout) {
        await this.stateService.setVaultTimeout(policyCompliantTimeout, { userId });
      }

      return policyCompliantTimeout;
    }

    return currentVaultTimeout;
  }

  vaultTimeoutAction$(userId?: UserId) {
    return defer(() => this.getVaultTimeoutAction(userId));
  }

  async getVaultTimeoutAction(userId?: UserId): Promise<VaultTimeoutAction> {
    const availableVaultTimeoutActions = await this.getAvailableVaultTimeoutActions();
    if (availableVaultTimeoutActions.length === 1) {
      return availableVaultTimeoutActions[0];
    }

    const currentVaultTimeoutAction = await this.stateService.getVaultTimeoutAction({
      userId: userId,
    });
    const maxTimeoutPolicies = await firstValueFrom(
      this.policyService.getAll$(PolicyType.MaximumVaultTimeout, userId),
    );

    if (maxTimeoutPolicies?.length) {
      const policyDefinedVaultTimeoutAction = maxTimeoutPolicies[0].data.action;
      // We really shouldn't need to set the value here, but multiple services relies on this value being correct.
      if (
        policyDefinedVaultTimeoutAction &&
        currentVaultTimeoutAction !== policyDefinedVaultTimeoutAction
      ) {
        await this.stateService.setVaultTimeoutAction(policyDefinedVaultTimeoutAction, {
          userId: userId,
        });
      }
      if (
        policyDefinedVaultTimeoutAction &&
        availableVaultTimeoutActions.includes(policyDefinedVaultTimeoutAction)
      ) {
        return policyDefinedVaultTimeoutAction;
      }
    }

    if (currentVaultTimeoutAction == null) {
      // Depends on whether or not the user has a master password
      const defaultVaultTimeoutAction = (await this.userHasMasterPassword(userId))
        ? VaultTimeoutAction.Lock
        : VaultTimeoutAction.LogOut;
      // We really shouldn't need to set the value here, but multiple services relies on this value being correct.
      await this.stateService.setVaultTimeoutAction(defaultVaultTimeoutAction, { userId: userId });
      return defaultVaultTimeoutAction;
    }

    return currentVaultTimeoutAction === VaultTimeoutAction.LogOut
      ? VaultTimeoutAction.LogOut
      : VaultTimeoutAction.Lock;
  }

  private async getAvailableVaultTimeoutActions(userId?: string): Promise<VaultTimeoutAction[]> {
    const availableActions = [VaultTimeoutAction.LogOut];

    const canLock =
      (await this.userHasMasterPassword(userId)) ||
      (await this.isPinLockSet(userId)) !== "DISABLED" ||
      (await this.isBiometricLockSet(userId));

    if (canLock) {
      availableActions.push(VaultTimeoutAction.Lock);
    }

    return availableActions;
  }

  async clear(userId?: string): Promise<void> {
    await this.stateService.setEverBeenUnlocked(false, { userId: userId });
    await this.cryptoService.clearPinKeys(userId);
  }

  private async userHasMasterPassword(userId: string): Promise<boolean> {
    if (userId) {
      const decryptionOptions = await firstValueFrom(
        this.userDecryptionOptionsService.userDecryptionOptionsById$(userId),
      );

      if (decryptionOptions?.hasMasterPassword != undefined) {
        return decryptionOptions.hasMasterPassword;
      }
    }
    return await firstValueFrom(this.userDecryptionOptionsService.hasMasterPassword$);
  }
}
