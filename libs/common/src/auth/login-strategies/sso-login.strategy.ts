import { ApiService } from "../../abstractions/api.service";
import { AppIdService } from "../../platform/abstractions/app-id.service";
import { CryptoService } from "../../platform/abstractions/crypto.service";
import { LogService } from "../../platform/abstractions/log.service";
import { MessagingService } from "../../platform/abstractions/messaging.service";
import { PlatformUtilsService } from "../../platform/abstractions/platform-utils.service";
import { StateService } from "../../platform/abstractions/state.service";
import { DeviceTrustCryptoServiceAbstraction } from "../abstractions/device-trust-crypto.service.abstraction";
import { KeyConnectorService } from "../abstractions/key-connector.service";
import { TokenService } from "../abstractions/token.service";
import { TwoFactorService } from "../abstractions/two-factor.service";
import { SsoLogInCredentials } from "../models/domain/log-in-credentials";
import { SsoTokenRequest } from "../models/request/identity-token/sso-token.request";
import { IdentityTokenResponse } from "../models/response/identity-token.response";

import { LogInStrategy } from "./login.strategy";

export class SsoLogInStrategy extends LogInStrategy {
  tokenRequest: SsoTokenRequest;
  orgId: string;

  // A session token server side to serve as an authentication factor for the user
  // in order to send email OTPs to the user's configured 2FA email address
  // as we don't have a master password hash or other verifiable secret when using SSO.
  ssoEmail2FaSessionToken?: string;
  email?: string; // email not preserved through SSO process so get from server

  constructor(
    cryptoService: CryptoService,
    apiService: ApiService,
    tokenService: TokenService,
    appIdService: AppIdService,
    platformUtilsService: PlatformUtilsService,
    messagingService: MessagingService,
    logService: LogService,
    stateService: StateService,
    twoFactorService: TwoFactorService,
    private keyConnectorService: KeyConnectorService,
    private deviceTrustCryptoService: DeviceTrustCryptoServiceAbstraction
  ) {
    super(
      cryptoService,
      apiService,
      tokenService,
      appIdService,
      platformUtilsService,
      messagingService,
      logService,
      stateService,
      twoFactorService
    );
  }

  async logIn(credentials: SsoLogInCredentials) {
    this.orgId = credentials.orgId;
    this.tokenRequest = new SsoTokenRequest(
      credentials.code,
      credentials.codeVerifier,
      credentials.redirectUrl,
      await this.buildTwoFactor(credentials.twoFactor),
      await this.buildDeviceRequest()
    );

    const [ssoAuthResult] = await this.startLogIn();

    this.email = ssoAuthResult.email;
    this.ssoEmail2FaSessionToken = ssoAuthResult.ssoEmail2FaSessionToken;

    return ssoAuthResult;
  }

  protected override async setMasterKey(tokenResponse: IdentityTokenResponse) {
    const newSsoUser = tokenResponse.key == null;

    if (tokenResponse.keyConnectorUrl != null) {
      if (!newSsoUser) {
        await this.keyConnectorService.getAndSetMasterKey(tokenResponse.keyConnectorUrl);
      } else {
        await this.keyConnectorService.convertNewSsoUserToKeyConnector(tokenResponse, this.orgId);
      }
    }
  }

  protected override async setUserKey(tokenResponse: IdentityTokenResponse): Promise<void> {
    // If new user, return b/c we can't set the user key yet
    if (tokenResponse.key === null) {
      return;
    }
    // Existing user; proceed

    // User now may or may not have a master password
    // but set the master key encrypted user key if it exists regardless
    await this.cryptoService.setMasterKeyEncryptedUserKey(tokenResponse.key);

    // TODO: also admin approval request existence check should go here b/c that can give us a decrypted user key to set
    // TODO: future passkey login strategy will need to support setting user key (decrypting via TDE or admin approval request)
    // so might be worth moving this logic to a common place (base login strategy or a separate service?)

    const userDecryptionOptions = tokenResponse?.userDecryptionOptions;

    // Note: TDE and key connector are mutually exclusive
    if (userDecryptionOptions?.trustedDeviceOption) {
      await this.trySetUserKeyWithDeviceKey(tokenResponse);
    } else if (
      // TODO: remove tokenResponse.keyConnectorUrl when it's deprecated
      tokenResponse.keyConnectorUrl ||
      userDecryptionOptions?.keyConnectorOption?.keyConnectorUrl
    ) {
      await this.trySetUserKeyWithMasterKey();
    }
  }

  private async trySetUserKeyWithDeviceKey(tokenResponse: IdentityTokenResponse): Promise<void> {
    const trustedDeviceOption = tokenResponse.userDecryptionOptions?.trustedDeviceOption;

    const deviceKey = await this.deviceTrustCryptoService.getDeviceKey();
    const encDevicePrivateKey = trustedDeviceOption?.encryptedPrivateKey;
    const encUserKey = trustedDeviceOption?.encryptedUserKey;

    if (!deviceKey || !encDevicePrivateKey || !encUserKey) {
      return;
    }

    const userKey = await this.deviceTrustCryptoService.decryptUserKeyWithDeviceKey(
      encDevicePrivateKey,
      encUserKey,
      deviceKey
    );

    if (userKey) {
      await this.cryptoService.setUserKey(userKey);
    }
  }

  private async trySetUserKeyWithMasterKey(): Promise<void> {
    const masterKey = await this.cryptoService.getMasterKey();

    if (!masterKey) {
      throw new Error("Master key not found");
    }

    const userKey = await this.cryptoService.decryptUserKeyWithMasterKey(masterKey);

    await this.cryptoService.setUserKey(userKey);
  }

  protected override async setPrivateKey(tokenResponse: IdentityTokenResponse): Promise<void> {
    const newSsoUser = tokenResponse.key == null;

    if (!newSsoUser) {
      await this.cryptoService.setPrivateKey(
        tokenResponse.privateKey ?? (await this.createKeyPairForOldAccount())
      );
    }
  }
}
