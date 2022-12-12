import { CipherType } from "@bitwarden/common/enums/cipherType";
import { TreeNode } from "@bitwarden/common/models/domain/tree-node";

import { RoutedVaultFilterBridgeService } from "../../services/routed-vault-filter-bridge.service";

import { VaultFilter, VaultFilterFunction } from "./vault-filter.model";
import {
  OrganizationFilter,
  CipherTypeFilter,
  FolderFilter,
  CollectionFilter,
  CipherStatus,
} from "./vault-filter.type";

export class RoutedVaultFilterBridge implements VaultFilter {
  constructor(
    private legacyFilter: VaultFilter,
    private bridgeService: RoutedVaultFilterBridgeService
  ) {}

  get selectedOrganizationNode(): TreeNode<OrganizationFilter> {
    return this.legacyFilter.selectedOrganizationNode;
  }
  set selectedOrganizationNode(value: TreeNode<OrganizationFilter>) {
    this.bridgeService.navigate({ organizationId: value.node.id });
  }
  get selectedCipherTypeNode(): TreeNode<CipherTypeFilter> {
    return this.legacyFilter.selectedCipherTypeNode;
  }
  set selectedCipherTypeNode(value: TreeNode<CipherTypeFilter>) {
    this.bridgeService.navigate({ type: value.node.id });
  }
  get selectedFolderNode(): TreeNode<FolderFilter> {
    return this.legacyFilter.selectedFolderNode;
  }
  set selectedFolderNode(value: TreeNode<FolderFilter>) {
    this.bridgeService.navigate({ folderId: value.node.id });
  }
  get selectedCollectionNode(): TreeNode<CollectionFilter> {
    return this.legacyFilter.selectedCollectionNode;
  }
  set selectedCollectionNode(value: TreeNode<CollectionFilter>) {
    this.bridgeService.navigate({ collectionId: value.node.id });
  }

  get isFavorites(): boolean {
    return this.legacyFilter.isFavorites;
  }
  get isDeleted(): boolean {
    return this.legacyFilter.isDeleted;
  }
  get organizationId(): string {
    return this.legacyFilter.organizationId;
  }
  get cipherType(): CipherType {
    return this.legacyFilter.cipherType;
  }
  get cipherStatus(): CipherStatus {
    return this.legacyFilter.cipherStatus;
  }
  get cipherTypeId(): string {
    return this.legacyFilter.cipherTypeId;
  }
  get folderId(): string {
    return this.legacyFilter.folderId;
  }
  get collectionId(): string {
    return this.legacyFilter.collectionId;
  }
  resetFilter(): void {
    return this.legacyFilter.resetFilter();
  }
  resetOrganization(): void {
    return this.legacyFilter.resetOrganization();
  }
  buildFilter(): VaultFilterFunction {
    return this.legacyFilter.buildFilter();
  }
}
