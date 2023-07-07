import { DevicesApiServiceAbstraction } from "../../abstractions/devices/devices-api.service.abstraction";
import { DeviceResponse } from "../../abstractions/devices/responses/device.response";
import { AppIdService } from "../../platform/abstractions/app-id.service";
import { CryptoFunctionService } from "../../platform/abstractions/crypto-function.service";
import { CryptoService } from "../../platform/abstractions/crypto.service";
import { EncryptService } from "../../platform/abstractions/encrypt.service";
import { StateService } from "../../platform/abstractions/state.service";
import { EncString } from "../../platform/models/domain/enc-string";
import {
  SymmetricCryptoKey,
  DeviceKey,
  UserKey,
} from "../../platform/models/domain/symmetric-crypto-key";
import { CsprngArray } from "../../types/csprng";
import { DeviceTrustCryptoServiceAbstraction } from "../abstractions/device-trust-crypto.service.abstraction";

export class DeviceTrustCryptoService implements DeviceTrustCryptoServiceAbstraction {
  constructor(
    protected cryptoFunctionService: CryptoFunctionService,
    protected cryptoService: CryptoService,
    protected encryptService: EncryptService,
    protected stateService: StateService,
    protected appIdService: AppIdService,
    protected devicesApiService: DevicesApiServiceAbstraction
  ) {}

  /**
   * @description Retrieves the users choice to trust the device which can only happen after decryption
   * Note: this value should only be used once and then reset
   */
  async getUserTrustDeviceChoiceForDecryption(): Promise<boolean> {
    return await this.stateService.getUserTrustDeviceChoiceForDecryption();
  }

  async setUserTrustDeviceChoiceForDecryption(value: boolean): Promise<void> {
    await this.stateService.setUserTrustDeviceChoiceForDecryption(value);
  }

  async trustDevice(): Promise<DeviceResponse> {
    // Attempt to get user key
    const userKey: UserKey = await this.cryptoService.getUserKeyFromMemory();

    // If user key is not found, throw error
    if (!userKey) {
      throw new Error("User symmetric key not found");
    }

    // Generate deviceKey
    const deviceKey = await this.makeDeviceKey();

    // Generate asymmetric RSA key pair: devicePrivateKey, devicePublicKey
    const [devicePublicKey, devicePrivateKey] = await this.cryptoFunctionService.rsaGenerateKeyPair(
      2048
    );

    const [
      devicePublicKeyEncryptedUserKey,
      userKeyEncryptedDevicePublicKey,
      deviceKeyEncryptedDevicePrivateKey,
    ] = await Promise.all([
      // Encrypt user key with the DevicePublicKey
      this.cryptoService.rsaEncrypt(userKey.encKey, devicePublicKey),

      // Encrypt devicePublicKey with user key
      this.encryptService.encrypt(devicePublicKey, userKey),

      // Encrypt devicePrivateKey with deviceKey
      this.encryptService.encrypt(devicePrivateKey, deviceKey),
    ]);

    // Send encrypted keys to server
    const deviceIdentifier = await this.appIdService.getAppId();
    const deviceResponse = await this.devicesApiService.updateTrustedDeviceKeys(
      deviceIdentifier,
      devicePublicKeyEncryptedUserKey.encryptedString,
      userKeyEncryptedDevicePublicKey.encryptedString,
      deviceKeyEncryptedDevicePrivateKey.encryptedString
    );

    // store device key in local/secure storage if enc keys posted to server successfully
    await this.setDeviceKey(deviceKey);
    return deviceResponse;
  }

  async getDeviceKey(): Promise<DeviceKey> {
    return await this.stateService.getDeviceKey();
  }

  private async setDeviceKey(deviceKey: DeviceKey): Promise<void> {
    await this.stateService.setDeviceKey(deviceKey);
  }

  private async makeDeviceKey(): Promise<DeviceKey> {
    // Create 512-bit device key
    const randomBytes: CsprngArray = await this.cryptoFunctionService.randomBytes(64);
    const deviceKey = new SymmetricCryptoKey(randomBytes) as DeviceKey;

    return deviceKey;
  }

  // TODO: add tests for this method
  async decryptUserKeyWithDeviceKey(
    encryptedDevicePrivateKey: EncString,
    encryptedUserKey: EncString,
    deviceKey?: DeviceKey
  ): Promise<UserKey | null> {
    // If device key provided use it, otherwise try to retrieve from storage
    deviceKey ||= await this.getDeviceKey();

    if (!deviceKey) {
      // User doesn't have a device key anymore so device is untrusted
      return null;
    }

    // attempt to decrypt encryptedDevicePrivateKey with device key
    const devicePrivateKey = await this.encryptService.decryptToBytes(
      encryptedDevicePrivateKey,
      deviceKey
    );

    // Attempt to decrypt encryptedUserDataKey with devicePrivateKey
    const userKey = await this.cryptoService.rsaDecrypt(
      encryptedUserKey.encryptedString,
      devicePrivateKey
    );

    return new SymmetricCryptoKey(userKey) as UserKey;
  }
}
