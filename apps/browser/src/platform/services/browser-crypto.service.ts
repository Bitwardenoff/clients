import { KeySuffixOptions } from "@bitwarden/common/enums";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import {
  SymmetricCryptoKey,
  UserKey,
} from "@bitwarden/common/platform/models/domain/symmetric-crypto-key";
import { CryptoService } from "@bitwarden/common/platform/services/crypto.service";

export class BrowserCryptoService extends CryptoService {
  protected override async retrieveUserKeyFromStorage(
    keySuffix: KeySuffixOptions
  ): Promise<UserKey> {
    if (keySuffix === KeySuffixOptions.Biometric) {
      await this.platformUtilService.authenticateBiometric();
      const userKey = await this.getUserKeyFromMemory();
      if (userKey) {
        return new SymmetricCryptoKey(Utils.fromB64ToArray(userKey.keyB64).buffer) as UserKey;
      }
    }

    return await super.retrieveUserKeyFromStorage(keySuffix);
  }
}
