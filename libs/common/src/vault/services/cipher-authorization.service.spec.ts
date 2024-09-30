import { mock } from "jest-mock-extended";
import { of } from "rxjs";

import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { CollectionId } from "@bitwarden/common/types/guid";

import { CollectionService } from "../abstractions/collection.service";
import { CipherView } from "../models/view/cipher.view";
import { CollectionView } from "../models/view/collection.view";

import {
  CipherAuthorizationService,
  CipherAuthorizationServiceAbstraction,
} from "./cipher-authorization.service";

describe("CipherAuthorizationService", () => {
  let cipherAuthorizationService: CipherAuthorizationServiceAbstraction;

  const mockCollectionService = mock<CollectionService>();
  const mockOrganizationService = mock<OrganizationService>();

  // Mock factories
  const createMockCipher = (
    organizationId: string | null,
    collectionIds: string[],
    edit: boolean = true,
  ) => ({
    organizationId,
    collectionIds,
    edit,
  });

  const createMockCollection = (id: string, manage: boolean) => ({
    id,
    manage,
  });

  const createMockOrganization = (
    permissions: { editAnyCollection: boolean },
    allowAdminAccessToAllCollectionItems: boolean,
    isAdmin: boolean,
  ) => ({
    permissions,
    allowAdminAccessToAllCollectionItems,
    isAdmin,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    cipherAuthorizationService = new CipherAuthorizationService(
      mockCollectionService,
      mockOrganizationService,
    );
  });

  it("should return true if cipher has no organizationId", (done) => {
    const cipher = createMockCipher(null, []) as CipherView;

    cipherAuthorizationService.canDeleteCipher$(cipher).subscribe((result) => {
      expect(result).toBe(true);
      done();
    });
  });

  it("should return true if cipher is in unassigned collection", (done) => {
    const cipher = createMockCipher("org1", []) as CipherView;

    cipherAuthorizationService.canDeleteCipher$(cipher).subscribe((result) => {
      expect(result).toBe(true);
      done();
    });
  });

  it("should return true if user has editAnyCollection permission in the org", (done) => {
    const cipher = createMockCipher("org1", ["col1"]) as CipherView;
    const organization = createMockOrganization({ editAnyCollection: true }, false, false);
    mockOrganizationService.get$.mockReturnValue(of(organization as Organization));

    cipherAuthorizationService.canDeleteCipher$(cipher).subscribe((result) => {
      expect(result).toBe(true);
      expect(mockOrganizationService.get$).toHaveBeenCalledWith("org1");
      done();
    });
  });

  it("should return true if admin access is enabled and user is admin", (done) => {
    const cipher = createMockCipher("org1", ["col1"]) as CipherView;
    const org = createMockOrganization({ editAnyCollection: false }, true, true);
    mockOrganizationService.get$.mockReturnValue(of(org as Organization));

    cipherAuthorizationService.canDeleteCipher$(cipher).subscribe((result) => {
      expect(result).toBe(true);
      expect(mockOrganizationService.get$).toHaveBeenCalledWith("org1");
      done();
    });
  });

  it("should return true if activeCollectionId is provided and has manage permission", (done) => {
    const cipher = createMockCipher("org1", ["col1", "col2"]) as CipherView;
    const activeCollectionId = "col1" as CollectionId;
    const org = createMockOrganization({ editAnyCollection: false }, false, false);
    mockOrganizationService.get$.mockReturnValue(of(org as Organization));

    const allCollections = [
      createMockCollection("col1", true),
      createMockCollection("col2", false),
    ];
    mockCollectionService.decryptedCollectionViews$.mockReturnValue(
      of(allCollections as CollectionView[]),
    );

    cipherAuthorizationService.canDeleteCipher$(cipher, activeCollectionId).subscribe((result) => {
      expect(result).toBe(true);
      expect(mockCollectionService.decryptedCollectionViews$).toHaveBeenCalledWith([
        "col1",
        "col2",
      ] as CollectionId[]);
      done();
    });
  });

  it("should return false if activeCollectionId is provided and manage permission is not present", (done) => {
    const cipher = createMockCipher("org1", ["col1", "col2"]) as CipherView;
    const activeCollectionId = "col1" as CollectionId;
    const org = createMockOrganization({ editAnyCollection: false }, false, false);
    mockOrganizationService.get$.mockReturnValue(of(org as Organization));

    const allCollections = [
      createMockCollection("col1", false),
      createMockCollection("col2", true),
    ];
    mockCollectionService.decryptedCollectionViews$.mockReturnValue(
      of(allCollections as CollectionView[]),
    );

    cipherAuthorizationService.canDeleteCipher$(cipher, activeCollectionId).subscribe((result) => {
      expect(result).toBe(false);
      expect(mockCollectionService.decryptedCollectionViews$).toHaveBeenCalledWith([
        "col1",
        "col2",
      ] as CollectionId[]);
      done();
    });
  });

  it("should return true if any collection has manage permission", (done) => {
    const cipher = createMockCipher("org1", ["col1", "col2", "col3"]) as CipherView;
    const org = createMockOrganization({ editAnyCollection: false }, false, false);
    mockOrganizationService.get$.mockReturnValue(of(org as Organization));

    const allCollections = [
      createMockCollection("col1", false),
      createMockCollection("col2", true),
      createMockCollection("col3", false),
    ];
    mockCollectionService.decryptedCollectionViews$.mockReturnValue(
      of(allCollections as CollectionView[]),
    );

    cipherAuthorizationService.canDeleteCipher$(cipher).subscribe((result) => {
      expect(result).toBe(true);
      expect(mockCollectionService.decryptedCollectionViews$).toHaveBeenCalledWith([
        "col1",
        "col2",
        "col3",
      ] as CollectionId[]);
      done();
    });
  });

  it("should return false if no collection has manage permission", (done) => {
    const cipher = createMockCipher("org1", ["col1", "col2"]) as CipherView;
    const org = createMockOrganization({ editAnyCollection: false }, false, false);
    mockOrganizationService.get$.mockReturnValue(of(org as Organization));

    const allCollections = [
      createMockCollection("col1", false),
      createMockCollection("col2", false),
    ];
    mockCollectionService.decryptedCollectionViews$.mockReturnValue(
      of(allCollections as CollectionView[]),
    );

    cipherAuthorizationService.canDeleteCipher$(cipher).subscribe((result) => {
      expect(result).toBe(false);
      expect(mockCollectionService.decryptedCollectionViews$).toHaveBeenCalledWith([
        "col1",
        "col2",
      ] as CollectionId[]);
      done();
    });
  });
});
