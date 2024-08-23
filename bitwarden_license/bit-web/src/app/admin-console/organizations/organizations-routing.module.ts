import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { authGuard } from "@bitwarden/angular/auth/guards";
import { canAccessFeature } from "@bitwarden/angular/platform/guard/feature-flag.guard";
import { canAccessSettingsTab } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { isEnterpriseOrgGuard } from "@bitwarden/web-vault/app/admin-console/organizations/guards/is-enterprise-org.guard";
import { organizationPermissionsGuard } from "@bitwarden/web-vault/app/admin-console/organizations/guards/org-permissions.guard";
import { OrganizationLayoutComponent } from "@bitwarden/web-vault/app/admin-console/organizations/layouts/organization-layout.component";

import { SsoComponent } from "../../auth/sso/sso.component";

import { AppGuardComponent } from "./app-guard/app-guard.component";
import { DomainVerificationComponent } from "./manage/domain-verification/domain-verification.component";
import { ScimComponent } from "./manage/scim.component";

const routes: Routes = [
  {
    path: "organizations/:organizationId",
    component: OrganizationLayoutComponent,
    canActivate: [authGuard, organizationPermissionsGuard()],
    children: [
      {
        path: "settings",
        canActivate: [organizationPermissionsGuard(canAccessSettingsTab)],
        children: [
          {
            path: "domain-verification",
            component: DomainVerificationComponent,
            canActivate: [organizationPermissionsGuard((org) => org.canManageDomainVerification)],
            data: {
              titleId: "domainVerification",
            },
          },
          {
            path: "sso",
            component: SsoComponent,
            canActivate: [organizationPermissionsGuard((org) => org.canManageSso)],
            data: {
              titleId: "singleSignOn",
            },
          },
          {
            path: "scim",
            component: ScimComponent,
            canActivate: [organizationPermissionsGuard((org) => org.canManageScim)],
            data: {
              titleId: "scim",
            },
          },
          {
            path: "device-approvals",
            loadComponent: () =>
              import("./manage/device-approvals/device-approvals.component").then(
                (mod) => mod.DeviceApprovalsComponent,
              ),
            canActivate: [organizationPermissionsGuard((org) => org.canManageDeviceApprovals)],
            data: {
              titleId: "deviceApprovals",
            },
          },
        ],
      },
      {
        path: "reporting/reports",
        canActivate: [authGuard, organizationPermissionsGuard((org) => org.canAccessReports)],
        children: [
          {
            path: "member-access-report",
            loadComponent: () =>
              import(
                "../../tools/reports/member-access-report/member-access-report.component"
              ).then((mod) => mod.MemberAccessReportComponent),
            data: {
              titleId: "memberAccessReport",
            },
            canActivate: [isEnterpriseOrgGuard()],
          },
        ],
      },
      {
        path: "reporting/app-guard",
        component: AppGuardComponent,
        canActivate: [
          authGuard,
          canAccessFeature(FeatureFlag.ActionableInsights),
          organizationPermissionsGuard((org) => org.canAccessAppGuard),
        ],
        data: {
          titleId: "appGuard",
        },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OrganizationsRoutingModule {}
