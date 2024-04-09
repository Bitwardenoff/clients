import { Component, ViewChild, ViewContainerRef } from "@angular/core";

import { ModalService } from "@bitwarden/angular/services/modal.service";
import { UserVerificationService } from "@bitwarden/common/auth/abstractions/user-verification/user-verification.service.abstraction";

import { PurgeVaultComponent } from "../../../vault/settings/purge-vault.component";

import { DeauthorizeSessionsComponent } from "./deauthorize-sessions.component";
import { DeleteAccountComponent } from "./delete-account.component";
import { DialogService } from "@bitwarden/components";
import { lastValueFrom } from "rxjs";

@Component({
  selector: "app-account",
  templateUrl: "account.component.html",
})
export class AccountComponent {
  @ViewChild("deauthorizeSessionsTemplate", { read: ViewContainerRef, static: true })
  deauthModalRef: ViewContainerRef;
  @ViewChild("deleteAccountTemplate", { read: ViewContainerRef, static: true })
  deleteModalRef: ViewContainerRef;

  showChangeEmail = true;

  constructor(
    private modalService: ModalService,
    private dialogService: DialogService,
    private userVerificationService: UserVerificationService,
  ) {}

  async ngOnInit() {
    this.showChangeEmail = await this.userVerificationService.hasMasterPassword();
  }

  async deauthorizeSessions() {
    await this.modalService.openViewRef(DeauthorizeSessionsComponent, this.deauthModalRef);
  }

  purgeVault = async () => {
    const dialogRef = PurgeVaultComponent.open(this.dialogService);
    await lastValueFrom(dialogRef.closed);
  };

  async deleteAccount() {
    await this.modalService.openViewRef(DeleteAccountComponent, this.deleteModalRef);
  }
}
