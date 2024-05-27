import { Component } from "@angular/core";
import { ActivatedRoute, RouterModule } from "@angular/router";

import { AnonLayoutComponent, ShowEnvironmentOptions } from "@bitwarden/auth/angular";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { Icon } from "@bitwarden/components";

export interface AnonLayoutWrapperData {
  pageTitle?: string;
  pageSubtitle?: string;
  pageIcon?: Icon;
  showEnvironment?: ShowEnvironmentOptions;
}

@Component({
  standalone: true,
  templateUrl: "anon-layout-wrapper.component.html",
  imports: [AnonLayoutComponent, RouterModule],
})
export class AnonLayoutWrapperComponent {
  protected pageTitle: string;
  protected pageSubtitle: string;
  protected pageIcon: Icon;
  protected showEnvironment: ShowEnvironmentOptions;

  constructor(
    private route: ActivatedRoute,
    private i18nService: I18nService,
  ) {
    this.pageTitle = this.i18nService.t(this.route.snapshot.firstChild.data["pageTitle"]);
    this.pageSubtitle = this.i18nService.t(this.route.snapshot.firstChild.data["pageSubtitle"]);
    this.pageIcon = this.route.snapshot.firstChild.data["pageIcon"];
    this.showEnvironment = this.route.snapshot.firstChild.data["showEnvironment"];
  }
}
