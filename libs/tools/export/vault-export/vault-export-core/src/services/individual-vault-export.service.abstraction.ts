import { ExportFormat } from "./vault-export.service.abstraction";

export abstract class IndividualVaultExportServiceAbstraction {
  getExport: (format: ExportFormat) => Promise<string | Blob>;
  getPasswordProtectedExport: (format: ExportFormat, password: string) => Promise<string | Blob>;
}
