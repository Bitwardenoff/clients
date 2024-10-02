import { inject, Injectable } from "@angular/core";
import { combineLatest, defer, filter, firstValueFrom, map, switchMap } from "rxjs";

import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { PolicyService } from "@bitwarden/common/admin-console/abstractions/policy/policy.service.abstraction";
import { PolicyType } from "@bitwarden/common/admin-console/enums";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { CipherId } from "@bitwarden/common/types/guid";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CollectionService } from "@bitwarden/common/vault/abstractions/collection.service";
import { CipherType } from "@bitwarden/common/vault/enums";
import { CipherData } from "@bitwarden/common/vault/models/data/cipher.data";
import { Cipher } from "@bitwarden/common/vault/models/domain/cipher";

import {
  CipherFormConfig,
  CipherFormConfigService,
  CipherFormMode,
} from "../../../../../../../libs/vault/src/cipher-form/abstractions/cipher-form-config.service";
import { CollectionAdminService } from "../../core/collection-admin.service";
import { RoutedVaultFilterService } from "../../individual-vault/vault-filter/services/routed-vault-filter.service";

/** Admin Console implementation of the `CipherFormConfigService`. */
@Injectable()
export class AdminConsoleCipherFormConfigService implements CipherFormConfigService {
  private policyService: PolicyService = inject(PolicyService);
  private organizationService: OrganizationService = inject(OrganizationService);
  private cipherService: CipherService = inject(CipherService);
  private collectionService: CollectionService = inject(CollectionService);
  private routedVaultFilterService: RoutedVaultFilterService = inject(RoutedVaultFilterService);
  private collectionAdminService: CollectionAdminService = inject(CollectionAdminService);
  private apiService: ApiService = inject(ApiService);

  private allowPersonalOwnership$ = this.policyService
    .policyAppliesToActiveUser$(PolicyType.PersonalOwnership)
    .pipe(map((p) => !p));

  private organizationId$ = this.routedVaultFilterService.filter$.pipe(
    map((filter) => filter.organizationId),
    filter((filter) => filter !== undefined),
  );

  private organization$ = this.organizationId$.pipe(
    switchMap((organizationId) => this.organizationService.get$(organizationId)),
  );

  private allCollectionsWithoutUnassigned$ = combineLatest([
    this.organizationId$.pipe(switchMap((orgId) => this.collectionAdminService.getAll(orgId))),
    defer(() => this.collectionService.getAllDecrypted()),
  ]).pipe(
    map(([adminCollections, syncCollections]) => {
      const syncCollectionDict = Object.fromEntries(syncCollections.map((c) => [c.id, c]));

      return adminCollections.map((collection) => {
        const currentId: any = collection.id;

        const match = syncCollectionDict[currentId];

        if (match) {
          collection.manage = match.manage;
          collection.readOnly = match.readOnly;
          collection.hidePasswords = match.hidePasswords;
        }
        return collection;
      });
    }),
  );

  async buildConfig(
    mode: CipherFormMode,
    cipherId?: CipherId,
    cipherType?: CipherType,
  ): Promise<CipherFormConfig> {
    const [organization, allowPersonalOwnership, allCollections] = await firstValueFrom(
      combineLatest([
        this.organization$,
        this.allowPersonalOwnership$,
        this.allCollectionsWithoutUnassigned$,
      ]),
    );

    const cipher = await this.getCipher(organization, cipherId);

    const collections = allCollections.filter(
      (c) => c.organizationId === organization.id && c.assigned && !c.readOnly,
    );

    return {
      mode,
      cipherType: cipher?.type ?? cipherType ?? CipherType.Login,
      admin: organization.canEditAllCiphers ?? false,
      allowPersonalOwnership,
      originalCipher: cipher,
      collections,
      organizations: [organization], // only a single org is in context at a time
      folders: [], // folders not applicable in the admin console
      hideFolderSelection: true,
    };
  }

  private async getCipher(organization: Organization, id?: CipherId): Promise<Cipher | null> {
    if (id == null) {
      return Promise.resolve(null);
    }

    // Check to see if the user has direct access to the cipher
    const cipherFromCipherService = await this.cipherService.get(id);

    // If the organization doesn't allow admin/owners to edit all ciphers return the cipher
    if (!organization.canEditAllCiphers && cipherFromCipherService != null) {
      return cipherFromCipherService;
    }

    // Retrieve the cipher through the means of an admin
    const cipherResponse = await this.apiService.getCipherAdmin(id);
    const cipherData = new CipherData(cipherResponse);

    return new Cipher(cipherData);
  }
}
