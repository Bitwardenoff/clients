import { Location } from "@angular/common";
import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { first } from "rxjs/operators";

import { AttachmentsComponent as BaseAttachmentsComponent } from "@bitwarden/angular/components/attachments.component";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { CipherApiAttachmentServiceAbstraction } from "@bitwarden/common/abstractions/cipher/cipher-api-attachment.service.abstraction";
import { CipherService } from "@bitwarden/common/abstractions/cipher/cipher.service.abstraction";
import { CryptoService } from "@bitwarden/common/abstractions/crypto.service";
import { FileDownloadService } from "@bitwarden/common/abstractions/fileDownload/fileDownload.service";
import { I18nService } from "@bitwarden/common/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/abstractions/log.service";
import { PlatformUtilsService } from "@bitwarden/common/abstractions/platformUtils.service";
import { StateService } from "@bitwarden/common/abstractions/state.service";

@Component({
  selector: "app-vault-attachments",
  templateUrl: "attachments.component.html",
})
export class AttachmentsComponent extends BaseAttachmentsComponent {
  openedAttachmentsInPopup: boolean;

  constructor(
    cipherService: CipherService,
    i18nService: I18nService,
    cryptoService: CryptoService,
    platformUtilsService: PlatformUtilsService,
    apiService: ApiService,
    private location: Location,
    private route: ActivatedRoute,
    stateService: StateService,
    logService: LogService,
    fileDownloadService: FileDownloadService,
    cipherApiAttachmentService: CipherApiAttachmentServiceAbstraction
  ) {
    super(
      cipherService,
      i18nService,
      cryptoService,
      platformUtilsService,
      window,
      logService,
      stateService,
      fileDownloadService,
      cipherApiAttachmentService
    );
  }

  async ngOnInit() {
    this.route.queryParams.pipe(first()).subscribe(async (params) => {
      this.cipherId = params.cipherId;
      await this.init();
    });

    this.openedAttachmentsInPopup = history.length === 1;
  }

  back() {
    this.location.back();
  }

  close() {
    window.close();
  }
}
