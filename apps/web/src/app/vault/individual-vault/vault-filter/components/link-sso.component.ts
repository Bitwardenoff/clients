import { AfterContentInit, Component, Input } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";

import { SsoComponent } from "@bitwarden/angular/auth/components/sso.component";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { EnvironmentService } from "@bitwarden/common/abstractions/environment.service";
import { PlatformUtilsService } from "@bitwarden/common/abstractions/platformUtils.service";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { AuthService } from "@bitwarden/common/auth/abstractions/auth.service";
import { CryptoFunctionService } from "@bitwarden/common/platform/abstractions/crypto-function.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { StateService } from "@bitwarden/common/platform/abstractions/state.service";
import { PasswordGenerationServiceAbstraction } from "@bitwarden/common/tools/generator/password";

@Component({
  selector: "app-link-sso",
  templateUrl: "link-sso.component.html",
})
export class LinkSsoComponent extends SsoComponent implements AfterContentInit {
  @Input() organization: Organization;
  returnUri = "/settings/organizations";

  constructor(
    platformUtilsService: PlatformUtilsService,
    i18nService: I18nService,
    apiService: ApiService,
    authService: AuthService,
    router: Router,
    route: ActivatedRoute,
    cryptoFunctionService: CryptoFunctionService,
    passwordGenerationService: PasswordGenerationServiceAbstraction,
    stateService: StateService,
    environmentService: EnvironmentService,
    logService: LogService
  ) {
    super(
      authService,
      router,
      i18nService,
      route,
      stateService,
      platformUtilsService,
      apiService,
      cryptoFunctionService,
      environmentService,
      passwordGenerationService,
      logService
    );

    this.returnUri = "/settings/organizations";
    this.redirectUri = window.location.origin + "/sso-connector.html";
    this.clientId = "web";
  }

  async ngAfterContentInit() {
    this.identifier = this.organization.identifier;
  }
}
