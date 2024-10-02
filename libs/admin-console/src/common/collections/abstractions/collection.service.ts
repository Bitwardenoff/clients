import { Observable } from "rxjs";

import { CollectionId, UserId } from "@bitwarden/common/src/types/guid";
import { TreeNode } from "@bitwarden/common/src/vault/models/domain/tree-node";

import { CollectionData, Collection, CollectionView } from "../models";

export abstract class CollectionService {
  decryptedCollections$: Observable<CollectionView[]>;

  clearActiveUserCache: () => Promise<void>;
  encrypt: (model: CollectionView) => Promise<Collection>;
  decryptedCollectionViews$: (ids: CollectionId[]) => Observable<CollectionView[]>;
  /**
   * @deprecated This method will soon be made private, use `decryptedCollectionViews$` instead.
   */
  decryptMany: (collections: Collection[]) => Promise<CollectionView[]>;
  get: (id: string) => Promise<Collection>;
  getAll: () => Promise<Collection[]>;
  getAllDecrypted: () => Promise<CollectionView[]>;
  getAllNested: (collections?: CollectionView[]) => Promise<TreeNode<CollectionView>[]>;
  getNested: (id: string) => Promise<TreeNode<CollectionView>>;
  upsert: (collection: CollectionData | CollectionData[]) => Promise<any>;
  replace: (collections: { [id: string]: CollectionData }, userId: UserId) => Promise<any>;
  clear: (userId?: string) => Promise<void>;
  delete: (id: string | string[]) => Promise<any>;
}
