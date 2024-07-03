import { DefaultSetPasswordJitService, SetPasswordJitService } from "@bitwarden/auth/angular";
import { InternalUserDecryptionOptionsServiceAbstraction } from "@bitwarden/auth/common";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { OrganizationApiServiceAbstraction } from "@bitwarden/common/admin-console/abstractions/organization/organization-api.service.abstraction";
import { OrganizationUserService } from "@bitwarden/common/admin-console/abstractions/organization-user/organization-user.service";
import { KdfConfigService } from "@bitwarden/common/auth/abstractions/kdf-config.service";
import { InternalMasterPasswordServiceAbstraction } from "@bitwarden/common/auth/abstractions/master-password.service.abstraction";
import { CryptoService } from "@bitwarden/common/platform/abstractions/crypto.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";

import { RouterService } from "../../../../core/router.service";
import { AcceptOrganizationInviteService } from "../../../organization-invite/accept-organization.service";

export class WebSetPasswordJitService
  extends DefaultSetPasswordJitService
  implements SetPasswordJitService
{
  constructor(
    protected apiService: ApiService,
    protected cryptoService: CryptoService,
    protected i18nService: I18nService,
    protected kdfConfigService: KdfConfigService,
    protected masterPasswordService: InternalMasterPasswordServiceAbstraction,
    protected organizationApiService: OrganizationApiServiceAbstraction,
    protected organizationUserService: OrganizationUserService,
    protected userDecryptionOptionsService: InternalUserDecryptionOptionsServiceAbstraction,
    private routerService: RouterService,
    private acceptOrganizationInviteService: AcceptOrganizationInviteService,
  ) {
    super(
      apiService,
      cryptoService,
      i18nService,
      kdfConfigService,
      masterPasswordService,
      organizationApiService,
      organizationUserService,
      userDecryptionOptionsService,
    );
  }

  override async runClientSpecificLogic(): Promise<void> {
    // SSO JIT accepts org invites when setting their MP, meaning
    // we can clear the deep linked url for accepting it.
    await this.routerService.getAndClearLoginRedirectUrl();
    await this.acceptOrganizationInviteService.clearOrganizationInvitation();
  }
}
