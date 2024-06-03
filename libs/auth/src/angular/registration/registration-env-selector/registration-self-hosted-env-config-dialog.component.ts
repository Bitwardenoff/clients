import { DialogRef } from "@angular/cdk/dialog";
import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
} from "@angular/forms";
import { Subject, firstValueFrom } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import {
  EnvironmentService,
  Region,
} from "@bitwarden/common/platform/abstractions/environment.service";
import {
  AsyncActionsModule,
  ButtonModule,
  DialogModule,
  DialogService,
  FormFieldModule,
  LinkModule,
  TypographyModule,
} from "@bitwarden/components";

function selfHostedEnvSettingsFormValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const formGroup = control as FormGroup;
    const baseUrl = formGroup.get("baseUrl")?.value;
    const webVaultUrl = formGroup.get("webVaultUrl")?.value;
    const apiUrl = formGroup.get("apiUrl")?.value;
    const identityUrl = formGroup.get("identityUrl")?.value;
    const iconsUrl = formGroup.get("iconsUrl")?.value;
    const notificationsUrl = formGroup.get("notificationsUrl")?.value;

    if (baseUrl || webVaultUrl || apiUrl || identityUrl || iconsUrl || notificationsUrl) {
      return null; // valid
    } else {
      return { atLeastOneUrlIsRequired: true }; // invalid
    }
  };
}

@Component({
  standalone: true,
  selector: "auth-registration-self-hosted-env-config-dialog",
  templateUrl: "registration-self-hosted-env-config-dialog.component.html",
  imports: [
    CommonModule,
    JslibModule,
    DialogModule,
    ButtonModule,
    LinkModule,
    TypographyModule,
    ReactiveFormsModule,
    FormFieldModule,
    AsyncActionsModule,
  ],
})
export class RegistrationSelfHostedEnvConfigDialogComponent implements OnInit, OnDestroy {
  static async open(dialogService: DialogService): Promise<boolean> {
    const dialogRef = dialogService.open<boolean>(RegistrationSelfHostedEnvConfigDialogComponent, {
      disableClose: false,
    });

    const dialogResult = await firstValueFrom(dialogRef.closed);

    return dialogResult;
  }

  formGroup = this.formBuilder.group(
    {
      baseUrl: [null],
      webVaultUrl: [null],
      apiUrl: [null],
      identityUrl: [null],
      iconsUrl: [null],
      notificationsUrl: [null],
    },
    { validators: selfHostedEnvSettingsFormValidator() },
  );

  get baseUrl(): FormControl {
    return this.formGroup.get("baseUrl") as FormControl;
  }

  get webVaultUrl(): FormControl {
    return this.formGroup.get("webVaultUrl") as FormControl;
  }

  get apiUrl(): FormControl {
    return this.formGroup.get("apiUrl") as FormControl;
  }

  get identityUrl(): FormControl {
    return this.formGroup.get("identityUrl") as FormControl;
  }

  get iconsUrl(): FormControl {
    return this.formGroup.get("iconsUrl") as FormControl;
  }

  get notificationsUrl(): FormControl {
    return this.formGroup.get("notificationsUrl") as FormControl;
  }

  showCustomEnv = false;
  showErrorSummary = false;

  private destroy$ = new Subject<void>();

  constructor(
    private dialogRef: DialogRef<boolean>,
    private formBuilder: FormBuilder,
    private environmentService: EnvironmentService,
  ) {}

  ngOnInit() {}

  submit = async () => {
    this.showErrorSummary = false;

    if (this.formGroup.invalid) {
      this.showErrorSummary = true;
      return;
    }

    await this.environmentService.setEnvironment(Region.SelfHosted, {
      base: this.baseUrl.value,
      api: this.apiUrl.value,
      identity: this.identityUrl.value,
      webVault: this.webVaultUrl.value,
      icons: this.iconsUrl.value,
      notifications: this.notificationsUrl.value,
    });

    this.dialogRef.close(true);
  };

  async cancel() {
    this.dialogRef.close(false);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
