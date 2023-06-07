import { NgModule } from "@angular/core";

import { LooseComponentsModule, SharedModule } from "../../../shared";
import { PoliciesModule } from "../../organizations/policies";

import { AccountComponent } from "./account.component";
import { OrganizationSettingsRoutingModule } from "./organization-settings-routing.module";
import { SettingsComponent } from "./settings.component";
import { TwoFactorSetupComponent } from "./two-factor-setup.component";

@NgModule({
  imports: [SharedModule, LooseComponentsModule, PoliciesModule, OrganizationSettingsRoutingModule],
  declarations: [SettingsComponent, AccountComponent, TwoFactorSetupComponent],
})
export class OrganizationSettingsModule {}
