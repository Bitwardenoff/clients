import { Uint8ArrayWriter, ZipWriter, Uint8ArrayReader } from "@zip.js/zip.js";
import * as papa from "papaparse";

import { PinServiceAbstraction } from "@bitwarden/auth/common";
import { KdfConfigService } from "@bitwarden/common/auth/abstractions/kdf-config.service";
import { CipherWithIdExport, FolderWithIdExport } from "@bitwarden/common/models/export";
import { CryptoFunctionService } from "@bitwarden/common/platform/abstractions/crypto-function.service";
import { CryptoService } from "@bitwarden/common/platform/abstractions/crypto.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { EncArrayBuffer } from "@bitwarden/common/platform/models/domain/enc-array-buffer";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { FolderService } from "@bitwarden/common/vault/abstractions/folder/folder.service.abstraction";
import { CipherType } from "@bitwarden/common/vault/enums";
import { Cipher } from "@bitwarden/common/vault/models/domain/cipher";
import { Folder } from "@bitwarden/common/vault/models/domain/folder";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { FolderView } from "@bitwarden/common/vault/models/view/folder.view";

import {
  BitwardenCsvIndividualExportType,
  BitwardenEncryptedIndividualJsonExport,
  BitwardenUnEncryptedIndividualJsonExport,
} from "../types";

import { BaseVaultExportService } from "./base-vault-export.service";
import { IndividualVaultExportServiceAbstraction } from "./individual-vault-export.service.abstraction";
import { ExportFormat } from "./vault-export.service.abstraction";

export class IndividualVaultExportService
  extends BaseVaultExportService
  implements IndividualVaultExportServiceAbstraction
{
  constructor(
    private folderService: FolderService,
    private cipherService: CipherService,
    pinService: PinServiceAbstraction,
    cryptoService: CryptoService,
    cryptoFunctionService: CryptoFunctionService,
    kdfConfigService: KdfConfigService,
  ) {
    super(pinService, cryptoService, cryptoFunctionService, kdfConfigService);
  }

  async getExport(format: ExportFormat = "csv"): Promise<string | Blob> {
    if (format === "encrypted_json") {
      return this.getEncryptedExport();
    } else if (format === "zip") {
      return this.getExportZip(null);
    }
    return this.getDecryptedExport(format);
  }

  async getPasswordProtectedExport(format: ExportFormat, password: string): Promise<string | Blob> {
    if (format == "encrypted_json") {
      const clearText = (await this.getExport("json")) as string;
      return await this.buildPasswordExport(clearText, password);
    } else if (format === "zip") {
      return await this.getExportZip(password);
    } else {
      throw new Error("CSV does not support password protected export");
    }
  }

  async getExportZip(password?: string): Promise<Blob> {
    const blobWriter = new Uint8ArrayWriter();
    const zipWriter = new ZipWriter(blobWriter, { bufferedWrite: false, password });

    const dataJson = await this.getDecryptedExport("json");
    const dataJsonUint8Array = Utils.fromByteStringToArray(dataJson);
    await zipWriter.add("data.json", new Uint8ArrayReader(dataJsonUint8Array));

    // attachments
    for (const cipher of await this.cipherService.getAllDecrypted()) {
      if (!cipher.attachments || cipher.attachments.length === 0 || cipher.deletedDate != null) {
        continue;
      }

      for (const attachment of cipher.attachments) {
        const response = await fetch(new Request(attachment.url, { cache: "no-store" }));
        const encBuf = await EncArrayBuffer.fromResponse(response);
        const key =
          attachment.key != null
            ? attachment.key
            : await this.cryptoService.getOrgKey(cipher.organizationId);
        const decBuf = await this.cryptoService.decryptFromBytes(encBuf, key);
        await zipWriter.add(
          `attachments/${cipher.id}/${attachment.fileName}`,
          new Uint8ArrayReader(decBuf),
        );
      }
    }

    await zipWriter.close();
    const zipFileArray = await blobWriter.getData();

    return new Blob([zipFileArray], { type: "application/zip" });
  }

  private async getDecryptedExport(format: "json" | "csv"): Promise<string> {
    let decFolders: FolderView[] = [];
    let decCiphers: CipherView[] = [];
    const promises = [];

    promises.push(
      this.folderService.getAllDecryptedFromState().then((folders) => {
        decFolders = folders;
      }),
    );

    promises.push(
      this.cipherService.getAllDecrypted().then((ciphers) => {
        decCiphers = ciphers.filter((f) => f.deletedDate == null);
      }),
    );

    await Promise.all(promises);

    if (format === "csv") {
      return this.buildCsvExport(decFolders, decCiphers);
    }

    return this.buildJsonExport(decFolders, decCiphers);
  }

  private async getEncryptedExport(): Promise<string> {
    let folders: Folder[] = [];
    let ciphers: Cipher[] = [];
    const promises = [];

    promises.push(
      this.folderService.getAllFromState().then((f) => {
        folders = f;
      }),
    );

    promises.push(
      this.cipherService.getAll().then((c) => {
        ciphers = c.filter((f) => f.deletedDate == null);
      }),
    );

    await Promise.all(promises);

    const encKeyValidation = await this.cryptoService.encrypt(Utils.newGuid());

    const jsonDoc: BitwardenEncryptedIndividualJsonExport = {
      encrypted: true,
      encKeyValidation_DO_NOT_EDIT: encKeyValidation.encryptedString,
      folders: [],
      items: [],
    };

    folders.forEach((f) => {
      if (f.id == null) {
        return;
      }
      const folder = new FolderWithIdExport();
      folder.build(f);
      jsonDoc.folders.push(folder);
    });

    ciphers.forEach((c) => {
      if (c.organizationId != null) {
        return;
      }
      const cipher = new CipherWithIdExport();
      cipher.build(c);
      cipher.collectionIds = null;
      jsonDoc.items.push(cipher);
    });

    return JSON.stringify(jsonDoc, null, "  ");
  }

  private buildCsvExport(decFolders: FolderView[], decCiphers: CipherView[]): string {
    const foldersMap = new Map<string, FolderView>();
    decFolders.forEach((f) => {
      if (f.id != null) {
        foldersMap.set(f.id, f);
      }
    });

    const exportCiphers: BitwardenCsvIndividualExportType[] = [];
    decCiphers.forEach((c) => {
      // only export logins and secure notes
      if (c.type !== CipherType.Login && c.type !== CipherType.SecureNote) {
        return;
      }
      if (c.organizationId != null) {
        return;
      }

      const cipher = {} as BitwardenCsvIndividualExportType;
      cipher.folder =
        c.folderId != null && foldersMap.has(c.folderId) ? foldersMap.get(c.folderId).name : null;
      cipher.favorite = c.favorite ? 1 : null;
      this.buildCommonCipher(cipher, c);
      exportCiphers.push(cipher);
    });

    return papa.unparse(exportCiphers);
  }

  private buildJsonExport(decFolders: FolderView[], decCiphers: CipherView[]): string {
    const jsonDoc: BitwardenUnEncryptedIndividualJsonExport = {
      encrypted: false,
      folders: [],
      items: [],
    };

    decFolders.forEach((f) => {
      if (f.id == null) {
        return;
      }
      const folder = new FolderWithIdExport();
      folder.build(f);
      jsonDoc.folders.push(folder);
    });

    decCiphers.forEach((c) => {
      if (c.organizationId != null) {
        return;
      }
      const cipher = new CipherWithIdExport();
      cipher.build(c);
      cipher.collectionIds = null;
      jsonDoc.items.push(cipher);
    });

    return JSON.stringify(jsonDoc, null, "  ");
  }
}
