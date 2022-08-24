import { Component, EventEmitter, Output } from "@angular/core";

import { CipherApiAdminServiceAbstraction } from "@bitwarden/common/abstractions/cipher/cipher-api-admin.service.abstraction";
import { CipherApiServiceAbstraction } from "@bitwarden/common/abstractions/cipher/cipher-api.service.abstraction";
import { CipherService } from "@bitwarden/common/abstractions/cipher/cipher.service.abstraction";
import { EventService } from "@bitwarden/common/abstractions/event.service";
import { I18nService } from "@bitwarden/common/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/abstractions/log.service";
import { OrganizationService } from "@bitwarden/common/abstractions/organization.service";
import { PasswordRepromptService } from "@bitwarden/common/abstractions/passwordReprompt.service";
import { PlatformUtilsService } from "@bitwarden/common/abstractions/platformUtils.service";
import { SearchService } from "@bitwarden/common/abstractions/search.service";
import { StateService } from "@bitwarden/common/abstractions/state.service";
import { TokenService } from "@bitwarden/common/abstractions/token.service";
import { TotpService } from "@bitwarden/common/abstractions/totp.service";
import { Organization } from "@bitwarden/common/models/domain/organization";
import { CipherView } from "@bitwarden/common/models/view/cipherView";

import { CiphersComponent as BaseCiphersComponent } from "../../vault/ciphers.component";

@Component({
  selector: "app-org-vault-ciphers",
  templateUrl: "../../vault/ciphers.component.html",
})
export class CiphersComponent extends BaseCiphersComponent {
  @Output() onEventsClicked = new EventEmitter<CipherView>();

  organization: Organization;
  accessEvents = false;

  protected allCiphers: CipherView[] = [];

  constructor(
    searchService: SearchService,
    i18nService: I18nService,
    platformUtilsService: PlatformUtilsService,
    private cipherService: CipherService,
    eventService: EventService,
    totpService: TotpService,
    passwordRepromptService: PasswordRepromptService,
    logService: LogService,
    stateService: StateService,
    organizationService: OrganizationService,
    tokenService: TokenService,
    private cipherApiAdminService: CipherApiAdminServiceAbstraction,
    cipherApiService: CipherApiServiceAbstraction
  ) {
    super(
      searchService,
      i18nService,
      platformUtilsService,
      cipherApiService,
      eventService,
      totpService,
      stateService,
      passwordRepromptService,
      logService,
      organizationService,
      tokenService
    );
  }

  async load(filter: (cipher: CipherView) => boolean = null, deleted = false) {
    this.deleted = deleted || false;
    if (this.organization.canEditAnyCollection) {
      this.accessEvents = this.organization.useEvents;
      this.allCiphers = await this.cipherApiService.getAllFromApiForOrganization(
        this.organization.id
      );
    } else {
      this.allCiphers = (await this.cipherService.getAllDecrypted()).filter(
        (c) => c.organizationId === this.organization.id
      );
    }
    await this.searchService.indexCiphers(this.organization.id, this.allCiphers);
    await this.applyFilter(filter);
    this.loaded = true;
  }

  async applyFilter(filter: (cipher: CipherView) => boolean = null) {
    if (this.organization.canViewAllCollections) {
      await super.applyFilter(filter);
    } else {
      const f = (c: CipherView) =>
        c.organizationId === this.organization.id && (filter == null || filter(c));
      await super.applyFilter(f);
    }
  }

  async search(timeout: number = null) {
    await super.search(timeout, this.allCiphers);
  }
  events(c: CipherView) {
    this.onEventsClicked.emit(c);
  }

  protected deleteCipher(id: string) {
    if (!this.organization.canEditAnyCollection) {
      return super.deleteCipher(id, this.deleted);
    }
    return this.deleted
      ? this.cipherApiAdminService.deleteCipherAdmin(id)
      : this.cipherApiAdminService.putDeleteCipherAdmin(id);
  }

  protected showFixOldAttachments(c: CipherView) {
    return this.organization.canEditAnyCollection && c.hasOldAttachments;
  }
}
