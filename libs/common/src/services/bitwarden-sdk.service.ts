import {
  BitwardenClient,
  Convert,
  DeviceType as SdkDeviceType,
  // PasswordLoginKdf as SdkKdfType,
} from "@bitwarden/sdk-client";

import { BitwardenSdkServiceAbstraction } from "../abstractions/bitwarden-sdk.service.abstraction";
import { TokenService } from "../auth/abstractions/token.service";
import { DeviceType } from "../enums/device-type.enum";
import { EnvironmentService } from "../platform/abstractions/environment.service";
import { PlatformUtilsService } from "../platform/abstractions/platform-utils.service";
import { StateService } from "../platform/abstractions/state.service";
// import { KdfType } from "../platform/enums";

export class BitwardenSdkService implements BitwardenSdkServiceAbstraction {
  private client: BitwardenClient;

  constructor(
    private tokenService: TokenService,
    private environmentService: EnvironmentService,
    private platformUtilsService: PlatformUtilsService,
    private stateService: StateService,
    private userAgent: string = null,
  ) {}

  async init(): Promise<void> {
    // TODO: Subscribe to account observable
    //const kdfConfig = await this.stateService.getKdfConfig();

    // Build the SDK config. Currently consists of many internal settings that will be removed in the future.
    const settings_json = Convert.clientSettingsToJson({
      apiUrl: this.environmentService.getApiUrl(),
      identityUrl: this.environmentService.getIdentityUrl(),
      deviceType: this.toDevice(this.platformUtilsService.getDevice()),
      userAgent: this.userAgent ?? navigator.userAgent,
    });

    const module = await import("@bitwarden/sdk-wasm");
    this.client = new BitwardenClient(new module.BitwardenClient(settings_json, 2));
  }

  private toDevice(device: DeviceType): SdkDeviceType {
    switch (device) {
      case DeviceType.Android:
        return SdkDeviceType.Android;
      case DeviceType.iOS:
        return SdkDeviceType.IOS;
      case DeviceType.ChromeExtension:
        return SdkDeviceType.ChromeExtension;
      case DeviceType.FirefoxExtension:
        return SdkDeviceType.FirefoxExtension;
      case DeviceType.OperaExtension:
        return SdkDeviceType.OperaExtension;
      case DeviceType.EdgeExtension:
        return SdkDeviceType.EdgeExtension;
      case DeviceType.WindowsDesktop:
        return SdkDeviceType.WindowsDesktop;
      case DeviceType.MacOsDesktop:
        return SdkDeviceType.MACOSDesktop;
      case DeviceType.LinuxDesktop:
        return SdkDeviceType.LinuxDesktop;
      case DeviceType.ChromeBrowser:
        return SdkDeviceType.ChromeBrowser;
      case DeviceType.FirefoxBrowser:
        return SdkDeviceType.FirefoxBrowser;
      case DeviceType.OperaBrowser:
        return SdkDeviceType.OperaBrowser;
      case DeviceType.EdgeBrowser:
        return SdkDeviceType.EdgeBrowser;
      case DeviceType.IEBrowser:
        return SdkDeviceType.IEBrowser;
      case DeviceType.UnknownBrowser:
        return SdkDeviceType.UnknownBrowser;
      case DeviceType.AndroidAmazon:
        return SdkDeviceType.AndroidAmazon;
      case DeviceType.UWP:
        return SdkDeviceType.UWP;
      case DeviceType.SafariBrowser:
        return SdkDeviceType.SafariBrowser;
      case DeviceType.VivaldiBrowser:
        return SdkDeviceType.VivaldiBrowser;
      case DeviceType.VivaldiExtension:
        return SdkDeviceType.VivaldiExtension;
      case DeviceType.SafariExtension:
        return SdkDeviceType.SafariExtension;
      default:
        return SdkDeviceType.SDK;
    }
  }

  // private toKdf(kdf: KdfType): SdkKdfType {
  //   switch (kdf) {
  //     case KdfType.PBKDF2_SHA256:
  //       return {
  //         pBKDF2: {
  //           iterations: 0,
  //         },
  //       };
  //     case KdfType.Argon2id:
  //       return {
  //         argon2id: {
  //           iterations: 0,
  //           memory: 0,
  //           parallelism: 0,
  //         },
  //       };
  //   }
  // }

  async getClient(): Promise<BitwardenClient> {
    if (this.client == null) {
      await this.init();
    }

    return this.client;
  }
}
