import { Component, OnInit } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { first } from "rxjs/operators";

import { SsoComponent as BaseSsoComponent } from "@bitwarden/angular/auth/components/sso.component";
import {
  LoginStrategyServiceAbstraction,
  UserDecryptionOptionsServiceAbstraction,
} from "@bitwarden/auth/common";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { InternalMasterPasswordServiceAbstraction } from "@bitwarden/common/auth/abstractions/master-password.service.abstraction";
import { SsoLoginServiceAbstraction } from "@bitwarden/common/auth/abstractions/sso-login.service.abstraction";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { CryptoFunctionService } from "@bitwarden/common/platform/abstractions/crypto-function.service";
import { EnvironmentService } from "@bitwarden/common/platform/abstractions/environment.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { StateService } from "@bitwarden/common/platform/abstractions/state.service";
import { ValidationService } from "@bitwarden/common/platform/abstractions/validation.service";
import { PasswordGenerationServiceAbstraction } from "@bitwarden/generator-legacy";

@Component({
  selector: "app-sso",
  templateUrl: "sso.component.html",
})
// eslint-disable-next-line rxjs-angular/prefer-takeuntil
export class SsoComponent extends BaseSsoComponent implements OnInit {
  protected formGroup = new FormGroup({
    identifier: new FormControl(null, [Validators.required]),
  });

  get identifierFormControl() {
    return this.formGroup.controls.identifier;
  }

  constructor(
    ssoLoginService: SsoLoginServiceAbstraction,
    loginStrategyService: LoginStrategyServiceAbstraction,
    router: Router,
    i18nService: I18nService,
    route: ActivatedRoute,
    stateService: StateService,
    platformUtilsService: PlatformUtilsService,
    apiService: ApiService,
    cryptoFunctionService: CryptoFunctionService,
    environmentService: EnvironmentService,
    passwordGenerationService: PasswordGenerationServiceAbstraction,
    logService: LogService,
    private validationService: ValidationService,
    userDecryptionOptionsService: UserDecryptionOptionsServiceAbstraction,
    configService: ConfigService,
    masterPasswordService: InternalMasterPasswordServiceAbstraction,
    accountService: AccountService,
  ) {
    super(
      ssoLoginService,
      loginStrategyService,
      router,
      i18nService,
      route,
      stateService,
      platformUtilsService,
      apiService,
      cryptoFunctionService,
      environmentService,
      passwordGenerationService,
      logService,
      userDecryptionOptionsService,
      configService,
      masterPasswordService,
      accountService,
    );
    this.redirectUri = window.location.origin + "/sso-connector.html";
    this.clientId = "web";
  }

  async ngOnInit() {
    // FIXME: Verify that this floating promise is intentional. If it is, add an explanatory comment and ensure there is proper error handling.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    super.ngOnInit();

    // eslint-disable-next-line rxjs-angular/prefer-takeuntil, rxjs/no-async-subscribe
    this.route.queryParams.pipe(first()).subscribe(async (qParams) => {
      if (qParams.identifier != null) {
        // SSO Org Identifier in query params takes precedence over claimed domains
        this.identifierFormControl.setValue(qParams.identifier);
        this.loggingIn = true;
        await this.submit();
      } else {
        // Note: this flow is written for web but both browser and desktop
        // redirect here on SSO button click.
        this.loggingIn = true;

        const storedIdentifier = await this.ssoLoginService.getOrganizationSsoIdentifier();
        if (storedIdentifier != null) {
          this.identifierFormControl.setValue(storedIdentifier);
        }

        if (qParams.email && this.identifier != null) {
          await this.submit();
          return;
        }
        this.loggingIn = false;
      }
    });
  }

  submit = async () => {
    if (this.formGroup.invalid) {
      return;
    }

    const autoSubmit = (await firstValueFrom(this.route.queryParams)).identifier != null;

    this.identifier = this.identifierFormControl.value;
    await this.ssoLoginService.setOrganizationSsoIdentifier(this.identifier);
    if (this.clientId === "browser") {
      document.cookie = `ssoHandOffMessage=${this.i18nService.t("ssoHandOff")};SameSite=strict`;
    }
    try {
      await Object.getPrototypeOf(this).submit.call(this);
    } catch (error) {
      if (autoSubmit) {
        await this.router.navigate(["/login"]);
      } else {
        this.validationService.showError(error);
      }
    }
  };
}
