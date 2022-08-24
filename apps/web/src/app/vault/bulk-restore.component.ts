import { Component, EventEmitter, Input, Output } from "@angular/core";

import { CipherApiServiceAbstraction } from "@bitwarden/common/abstractions/cipher/cipher-api.service.abstraction";
import { I18nService } from "@bitwarden/common/abstractions/i18n.service";
import { PlatformUtilsService } from "@bitwarden/common/abstractions/platformUtils.service";

@Component({
  selector: "app-vault-bulk-restore",
  templateUrl: "bulk-restore.component.html",
})
export class BulkRestoreComponent {
  @Input() cipherIds: string[] = [];
  @Output() onRestored = new EventEmitter();

  formPromise: Promise<any>;

  constructor(
    private cipherApiService: CipherApiServiceAbstraction,
    private platformUtilsService: PlatformUtilsService,
    private i18nService: I18nService
  ) {}

  async submit() {
    this.formPromise = this.cipherApiService.restoreManyWithServer(this.cipherIds);
    await this.formPromise;
    this.onRestored.emit();
    this.platformUtilsService.showToast("success", null, this.i18nService.t("restoredItems"));
  }
}
