import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { AuditService } from "@bitwarden/common/abstractions/audit.service";
import { PolicyApiServiceAbstraction } from "@bitwarden/common/admin-console/abstractions/policy/policy-api.service.abstraction";
import { PolicyService } from "@bitwarden/common/admin-console/abstractions/policy/policy.service.abstraction";
import { MasterPasswordPolicyOptions } from "@bitwarden/common/admin-console/models/domain/master-password-policy-options";
import { PBKDF2KdfConfig } from "@bitwarden/common/auth/models/domain/kdf-config";
import { CryptoService } from "@bitwarden/common/platform/abstractions/crypto.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import {
  AsyncActionsModule,
  ButtonModule,
  CheckboxModule,
  DialogService,
  FormFieldModule,
  IconButtonModule,
  InputModule,
  ToastService,
} from "@bitwarden/components";

import { InputsFieldMatch } from "../../../../angular/src/auth/validators/inputs-field-match.validator";
import { SharedModule } from "../../../../components/src/shared";
import { PasswordCalloutComponent } from "../password-callout/password-callout.component";

export interface PasswordInputResult {
  masterKeyHash: string;
  kdfConfig: PBKDF2KdfConfig;
  hint: string;
}

@Component({
  standalone: true,
  selector: "auth-input-password",
  templateUrl: "./input-password.component.html",
  imports: [
    AsyncActionsModule,
    ButtonModule,
    CheckboxModule,
    FormFieldModule,
    IconButtonModule,
    InputModule,
    ReactiveFormsModule,
    SharedModule,
    PasswordCalloutComponent,
    JslibModule,
  ],
})
export class InputPasswordComponent implements OnInit {
  @Output() onPasswordFormSubmit = new EventEmitter<PasswordInputResult>();

  @Input({ required: true }) email: string;
  @Input() protected buttonText: string;
  @Input() private orgId: string;

  private minHintLength = 0;
  protected maxHintLength = 50;

  protected minPasswordLength = Utils.minimumPasswordLength;
  protected masterPasswordPolicy: MasterPasswordPolicyOptions;
  protected passwordStrengthResult: any;
  protected showErrorSummary = false;
  protected showPassword = false;

  protected formGroup = this.formBuilder.group(
    {
      password: ["", [Validators.required, Validators.minLength(this.minPasswordLength)]],
      confirmedPassword: ["", Validators.required],
      hint: [
        "", // must be string (not null) because we check length in validation
        [Validators.minLength(this.minHintLength), Validators.maxLength(this.maxHintLength)],
      ],
      checkForBreaches: true,
    },
    {
      validators: [
        InputsFieldMatch.compareInputs(
          "match",
          "password",
          "confirmedPassword",
          this.i18nService.t("masterPassDoesntMatch"),
        ),
        InputsFieldMatch.compareInputs(
          "doNotMatch",
          "password",
          "hint",
          this.i18nService.t("hintEqualsPassword"),
        ),
      ],
    },
  );

  constructor(
    private auditService: AuditService,
    private cryptoService: CryptoService,
    private dialogService: DialogService,
    private formBuilder: FormBuilder,
    private i18nService: I18nService,
    private policyService: PolicyService,
    private toastService: ToastService,
    private policyApiService: PolicyApiServiceAbstraction,
  ) {}

  async ngOnInit() {
    this.masterPasswordPolicy = await this.policyApiService.getMasterPasswordPolicyOptsForOrgUser(
      this.orgId,
    );
  }

  getPasswordStrengthResult(result: any) {
    this.passwordStrengthResult = result;
  }

  protected submit = async () => {
    this.formGroup.markAllAsTouched();

    if (this.formGroup.invalid) {
      this.showErrorSummary = true;
      return;
    }

    const password = this.formGroup.controls.password.value;

    // Check if password is breached (if breached, user chooses to accept and continue or not)
    const passwordIsBreached =
      this.formGroup.controls.checkForBreaches.value &&
      (await this.auditService.passwordLeaked(password));

    if (passwordIsBreached) {
      const userAcceptedDialog = await this.dialogService.openSimpleDialog({
        title: { key: "exposedMasterPassword" },
        content: { key: "exposedMasterPasswordDesc" },
        type: "warning",
      });

      if (!userAcceptedDialog) {
        return;
      }
    }

    // Check if password meets org policy requirements
    if (
      this.masterPasswordPolicy != null &&
      !this.policyService.evaluateMasterPassword(
        this.passwordStrengthResult.score,
        password,
        this.masterPasswordPolicy,
      )
    ) {
      this.toastService.showToast({
        variant: "error",
        title: this.i18nService.t("errorOccurred"),
        message: this.i18nService.t("masterPasswordPolicyRequirementsNotMet"),
      });

      return;
    }

    // Create and hash new master key
    const kdfConfig = new PBKDF2KdfConfig();
    const masterKey = await this.cryptoService.makeMasterKey(
      password,
      this.email.trim().toLowerCase(),
      kdfConfig,
    );
    const masterKeyHash = await this.cryptoService.hashMasterKey(password, masterKey);

    const passwordInputResult = {
      masterKeyHash,
      kdfConfig,
      hint: this.formGroup.controls.hint.value,
    };

    this.onPasswordFormSubmit.emit(passwordInputResult as PasswordInputResult);
  };
}
