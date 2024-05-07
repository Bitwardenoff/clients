import { OrganizationUserUserDetailsResponse } from "@bitwarden/common/admin-console/abstractions/organization-user/responses";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { CollectionAccessDetailsResponse } from "@bitwarden/common/src/vault/models/response/collection.response";
import { CollectionView } from "@bitwarden/common/vault/models/view/collection.view";

import { CollectionAccessSelectionView } from "../../../admin-console/organizations/core/views/collection-access-selection.view";

export class CollectionAdminView extends CollectionView {
  groups: CollectionAccessSelectionView[] = [];
  users: CollectionAccessSelectionView[] = [];
  addAccess: boolean;

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

  groupsCanManage() {
    if (this.groups.length === 0) {
      return this.groups;
    }

    const returnedGroups = this.groups.filter((group) => {
      if (group.manage) {
        return group;
      }
    });
    return returnedGroups;
  }

  usersCanManage(revokedUsers: OrganizationUserUserDetailsResponse[]) {
    if (this.users.length === 0) {
      return this.users;
    }

    const returnedUsers = this.users.filter((user) => {
      const isRevoked = revokedUsers.some((revoked) => revoked.id === user.id);
      if (user.manage && !isRevoked) {
        return user;
      }
    });
    return returnedUsers;
  }

  /**
   * Returns true if the user can edit a collection (including user and group access) from the Admin Console.
   */
  override canEdit(org: Organization, flexibleCollectionsV1Enabled: boolean): boolean {
    return (
      org?.canEditAnyCollection(flexibleCollectionsV1Enabled) ||
      super.canEdit(org, flexibleCollectionsV1Enabled)
    );
  }

  /**
   * Returns true if the user can delete a collection from the Admin Console.
   */
  override canDelete(org: Organization): boolean {
    return org?.canDeleteAnyCollection || super.canDelete(org);
  }

  /**
   * Whether the user can modify user access to this collection
   */
  canEditUserAccess(org: Organization, flexibleCollectionsV1Enabled: boolean): boolean {
    return this.canEdit(org, flexibleCollectionsV1Enabled) || org.permissions.manageUsers;
  }

  /**
   * Whether the user can modify group access to this collection
   */
  canEditGroupAccess(org: Organization, flexibleCollectionsV1Enabled: boolean): boolean {
    return this.canEdit(org, flexibleCollectionsV1Enabled) || org.permissions.manageGroups;
  }
}
