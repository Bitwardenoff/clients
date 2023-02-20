import { NgModule } from "@angular/core";

import { OrganizationCreateModule } from "../admin-console/organizations/create/organization-create.module";
import { OrganizationManageModule } from "../admin-console/organizations/manage/organization-manage.module";
import { LoginModule } from "../auth/login/login.module";
import { OrganizationBadgeModule } from "../vault/individual-vault/organization-badge/organization-badge.module";
import { VaultFilterModule } from "../vault/individual-vault/vault-filter/vault-filter.module";

import { TrialInitiationModule } from "./accounts/trial-initiation/trial-initiation.module";
import { OrganizationUserModule } from "./organizations/users/organization-user.module";
import { LooseComponentsModule, SharedModule } from "./shared";

@NgModule({
  imports: [
    SharedModule,
    LooseComponentsModule,
    TrialInitiationModule,
    VaultFilterModule,
    OrganizationBadgeModule,
    OrganizationManageModule,
    OrganizationUserModule,
    OrganizationCreateModule,
    LoginModule,
  ],
  exports: [
    SharedModule,
    LooseComponentsModule,
    TrialInitiationModule,
    VaultFilterModule,
    OrganizationBadgeModule,
    LoginModule,
  ],
  bootstrap: [],
})
export class OssModule {}
