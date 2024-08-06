export abstract class BiometricsServiceAbstraction {
  /**
   * Checks if the OS supports biometric authentication.
   * @returns True if the OS supports biometric authentication, false otherwise.
   */
  abstract osSupportsBiometric(): Promise<boolean>;
  /**
   * Checks to see if the user can authenticate using biometric authentication by ensuring that
   * the OS supports biometric authentication and that the user has registered a client key half if configured.
   * @param service The name of the service under which the client key half shoul be registered.
   * @param storageKey The name with which the client key half shoul be registered.
   * @param userId The `userID` for which the client key half should be registered.
   * @returns True if the user can authenticate using biometric authentication, false otherwise.
   */
  abstract canAuthBiometric({
    service,
    storageKey,
    userId,
  }: {
    service: string;
    storageKey: string;
    userId: string;
  }): Promise<boolean>;
  /**
   * Authenticates the user using biometric authentication.
   * @returns True if the user was successfully authenticated, false otherwise.
   */
  abstract authenticateBiometric(): Promise<boolean>;
  /**
   * Retrieves data from the platform's secure storage after decrypting with a biometrically-derived key.
   * @param service The name of the service under which the key is registered.
   * @param storageKey The name with which the key is stored in secure storage.
   * @returns The decrypted data, or null if the data could not be retrieved.
   */
  abstract getBiometricEncryptedData(service: string, storageKey: string): Promise<string | null>;
  /**
   * Sets data in the platform's secure storage after encrypting with a biometrically-derived key.
   * @param service The name of the service under which the data should be registered.
   * @param storageKey The name with which the data is stored in secure storage.
   * @param value The data to store.
   */
  abstract setBiometricEncryptedData(
    service: string,
    storageKey: string,
    value: string,
  ): Promise<void>;
  /**
   * Registers the client key half for encrypting and decrypting the data stored in `storageKey`. The other half is protected by the OS.
   * @param service The name of the service under which the key should be registered.
   * @param storageKey The name with which the data is stored in secure storage.
   * @param value The client-side encryption key half to store.
   */
  abstract setEncryptionKeyHalf({
    service,
    storageKey,
    value,
  }: {
    service: string;
    storageKey: string;
    value: string;
  }): void;
  /**
   * Deletes the biometrically-protected data stored under `storageKey`.
   * @param service The name of the service under which the key was registered.
   * @param storageKey The name with which the key was stored in secure storage.
   */
  abstract deleteBiometricEncryptedData(service: string, storageKey: string): Promise<void>;
}

export interface OsBiometricService {
  osSupportsBiometric(): Promise<boolean>;
  authenticateBiometric(): Promise<boolean>;
  getBiometricEncryptedData(
    service: string,
    storageKey: string,
    clientKeyHalfB64: string | undefined,
  ): Promise<string | null>;
  setBiometricEncryptedData(
    service: string,
    storageKey: string,
    value: string,
    clientKeyHalfB64: string | undefined,
  ): Promise<void>;
  deleteBiometricEncryptedData(service: string, storageKey: string): Promise<void>;
}
