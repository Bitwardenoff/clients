import { Component, OnInit } from "@angular/core";

import { ModalService } from "@bitwarden/angular/services/modal.service";
import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CipherType } from "@bitwarden/common/vault/enums";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { PasswordRepromptService } from "@bitwarden/vault";

import { CipherReportComponent } from "./cipher-report.component";

@Component({
  selector: "app-reused-passwords-report",
  templateUrl: "reused-passwords-report.component.html",
})
export class ReusedPasswordsReportComponent extends CipherReportComponent implements OnInit {
  passwordUseMap: Map<string, number>;
  disabled = true;

  constructor(
    protected cipherService: CipherService,
    protected organizationService: OrganizationService,
    modalService: ModalService,
    passwordRepromptService: PasswordRepromptService,
    i18nService: I18nService,
  ) {
    super(modalService, passwordRepromptService, organizationService, i18nService);
  }

  async ngOnInit() {
    await super.load();
  }

  async setCiphers() {
    const allCiphers = await this.getAllCiphers();
    const ciphersWithPasswords: CipherView[] = [];
    this.passwordUseMap = new Map<string, number>();
    this.filterStatus = [0];

    allCiphers.forEach((ciph) => {
      const { type, login, isDeleted, edit, viewPassword } = ciph;
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

      ciphersWithPasswords.push(ciph);
      if (this.passwordUseMap.has(login.password)) {
        this.passwordUseMap.set(login.password, this.passwordUseMap.get(login.password) + 1);
      } else {
        this.passwordUseMap.set(login.password, 1);
      }
    });
    const reusedPasswordCiphers = ciphersWithPasswords.filter(
      (c) =>
        this.passwordUseMap.has(c.login.password) && this.passwordUseMap.get(c.login.password) > 1,
    );

    this.ciphers = reusedPasswordCiphers.map((ciph: any) => {
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

  protected getAllCiphers(): Promise<CipherView[]> {
    return this.cipherService.getAllDecrypted();
  }

  protected canManageCipher(c: CipherView): boolean {
    // this will only ever be false from an organization view
    return true;
  }
}
