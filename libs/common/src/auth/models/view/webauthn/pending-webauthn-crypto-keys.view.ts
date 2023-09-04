import { EncString } from "../../../../platform/models/domain/enc-string";

export class PendingWebauthnCryptoKeysView {
  constructor(
    // TODO: Sync name with TDE
    readonly userKey: EncString,
    readonly publicKey: string,
    readonly privateKey: EncString
  ) {}
}
