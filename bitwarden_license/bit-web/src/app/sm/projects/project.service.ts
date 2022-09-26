import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

import { AbstractEncryptService } from "@bitwarden/common/abstractions/abstractEncrypt.service";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { CryptoService } from "@bitwarden/common/abstractions/crypto.service";
import { EncString } from "@bitwarden/common/models/domain/encString";
import { SymmetricCryptoKey } from "@bitwarden/common/models/domain/symmetricCryptoKey";
import { ListResponse } from "@bitwarden/common/models/response/listResponse";
import { ProjectView } from "@bitwarden/common/models/view/projectView";

import { ProjectRequest } from "./requests/project.request";
import { ProjectResponse } from "./responses/project.response";

@Injectable({
  providedIn: "root",
})
export class ProjectService {
  protected _project = new Subject<ProjectView>();
  project$ = this._project.asObservable();

  constructor(
    private cryptoService: CryptoService,
    private apiService: ApiService,
    private encryptService: AbstractEncryptService
  ) {}

  async getByProjectId(projectId: string): Promise<ProjectView> {
    const r = await this.apiService.send("GET", "/projects/" + projectId, null, true, true);
    const projectResponse = new ProjectResponse(r);
    return await this.createProjectView(projectResponse);
  }

  async getProjects(organizationId: string): Promise<ProjectView[]> {
    const r = await this.apiService.send(
      "GET",
      "/organizations/" + organizationId + "/projects",
      null,
      true,
      true
    );
    const results = new ListResponse(r, ProjectView);

    return await this.createProjectViewList(organizationId, results);
  }

  async create(organizationId: string, projectView: ProjectView) {
    const request = await this.getProjectRequest(organizationId, projectView);
    const r = await this.apiService.send(
      "POST",
      "/organizations/" + organizationId + "/projects",
      request,
      true,
      true
    );

    this._project.next(await this.createProjectView(new ProjectResponse(r)));
  }

  async update(organizationId: string, projectView: ProjectView) {
    const request = await this.getProjectRequest(organizationId, projectView);
    const r = await this.apiService.send("PUT", "/project/" + projectView.id, request, true, true);
    this._project.next(await this.createProjectView(new ProjectResponse(r)));
  }

  private async getOrganizationKey(organizationId: string): Promise<SymmetricCryptoKey> {
    return await this.cryptoService.getOrgKey(organizationId);
  }

  private async getProjectRequest(
    organizationId: string,
    projectView: ProjectView
  ): Promise<ProjectRequest> {
    const orgKey = await this.getOrganizationKey(organizationId);
    const request = new ProjectRequest();
    const [name] = await Promise.all([this.encryptService.encrypt(projectView.name, orgKey)]);
    request.name = name.encryptedString;
    return request;
  }

  private async createProjectView(projectResponse: ProjectResponse): Promise<ProjectView> {
    const orgKey = await this.getOrganizationKey(projectResponse.organizationId);

    const projectView = new ProjectView();
    projectView.id = projectResponse.id;
    projectView.organizationId = projectResponse.organizationId;
    projectView.creationDate = projectResponse.creationDate;
    projectView.revisionDate = projectResponse.revisionDate;

    const [name] = await Promise.all([
      this.encryptService.decryptToUtf8(new EncString(projectResponse.name), orgKey),
    ]);
    projectView.name = name;

    return projectView;
  }

  private async createProjectViewList(
    organizationId: string,
    projectViewListResponse: ListResponse<ProjectView>
  ): Promise<ProjectView[]> {
    const orgKey = await this.getOrganizationKey(organizationId);

    return await Promise.all(
      projectViewListResponse.data.map(async (p: ProjectView) => {
        const projectView = new ProjectView();
        projectView.id = p.id;
        projectView.organizationId = p.organizationId;
        projectView.name = await this.encryptService.decryptToUtf8(new EncString(p.name), orgKey);
        projectView.creationDate = p.creationDate;
        projectView.revisionDate = p.revisionDate;
        return projectView;
      })
    );
  }
}
