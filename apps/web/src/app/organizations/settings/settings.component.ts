import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";

import { OrganizationService } from "@bitwarden/common/abstractions/organization.service";

@Component({
  selector: "app-org-settings",
  templateUrl: "settings.component.html",
})
// eslint-disable-next-line rxjs-angular/prefer-takeuntil
export class SettingsComponent {
  access2fa = false;
  accessSso = false;
  accessPolicies = false;

  constructor(private route: ActivatedRoute, private organizationService: OrganizationService) {}

  ngOnInit() {
    // eslint-disable-next-line rxjs-angular/prefer-takeuntil, rxjs/no-async-subscribe
    this.route.parent.params.subscribe(async (params) => {
      const organization = await this.organizationService.get(params.organizationId);
      this.accessSso = organization.canManageSso && organization.useSso;
      this.access2fa = organization.use2fa;
      this.accessPolicies = organization.canManagePolicies && organization.usePolicies;
    });
  }
}
