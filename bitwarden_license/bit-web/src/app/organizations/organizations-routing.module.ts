import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { AuthGuard } from "@bitwarden/angular/guards/auth.guard";
import { Organization } from "@bitwarden/common/models/domain/organization";

import { PermissionsGuard } from "src/app/organizations/guards/permissions.guard";
import { OrganizationLayoutComponent } from "src/app/organizations/layouts/organization-layout.component";
import { ManageComponent } from "src/app/organizations/manage/manage.component";
import { canAccessManageTab } from "src/app/organizations/organization-routing.module";

import { ScimComponent } from "./manage/scim.component";
import { SsoComponent } from "./manage/sso.component";

const routes: Routes = [
  {
    path: "organizations/:organizationId",
    component: OrganizationLayoutComponent,
    canActivate: [AuthGuard, PermissionsGuard],
    children: [
      {
        path: "manage",
        component: ManageComponent,
        canActivate: [PermissionsGuard],
        data: {
          permissions: canAccessManageTab,
        },
        children: [
          {
            path: "sso",
            component: SsoComponent,
            canActivate: [PermissionsGuard],
            data: {
              permissions: (org: Organization) => org.canManageSso,
            },
          },
          {
            path: "scim",
            component: ScimComponent,
            canActivate: [PermissionsGuard],
            data: {
              permissions: (org: Organization) => org.canManageScim,
            },
          },
        ],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OrganizationsRoutingModule {}
