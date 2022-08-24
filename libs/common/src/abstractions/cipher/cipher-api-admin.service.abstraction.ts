import { CipherBulkDeleteRequest } from "@bitwarden/common/models/request/cipherBulkDeleteRequest";
import { CipherCollectionsRequest } from "@bitwarden/common/models/request/cipherCollectionsRequest";
import { CipherCreateRequest } from "@bitwarden/common/models/request/cipherCreateRequest";
import { CipherRequest } from "@bitwarden/common/models/request/cipherRequest";
import { CipherResponse } from "@bitwarden/common/models/response/cipherResponse";

export class CipherApiAdminServiceAbstraction {
  putCipherCollectionsAdmin: (id: string, request: CipherCollectionsRequest) => Promise<any>;
  getCipherAdmin: (id: string) => Promise<CipherResponse>;

  postCipherAdmin: (request: CipherCreateRequest) => Promise<CipherResponse>;
  putCipherAdmin: (id: string, request: CipherRequest) => Promise<CipherResponse>;
  deleteCipherAdmin: (id: string) => Promise<any>;
  deleteManyCiphersAdmin: (request: CipherBulkDeleteRequest) => Promise<any>;
  putDeleteCipherAdmin: (id: string) => Promise<any>;
  putDeleteManyCiphersAdmin: (request: CipherBulkDeleteRequest) => Promise<any>;
  putRestoreCipherAdmin: (id: string) => Promise<CipherResponse>;
}
