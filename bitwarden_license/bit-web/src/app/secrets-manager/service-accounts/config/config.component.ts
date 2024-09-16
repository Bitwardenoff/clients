import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Params } from "@angular/router";
import { Subject, concatMap, takeUntil } from "rxjs";

import { EnvironmentService } from "@bitwarden/common/platform/abstractions/environment.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { ToastService } from "@bitwarden/components";

import { ProjectListView } from "../../models/view/project-list.view";
import { ProjectService } from "../../projects/project.service";
import { AccessPolicyService } from "../../shared/access-policies/access-policy.service";

class ServiceAccountConfig {
  organizationId: string;
  serviceAccountId: string;
  identityUrl: string;
  apiUrl: string;
  projects: ProjectListView[];
}

@Component({
  selector: "sm-service-account-config",
  templateUrl: "./config.component.html",
})
export class ServiceAccountConfigComponent implements OnInit, OnDestroy {
  identityUrl: string;
  apiUrl: string;
  organizationId: string;
  serviceAccountId: string;
  projects: ProjectListView[];
  hasProjects = false;

  private destroy$ = new Subject<void>();
  loading = true;

  constructor(
    private environmentService: EnvironmentService,
    private route: ActivatedRoute,
    private platformUtilsService: PlatformUtilsService,
    private toastService: ToastService,
    private i18nService: I18nService,
    private projectService: ProjectService,
    private accessPolicyService: AccessPolicyService,
  ) {}

  async ngOnInit() {
    this.route.params
      .pipe(
        concatMap(async (params: Params) => {
          return await this.load(params.organizationId, params.serviceAccountId);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((smConfig) => {
        this.identityUrl = smConfig.identityUrl;
        this.apiUrl = smConfig.apiUrl;
        this.organizationId = smConfig.organizationId;
        this.serviceAccountId = smConfig.serviceAccountId;
        this.projects = smConfig.projects;

        this.hasProjects = smConfig.projects.length > 0;
        this.loading = false;
      });
  }

  async load(organizationId: string, serviceAccountId: string): Promise<ServiceAccountConfig> {
    const environment = await this.environmentService.getEnvironment();

    const allProjects = await this.projectService.getProjects(organizationId);
    const policies = await this.accessPolicyService.getServiceAccountGrantedPolicies(
      organizationId,
      serviceAccountId,
    );

    const ids = policies.grantedProjectPolicies.map(
      (policy) => policy.accessPolicy.grantedProjectId,
    );

    const projects = allProjects.filter((project) =>
      ids.some((projectId) => projectId === project.id),
    );

    // The machine account may have access to projects that the user does not have access to.
    // We show these on the Project tab. so add these projects to this list too.
    if (allProjects.length < policies.grantedProjectPolicies.length) {
      for (const policy of policies.grantedProjectPolicies) {
        if (!projects.some((project) => project.id === policy.accessPolicy.grantedProjectId)) {
          projects.push({
            id: policy.accessPolicy.grantedProjectId,
            name: policy.accessPolicy.grantedProjectName,
            organizationId: organizationId,
            linkable: false,
          } as ProjectListView);
        }
      }
    }

    return {
      organizationId: organizationId,
      serviceAccountId: serviceAccountId,
      identityUrl: environment.getIdentityUrl(),
      apiUrl: environment.getApiUrl(),
      projects: projects,
    } as ServiceAccountConfig;
  }

  copyIdentityUrl = () => {
    this.platformUtilsService.copyToClipboard(this.identityUrl);
    this.toastService.showToast({
      variant: "success",
      title: null,
      message: this.i18nService.t("valueCopied", this.i18nService.t("identityUrl")),
    });
  };

  copyApiUrl = () => {
    this.platformUtilsService.copyToClipboard(this.apiUrl);
    this.toastService.showToast({
      variant: "success",
      title: null,
      message: this.i18nService.t("valueCopied", this.i18nService.t("apiUrl")),
    });
  };

  copyOrganizationId = () => {
    this.platformUtilsService.copyToClipboard(this.organizationId);
    this.toastService.showToast({
      variant: "success",
      title: null,
      message: this.i18nService.t("valueCopied", this.i18nService.t("organizationId")),
    });
  };

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
