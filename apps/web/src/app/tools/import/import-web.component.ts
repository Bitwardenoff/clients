import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { firstValueFrom } from "rxjs";

import {
  OrganizationService,
  canAccessVaultTab,
} from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { ConfigServiceAbstraction } from "@bitwarden/common/platform/abstractions/config/config.service.abstraction";
import { ImportComponent } from "@bitwarden/importer/ui";

import { SharedModule } from "../../shared";

@Component({
  templateUrl: "import-web.component.html",
  standalone: true,
  imports: [SharedModule, ImportComponent],
})
export class ImportWebComponent implements OnInit {
  protected routeOrgId: string = null;
  protected loading = false;
  protected disabled = false;

  constructor(
    private route: ActivatedRoute,
    private organizationService: OrganizationService,
    private router: Router,
    private configService: ConfigServiceAbstraction
  ) {}

  ngOnInit(): void {
    this.routeOrgId = this.route.snapshot.paramMap.get("organizationId");
  }

  /**
   * Callback that is called after a successful import.
   */
  protected async onSuccessfulImport(organizationId: string): Promise<void> {
    if (!organizationId) {
      await this.router.navigate(["vault"]);
      return;
    }

    const organization = await firstValueFrom(this.organizationService.get$(organizationId));
    if (organization == null) {
      return;
    }

    if (await canAccessVaultTab(organization, this.configService)) {
      await this.router.navigate(["organizations", organizationId, "vault"]);
    }
  }
}
