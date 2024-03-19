import { FileUploadService as FileUploadServiceAbstraction } from "@bitwarden/common/platform/abstractions/file-upload/file-upload.service";
import { FileUploadService } from "@bitwarden/common/platform/services/file-upload/file-upload.service";

import {
  CachedServices,
  factory,
  FactoryOptions,
} from "../../background/service-factories/factory-options";

import { apiServiceFactory, ApiServiceInitOptions } from "./api-service.factory";
import { logServiceFactory, LogServiceInitOptions } from "./log-service.factory";

type FileUploadServiceFactoryOptions = FactoryOptions;

export type FileUploadServiceInitOptions = FileUploadServiceFactoryOptions &
  LogServiceInitOptions &
  ApiServiceInitOptions;

export function fileUploadServiceFactory(
  cache: { fileUploadService?: FileUploadServiceAbstraction } & CachedServices,
  opts: FileUploadServiceInitOptions,
): Promise<FileUploadServiceAbstraction> {
  return factory(
    cache,
    "fileUploadService",
    opts,
    async () =>
      new FileUploadService(
        await logServiceFactory(cache, opts),
        await apiServiceFactory(cache, opts),
      ),
  );
}
