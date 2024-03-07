import { firstValueFrom } from "rxjs";

import {
  GlobalState,
  KeyDefinition,
  REMEMBER_EMAIL_DISK,
  StateProvider,
} from "../../platform/state";
import { RememberEmailService as RememberEmailServiceAbstraction } from "../abstractions/remember-email.service";

const REMEMBERED_EMAIL = new KeyDefinition<string>(REMEMBER_EMAIL_DISK, "rememberedEmail", {
  deserializer: (rememberedEmail) => rememberedEmail,
});

export class RememberEmailService implements RememberEmailServiceAbstraction {
  private email: string;
  private rememberEmail: boolean;
  private rememberedEmailState: GlobalState<string>;

  constructor(private stateProvider: StateProvider) {
    this.rememberedEmailState = this.stateProvider.getGlobal(REMEMBERED_EMAIL);
  }

  getEmail() {
    return this.email;
  }

  getRememberEmail() {
    return this.rememberEmail;
  }

  setEmail(value: string) {
    this.email = value;
  }

  setRememberEmail(value: boolean) {
    this.rememberEmail = value;
  }

  clearValues() {
    this.email = null;
    this.rememberEmail = null;
  }

  getRememberedEmail(): Promise<string> {
    return firstValueFrom(this.rememberedEmailState.state$);
  }

  async setRememberedEmail(value: string): Promise<void> {
    await this.rememberedEmailState.update((_) => value);
  }

  async saveEmailSettings() {
    await this.setRememberedEmail(this.rememberEmail ? this.email : null);
    this.clearValues();
  }
}
