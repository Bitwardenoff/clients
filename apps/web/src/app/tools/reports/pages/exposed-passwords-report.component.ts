import { Component, OnInit } from "@angular/core";

import { ModalService } from "@bitwarden/angular/services/modal.service";
import { AuditService } from "@bitwarden/common/abstractions/audit.service";
import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CipherType } from "@bitwarden/common/vault/enums";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { PasswordRepromptService } from "@bitwarden/vault";

import { CipherReportComponent } from "./cipher-report.component";

@Component({
  selector: "app-exposed-passwords-report",
  templateUrl: "exposed-passwords-report.component.html",
})
export class ExposedPasswordsReportComponent extends CipherReportComponent implements OnInit {
  exposedPasswordMap = new Map<string, number>();
  disabled = true;

  constructor(
    protected cipherService: CipherService,
    protected auditService: AuditService,
    protected organizationService: OrganizationService,
    modalService: ModalService,
    passwordRepromptService: PasswordRepromptService,
    i18nService: I18nService,
  ) {
    super(cipherService, modalService, passwordRepromptService, organizationService, i18nService);
  }

  async ngOnInit() {
    await super.load();
  }

  async setCiphers() {
    const allCiphers = await this.getAllCiphers();
    const exposedPasswordCiphers: CipherView[] = [];
    const promises: Promise<void>[] = [];
    this.filterStatus = [0];

    allCiphers.forEach((ciph: any) => {
      const { type, login, isDeleted, edit, viewPassword, id } = ciph;
      if (
        type !== CipherType.Login ||
        login.password == null ||
        login.password === "" ||
        isDeleted ||
        (!this.organization && !edit) ||
        !viewPassword
      ) {
        return;
      }

      const promise = this.auditService.passwordLeaked(login.password).then((exposedCount) => {
        if (exposedCount > 0) {
          exposedPasswordCiphers.push(ciph);
          this.exposedPasswordMap.set(id, exposedCount);
        }
      });
      promises.push(promise);
    });
    await Promise.all(promises);

    this.ciphers = exposedPasswordCiphers.map((ciph: any) => {
      ciph.orgFilterStatus = ciph.organizationId;

      if (this.filterStatus.indexOf(ciph.organizationId) === -1 && ciph.organizationId != null) {
        this.filterStatus.push(ciph.organizationId);
        this.showFilterToggle = true;
      } else if (this.filterStatus.indexOf(1) === -1 && ciph.organizationId == null) {
        this.filterStatus.splice(1, 0, 1);
        this.showFilterToggle = true;
      }
      return ciph;
    });
  }

  protected canManageCipher(c: CipherView): boolean {
    // this will only ever be false from the org view;
    return true;
  }
}
