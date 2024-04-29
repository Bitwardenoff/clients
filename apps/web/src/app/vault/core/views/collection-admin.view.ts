import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { CollectionAccessDetailsResponse } from "@bitwarden/common/src/vault/models/response/collection.response";
import { CollectionView } from "@bitwarden/common/vault/models/view/collection.view";

import { CollectionAccessSelectionView } from "../../../admin-console/organizations/core/views/collection-access-selection.view";

export class CollectionAdminView extends CollectionView {
  groups: CollectionAccessSelectionView[] = [];
  users: CollectionAccessSelectionView[] = [];

  /**
   * Flag indicating the user has been explicitly assigned to this Collection
   */
  assigned: boolean;

  constructor(response?: CollectionAccessDetailsResponse) {
    super(response);

    if (!response) {
      return;
    }

    this.groups = response.groups
      ? response.groups.map((g) => new CollectionAccessSelectionView(g))
      : [];

    this.users = response.users
      ? response.users.map((g) => new CollectionAccessSelectionView(g))
      : [];

    this.assigned = response.assigned;
  }

  /**
   * Whether the current user can edit the collection, including user and group access
   */
  override canEdit(org: Organization, flexibleCollectionsV1Enabled: boolean): boolean {
    return org?.flexibleCollections
      ? org?.canEditAnyCollection(flexibleCollectionsV1Enabled) || this.manage
      : org?.canEditAnyCollection(flexibleCollectionsV1Enabled) ||
          (org?.canEditAssignedCollections && this.assigned);
  }

  override canDelete(org: Organization): boolean {
    return org?.flexibleCollections
      ? org?.canDeleteAnyCollection || (!org?.limitCollectionCreationDeletion && this.manage)
      : org?.canDeleteAnyCollection || (org?.canDeleteAssignedCollections && this.assigned);
  }

  /**
   * Whether the user can modify user access to this collection
   * @param org
   * @param flexibleCollectionsV1Enabled
   * @returns
   */
  canEditUserAccess(org: Organization, flexibleCollectionsV1Enabled: boolean): boolean {
    return this.canEdit(org, flexibleCollectionsV1Enabled) || org.canManageUsers;
  }
}
