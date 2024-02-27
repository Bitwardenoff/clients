import { Component, Input, OnInit } from "@angular/core";

import { BitwardenSdkServiceAbstraction } from "@bitwarden/common/abstractions/bitwarden-sdk.service.abstraction";
import { CryptoService } from "@bitwarden/common/platform/abstractions/crypto.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";

import { SharedModule } from "../../shared.module";

@Component({
  selector: "app-account-fingerprint",
  templateUrl: "account-fingerprint.component.html",
  standalone: true,
  imports: [SharedModule],
})
export class AccountFingerprintComponent implements OnInit {
  @Input() fingerprintMaterial: string;
  @Input() publicKeyBuffer: Uint8Array;
  @Input() fingerprintLabel: string;

  protected fingerprint: string;

  constructor(
    private cryptoService: CryptoService,
    private bitwardenSdkService: BitwardenSdkServiceAbstraction,
  ) {}

  async ngOnInit() {
    const client = await this.bitwardenSdkService.getClient();
    const pubKey = this.publicKeyBuffer ?? (await this.cryptoService.getPublicKey());

    // TODO - In the future, remove this code and use the fingerprint pipe once merged
    this.fingerprint = await client.fingerprint(
      this.fingerprintMaterial,
      Utils.fromBufferToB64(pubKey),
    );
  }
}
