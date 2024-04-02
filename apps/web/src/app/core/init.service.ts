import { DOCUMENT } from "@angular/common";
import { Inject, Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";

import { AbstractThemingService } from "@bitwarden/angular/platform/services/theming/theming.service.abstraction";
import { WINDOW } from "@bitwarden/angular/services/injection-tokens";
import { EventUploadService as EventUploadServiceAbstraction } from "@bitwarden/common/abstractions/event/event-upload.service";
import { NotificationsService as NotificationsServiceAbstraction } from "@bitwarden/common/abstractions/notifications.service";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { TwoFactorService as TwoFactorServiceAbstraction } from "@bitwarden/common/auth/abstractions/two-factor.service";
import { CryptoService as CryptoServiceAbstraction } from "@bitwarden/common/platform/abstractions/crypto.service";
import { EncryptService } from "@bitwarden/common/platform/abstractions/encrypt.service";
import { I18nService as I18nServiceAbstraction } from "@bitwarden/common/platform/abstractions/i18n.service";
import { StateService as StateServiceAbstraction } from "@bitwarden/common/platform/abstractions/state.service";
import { KeySuffixOptions } from "@bitwarden/common/platform/enums";
import { ContainerService } from "@bitwarden/common/platform/services/container.service";
import { EventUploadService } from "@bitwarden/common/services/event/event-upload.service";
import { VaultTimeoutService } from "@bitwarden/common/services/vault-timeout/vault-timeout.service";

@Injectable()
export class InitService {
  constructor(
    @Inject(WINDOW) private win: Window,
    private notificationsService: NotificationsServiceAbstraction,
    private vaultTimeoutService: VaultTimeoutService,
    private i18nService: I18nServiceAbstraction,
    private eventUploadService: EventUploadServiceAbstraction,
    private twoFactorService: TwoFactorServiceAbstraction,
    private stateService: StateServiceAbstraction,
    private cryptoService: CryptoServiceAbstraction,
    private themingService: AbstractThemingService,
    private encryptService: EncryptService,
    private accountService: AccountService,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  init() {
    return async () => {
      await this.stateService.init();
      await this.setUserKeyInMemoryIfAutoUserKeySet();

      setTimeout(() => this.notificationsService.init(), 3000);
      await this.vaultTimeoutService.init(true);
      await this.i18nService.init();
      (this.eventUploadService as EventUploadService).init(true);
      this.twoFactorService.init();
      const htmlEl = this.win.document.documentElement;
      htmlEl.classList.add("locale_" + this.i18nService.translationLocale);
      this.themingService.applyThemeChangesTo(this.document);
      const containerService = new ContainerService(this.cryptoService, this.encryptService);
      containerService.attachToGlobal(this.win);
    };
  }

  private async setUserKeyInMemoryIfAutoUserKeySet() {
    const activeAccount = await firstValueFrom(this.accountService.activeAccount$);
    const userId = activeAccount?.id;
    if (userId == null) {
      return;
    }

    const userKey = await this.cryptoService.getUserKeyFromStorage(KeySuffixOptions.Auto, userId);
    if (userKey == null) {
      return;
    }

    await this.cryptoService.setUserKey(userKey, userId);
  }
}
