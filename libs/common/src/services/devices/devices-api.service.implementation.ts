import { DevicesApiServiceAbstraction } from "../../abstractions/devices/devices-api.service.abstraction";
import { DeviceResponse } from "../../abstractions/devices/responses/device.response";
import { DeviceType } from "../../enums";
import { ListResponse } from "../../models/response/list.response";
import { Utils } from "../../platform/misc/utils";
import { ApiService } from "../api.service";

import { TrustedDeviceKeysRequest } from "./requests/trusted-device-keys.request";

export class DevicesApiServiceImplementation implements DevicesApiServiceAbstraction {
  constructor(private apiService: ApiService) {}

  async getKnownDevice(email: string, deviceIdentifier: string): Promise<boolean> {
    const r = await this.apiService.send(
      "GET",
      "/devices/knowndevice",
      null,
      false,
      true,
      null,
      (headers) => {
        headers.set("X-Device-Identifier", deviceIdentifier);
        headers.set("X-Request-Email", Utils.fromUtf8ToUrlB64(email));
      }
    );
    return r as boolean;
  }

  /**
   * Get device by identifier
   * @param deviceIdentifier - client generated id (not device id in DB)
   */
  async getDeviceByIdentifier(deviceIdentifier: string): Promise<DeviceResponse> {
    const r = await this.apiService.send(
      "GET",
      `/devices/identifier/${deviceIdentifier}`,
      null,
      true,
      true
    );
    return new DeviceResponse(r);
  }

  async getDevices(): Promise<ListResponse<DeviceResponse>> {
    const r = await this.apiService.send("GET", "/devices", null, true, true, null);
    return new ListResponse(r, DeviceResponse);
  }

  async getDevicesExistenceByTypes(deviceTypes: DeviceType[]): Promise<boolean> {
    const r = await this.apiService.send(
      "POST",
      "/devices/exist-by-types",
      deviceTypes,
      true,
      true,
      null
    );
    return Boolean(r);
  }

  async updateTrustedDeviceKeys(
    deviceIdentifier: string,
    devicePublicKeyEncryptedUserKey: string,
    userKeyEncryptedDevicePublicKey: string,
    deviceKeyEncryptedDevicePrivateKey: string
  ): Promise<DeviceResponse> {
    const request = new TrustedDeviceKeysRequest(
      devicePublicKeyEncryptedUserKey,
      userKeyEncryptedDevicePublicKey,
      deviceKeyEncryptedDevicePrivateKey
    );

    const result = await this.apiService.send(
      "PUT",
      `/devices/${deviceIdentifier}/keys`,
      request,
      true,
      true
    );

    return new DeviceResponse(result);
  }
}
