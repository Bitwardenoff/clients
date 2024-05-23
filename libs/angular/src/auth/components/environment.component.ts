import { Directive, EventEmitter, Output } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { firstValueFrom } from "rxjs";

import {
  EnvironmentService,
  Region,
} from "@bitwarden/common/platform/abstractions/environment.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";

import { ModalService } from "../../services/modal.service";

@Directive()
export class EnvironmentComponent {
  @Output() onSaved = new EventEmitter();
  @Output() onClose = new EventEmitter();

  iconsUrl: string;
  identityUrl: string;
  apiUrl: string;
  webVaultUrl: string;
  notificationsUrl: string;
  baseUrl: string;
  showCustom = false;

  constructor(
    protected platformUtilsService: PlatformUtilsService,
    protected environmentService: EnvironmentService,
    protected i18nService: I18nService,
    private modalService: ModalService,
  ) {
    this.environmentService.environment$.pipe(takeUntilDestroyed()).subscribe((env) => {
      if (env.getRegion() !== Region.SelfHosted) {
        this.baseUrl = "";
        this.webVaultUrl = "";
        this.apiUrl = "";
        this.identityUrl = "";
        this.iconsUrl = "";
        this.notificationsUrl = "";
        return;
      }

      const urls = env.getUrls();
      this.baseUrl = urls.base || "";
      this.webVaultUrl = urls.webVault || "";
      this.apiUrl = urls.api || "";
      this.identityUrl = urls.identity || "";
      this.iconsUrl = urls.icons || "";
      this.notificationsUrl = urls.notifications || "";
    });
  }

  async submit() {
    await this.environmentService.setEnvironment(Region.SelfHosted, {
      base: this.baseUrl,
      api: this.apiUrl,
      identity: this.identityUrl,
      webVault: this.webVaultUrl,
      icons: this.iconsUrl,
      notifications: this.notificationsUrl,
    });

    this.platformUtilsService.showToast("success", null, this.i18nService.t("environmentSaved"));
    this.saved();
  }

  toggleCustom() {
    this.showCustom = !this.showCustom;
  }

  protected saved() {
    this.onSaved.emit();
    this.modalService.closeAll();
  }

  protected async close() {
    // re-emit current env so that select based env selectors can reset to the current env
    const env = await firstValueFrom(this.environmentService.environment$);
    await this.environmentService.setEnvironment(env.getRegion(), env.getUrls());

    this.onClose.emit();
    this.modalService.closeAll();
  }
}
