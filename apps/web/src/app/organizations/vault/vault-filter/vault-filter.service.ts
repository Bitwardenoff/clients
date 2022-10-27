import { Injectable } from "@angular/core";
import { combineLatestWith, ReplaySubject, switchMap, takeUntil } from "rxjs";

import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { CipherService } from "@bitwarden/common/abstractions/cipher.service";
import { CollectionService } from "@bitwarden/common/abstractions/collection.service";
import { FolderService } from "@bitwarden/common/abstractions/folder/folder.service.abstraction";
import { I18nService } from "@bitwarden/common/abstractions/i18n.service";
import { OrganizationService } from "@bitwarden/common/abstractions/organization/organization.service.abstraction";
import { PolicyService } from "@bitwarden/common/abstractions/policy/policy.service.abstraction";
import { StateService } from "@bitwarden/common/abstractions/state.service";
import { CollectionData } from "@bitwarden/common/models/data/collection.data";
import { Collection } from "@bitwarden/common/models/domain/collection";
import { Organization } from "@bitwarden/common/models/domain/organization";
import { CollectionDetailsResponse } from "@bitwarden/common/models/response/collection.response";
import { CollectionView } from "@bitwarden/common/models/view/collection.view";

import { VaultFilterService as BaseVaultFilterService } from "../../../vault/vault-filter/services/vault-filter.service";

@Injectable()
export class VaultFilterService extends BaseVaultFilterService {
  protected collectionViews$ = new ReplaySubject<CollectionView[]>(1);

  constructor(
    stateService: StateService,
    organizationService: OrganizationService,
    folderService: FolderService,
    cipherService: CipherService,
    collectionService: CollectionService,
    policyService: PolicyService,
    protected apiService: ApiService,
    i18nService: I18nService
  ) {
    super(
      stateService,
      organizationService,
      folderService,
      cipherService,
      collectionService,
      policyService,
      i18nService
    );
  }

  protected loadSubscriptions() {
    this.folderService.folderViews$
      .pipe(
        combineLatestWith(this._organizationFilter),
        switchMap(async ([folders, org]) => {
          return this.filterFolders(folders, org);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(this._filteredFolders);

    this._organizationFilter
      .pipe(
        switchMap((org) => {
          return this.loadCollections(org);
        })
      )
      .subscribe(this.collectionViews$);

    this.collectionViews$
      .pipe(
        combineLatestWith(this._organizationFilter),
        switchMap(async ([collections, org]) => {
          if (org?.canUseAdminCollections) {
            return collections;
          } else {
            return await this.filterCollections(collections, org);
          }
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(this._filteredCollections);
  }

  protected async loadCollections(org: Organization) {
    if (org?.permissions && org?.canEditAnyCollection) {
      return await this.loadAdminCollections(org);
    } else {
      // TODO: remove when collections is refactored with observables
      return await this.collectionService.getAllDecrypted();
    }
  }

  async loadAdminCollections(org: Organization): Promise<CollectionView[]> {
    let collections: CollectionView[] = [];
    if (org?.permissions && org?.canEditAnyCollection) {
      const collectionResponse = await this.apiService.getCollections(org.id);
      if (collectionResponse?.data != null && collectionResponse.data.length) {
        const collectionDomains = collectionResponse.data.map(
          (r: CollectionDetailsResponse) => new Collection(new CollectionData(r))
        );
        collections = await this.collectionService.decryptMany(collectionDomains);
      }

      const noneCollection = new CollectionView();
      noneCollection.name = this.i18nService.t("unassigned");
      noneCollection.organizationId = org.id;
      collections.push(noneCollection);
    }
    return collections;
  }
}
