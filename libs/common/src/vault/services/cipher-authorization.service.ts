import { map, Observable, of } from "rxjs";

import { CollectionId } from "@bitwarden/common/types/guid";

import { CollectionService } from "../abstractions/collection.service";
import { CipherView } from "../models/view/cipher.view";

/**
 * Service for managing user cipher authorization.
 */
export abstract class CipherAuthorizationServiceAbstraction {
  /**
   * Determines if the user can delete the specified cipher.
   *
   * @param {CipherView} cipher - The cipher used to determine if the user can delete it.
   * @param {CollectionId} [activeCollectionId] - Optional. The selected collection id from the vault filter.
   *
   * @returns {Observable<boolean>} - An observable that emits a boolean value indicating if the user can delete the cipher.
   */
  canDeleteCipher$: (cipher: CipherView, activeCollectionId?: CollectionId) => Observable<boolean>;
}

/**
 * {@link CipherAuthorizationServiceAbstraction}
 */
export class CipherAuthorizationService implements CipherAuthorizationServiceAbstraction {
  constructor(private collectionService: CollectionService) {}

  /**
   *
   * {@link CipherAuthorizationServiceAbstraction.canDeleteCipher$}
   */
  canDeleteCipher$(cipher: CipherView, activeCollectionId?: CollectionId): Observable<boolean> {
    if (cipher.organizationId == null) {
      return of(true);
    }

    return this.collectionService
      .decryptedCollectionViews$(cipher.collectionIds as CollectionId[])
      .pipe(
        map((allCollections) => {
          if (activeCollectionId) {
            const activeCollection = allCollections.find((c) => c.id === activeCollectionId);
            if (activeCollection) {
              return activeCollection.manage === true;
            }
          }

          return allCollections
            .filter((c) => cipher.collectionIds.includes(c.id))
            .some((collection) => collection.manage);
        }),
      );
  }
}
