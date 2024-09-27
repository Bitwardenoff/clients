export interface OsBiometricService {
  /**
   * Authenticates the system user using biometrics.
   */
  authenticateBiometric(): Promise<boolean>;

  /**
   * Checks if biometrics are available on the system.
   */
  isBiometricsAvailable(): Promise<boolean>;

  /**
   * Unlocks the biometrics protected key for a user.
   * On windows, if masterpassword reprompt is activated, a clientkeyhalf should be passed in
   */
  unlockWithBiometrics(
    userId: string,
    clientKeyHalfB64: string | undefined,
  ): Promise<string | null>;

  /**
   * Enables biometrics unlock for a user. This requires user authentication.
   * If biometric unlock is already active, resolves to true
   * If biometric unlock was configured successfully, resolves to true
   * Else resolves to false
   * @param userId - the user to enable biometric unlock for
   * @param unlockKey - the key to store for unlock
   * @param clientKeyHalfB64 - the unencrypted client key half to use for encryption
   */
  enableBiometricUnlock(
    userId: string,
    unlockKey: string,
    clientKeyHalfB64: string | undefined,
  ): Promise<boolean>;

  /**
   * Disables biometric unlock and wipes any stored keys from os keychains
   * @param userId - the user to disable biometric unlock for
   */
  disableBiometricUnlock(userId: string): Promise<void>;

  /**
   * Provides the unlock key for a user. This is needed for:
   * - Ensuring the stored unlock key is up to date
   * - Handling masterpassword reprompt
   * @param userId - the user to provide the unlock key for
   * @param unlockKey - the unlock key to provide in base64
   */
  provideUnlockKey(userId: string, unlockKey: string): Promise<void>;

  /** LINUX ONLY */
  /**
   * Check whether support for biometric unlock requires setup. This can be automatic or manual.
   *
   * @returns true if biometrics support requires setup, false if it does not (is already setup, or did not require it in the first place)
   */
  needsSetup: () => Promise<boolean>;

  /**
   * Check whether biometrics can be automatically setup, or requires user interaction.
   *
   * @returns true if biometrics support can be automatically setup, false if it requires user interaction.
   */
  canAutoSetup: () => Promise<boolean>;

  /**
   * Starts automatic biometric setup, which places the required configuration files / changes the required settings.
   */
  setupBiometrics: () => Promise<void>;
}
