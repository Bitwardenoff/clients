import { ApiService } from "../../abstractions/api.service";
import { CollectionAdminService as CollectionAdminServiceAbstraction } from "../../abstractions/collection/collection-admin.service.abstraction";
import { CryptoService } from "../../abstractions/crypto.service";
import { CollectionData } from "../../models/data/collection.data";
import { Collection } from "../../models/domain/collection";
import { CollectionDetailsResponse } from "../../models/response/collection.response";
import { CollectionView } from "../../models/view/collection.view";

export class CollectionAdminService implements CollectionAdminServiceAbstraction {
  constructor(private apiService: ApiService, private cryptoService: CryptoService) {}

  async getAllDecrypted(organizationId: string): Promise<CollectionView[]> {
    const collectionResponse = await this.apiService.getCollections(organizationId);
    if (collectionResponse?.data == null || collectionResponse.data.length === 0) {
      return [];
    }

    const domainCollections = collectionResponse.data.map(
      (r: CollectionDetailsResponse) => new Collection(new CollectionData(r))
    );
    return await this.decryptMany(domainCollections);
  }

  async decryptMany(collections: Collection[]): Promise<CollectionView[]> {
    if (collections == null) {
      return [];
    }
    const decCollections: CollectionView[] = [];
    const promises: Promise<any>[] = [];
    collections.forEach((collection) => {
      promises.push(collection.decrypt().then((c) => decCollections.push(c)));
    });
    await Promise.all(promises);
    return decCollections;
  }

  async encrypt(model: CollectionView): Promise<Collection> {
    if (model.organizationId == null) {
      throw new Error("Collection has no organization id.");
    }
    const key = await this.cryptoService.getOrgKey(model.organizationId);
    if (key == null) {
      throw new Error("No key for this collection's organization.");
    }
    const collection = new Collection();
    collection.id = model.id;
    collection.organizationId = model.organizationId;
    collection.readOnly = model.readOnly;
    collection.externalId = model.externalId;
    collection.name = await this.cryptoService.encrypt(model.name, key);
    return collection;
  }
}
