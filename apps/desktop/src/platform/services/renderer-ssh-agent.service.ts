import { Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";

import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { AuthService } from "@bitwarden/common/auth/abstractions/auth.service";
import { AuthenticationStatus } from "@bitwarden/common/auth/enums/authentication-status";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { CommandDefinition, MessageListener } from "@bitwarden/common/platform/messaging";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CipherType } from "@bitwarden/common/vault/enums";
import { DialogService, ToastService } from "@bitwarden/components";

import { ApproveSSHRequestComponent } from "../../platform/components/approve-ssh-request";

import { DesktopSettingsService } from "./desktop-settings.service";

@Injectable({
  providedIn: "root",
})
export class RendererSshAgentService {
  constructor(
    private cipherService: CipherService,
    private logService: LogService,
    private dialogService: DialogService,
    private messageListener: MessageListener,
    private authService: AuthService,
    private accountService: AccountService,
    private toastService: ToastService,
    private i18nService: I18nService,
    private desktopSettingsService: DesktopSettingsService,
  ) {
    this.messageListener
      .messages$(new CommandDefinition("sshagent.signrequest"))
      .subscribe((message: any) => {
        (async () => {
          const cipherId = message.uuid;
          const messageId = message.id;

          ipc.platform.focusWindow();

          const activeAccountId = (await firstValueFrom(this.accountService.activeAccount$)).id;
          const isLocked =
            (await firstValueFrom(this.authService.authStatusFor$(activeAccountId))) ==
            AuthenticationStatus.Locked;
          if (isLocked) {
            this.toastService.showToast({
              variant: "info",
              title: null,
              message: this.i18nService.t("sshAgentUnlockRequired"),
            });

            const start = new Date();
            while (
              (await firstValueFrom(this.authService.authStatusFor$(activeAccountId))) ==
              AuthenticationStatus.Locked
            ) {
              await new Promise((resolve) => setTimeout(resolve, 100));
              if (new Date().getTime() - start.getTime() > 1000 * 60 * 5) {
                this.logService.error("[SSH Agent] Timeout waiting for unlock");
                this.toastService.showToast({
                  variant: "error",
                  title: null,
                  message: this.i18nService.t("sshAgentUnlockTimeout"),
                });
                await ipc.platform.sshAgent.signRequestResponse(messageId, false);
                return;
              }
            }
          }

          const decryptedCiphers = await this.cipherService.getAllDecrypted();
          const cipher = decryptedCiphers.find((cipher) => cipher.id == cipherId);

          const dialogRef = ApproveSSHRequestComponent.open(
            this.dialogService,
            cipher.name,
            this.i18nService.t("unknownApplication"),
          );
          const result = await firstValueFrom(dialogRef.closed);
          await ipc.platform.sshAgent.signRequestResponse(messageId, result);
          ipc.platform.hideWindow();
        })()
          .then(() => {})
          .catch((e) => {
            this.logService.error("Error in SSHAgent sign request: ", e);
          });
      });

    setInterval(async () => {
      if ((await firstValueFrom(this.desktopSettingsService.sshAgentEnabled$)) == false) {
        await ipc.platform.sshAgent.setKeys([]);
        return;
      }

      const ciphers = await this.cipherService.getAllDecrypted();
      if (ciphers == null) {
        await ipc.platform.sshAgent.lock();
        return;
      }

      const sshCiphers = ciphers.filter(
        (cipher) => cipher.type == CipherType.SSHKey && cipher.isDeleted == false,
      );
      const keys = sshCiphers.map((cipher) => {
        return {
          name: cipher.name,
          privateKey: cipher.sshKey.privateKey,
          cipherId: cipher.id,
        };
      });
      await ipc.platform.sshAgent.setKeys(keys);
    }, 1000);
  }
}
