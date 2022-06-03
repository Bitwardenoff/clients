import { NgModule } from "@angular/core";

import { LooseComponentsModule } from "./modules/loose-components.module";
import { OrganizationManageModule } from "./modules/organizations/manage/organization-manage.module";
import { OrganizationUserModule } from "./modules/organizations/users/organization-user.module";
import { PipesModule } from "./modules/pipes/pipes.module";
import { SharedModule } from "./modules/shared.module";
import { VaultFilterModule } from "./modules/vault-filter/vault-filter.module";
import { OrganizationBadgeModule } from "./modules/vault/modules/organization-badge/organization-badge.module";
import {OrganizationToolsModule } from "./modules/organizations/tools/organization-tools.module";
import {OrganizationSettingsModule } from "./modules/organizations/settings/organization-settings.module";

@NgModule({
  imports: [
    SharedModule,
    LooseComponentsModule,
    VaultFilterModule,
    OrganizationBadgeModule,
    PipesModule,
    OrganizationManageModule,
    OrganizationUserModule,
    OrganizationToolsModule,
    OrganizationSettingsModule
  ],
  exports: [LooseComponentsModule, VaultFilterModule, OrganizationBadgeModule, PipesModule],
  bootstrap: [],
})
export class OssModule {}
