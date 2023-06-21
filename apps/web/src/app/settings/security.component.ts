import { Component } from "@angular/core";

import { KeyConnectorService } from "@bitwarden/common/auth/abstractions/key-connector.service";
import { StateService } from "@bitwarden/common/platform/abstractions/state.service";

@Component({
  selector: "app-security",
  templateUrl: "security.component.html",
})
export class SecurityComponent {
  showChangePassword = true;

  constructor(
    private keyConnectorService: KeyConnectorService,
    private stateService: StateService
  ) {}

  async ngOnInit() {
    const accountDecryptionOptions = await this.stateService.getAcctDecryptionOptions();
    const hasMasterPassword =
      accountDecryptionOptions != null &&
      accountDecryptionOptions.hasMasterPassword != null &&
      accountDecryptionOptions.hasMasterPassword;
    const usesKeyConnector = await this.keyConnectorService.getUsesKeyConnector();

    this.showChangePassword = !usesKeyConnector && hasMasterPassword;
  }
}
