import { DeviceResponse } from "./responses/device.response";

export abstract class DevicesApiServiceAbstraction {
  getKnownDevice: (email: string, deviceIdentifier: string) => Promise<boolean>;

  createTrustedDeviceKeys: (
    deviceId: string,
    devicePublicKeyEncryptedUserSymKey: string,
    userSymKeyEncryptedDevicePublicKey: string,
    deviceKeyEncryptedDevicePrivateKey: string
  ) => Promise<DeviceResponse>;

  updateTrustedDeviceKeys: (
    deviceId: string,
    devicePublicKeyEncryptedUserSymKey: string,
    userSymKeyEncryptedDevicePublicKey: string,
    deviceKeyEncryptedDevicePrivateKey: string
  ) => Promise<DeviceResponse>;
}
