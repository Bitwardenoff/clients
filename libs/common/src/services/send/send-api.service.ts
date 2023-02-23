import { SendType } from "../../../../common/src/enums/sendType";
import { Utils } from "../../../../common/src/misc/utils";
import { ErrorResponse } from "../../../../common/src/models/response/error.response";
import { ApiService } from "../../abstractions/api.service";
import {
  FileUploadApiMethods,
  FileUploadService,
} from "../../abstractions/file-upload/file-upload.service";
import { SendApiService as SendApiServiceAbstraction } from "../../abstractions/send/send-api.service.abstraction";
import { InternalSendService } from "../../abstractions/send/send.service.abstraction";
import { SendData } from "../../models/data/send.data";
import { EncArrayBuffer } from "../../models/domain/enc-array-buffer";
import { Send } from "../../models/domain/send";
import { SendAccessRequest } from "../../models/request/send-access.request";
import { SendRequest } from "../../models/request/send.request";
import { ListResponse } from "../../models/response/list.response";
import { SendAccessResponse } from "../../models/response/send-access.response";
import { SendFileDownloadDataResponse } from "../../models/response/send-file-download-data.response";
import { SendFileUploadDataResponse } from "../../models/response/send-file-upload-data.response";
import { SendResponse } from "../../models/response/send.response";
import { SendAccessView } from "../../models/view/send-access.view";

export class SendApiService implements SendApiServiceAbstraction {
  constructor(
    private apiService: ApiService,
    private fileUploadService: FileUploadService,
    private sendService: InternalSendService
  ) {}

  async getSend(id: string): Promise<SendResponse> {
    const r = await this.apiService.send("GET", "/sends/" + id, null, true, true);
    return new SendResponse(r);
  }

  async postSendAccess(
    id: string,
    request: SendAccessRequest,
    apiUrl?: string
  ): Promise<SendAccessResponse> {
    const addSendIdHeader = (headers: Headers) => {
      headers.set("Send-Id", id);
    };
    const r = await this.apiService.send(
      "POST",
      "/sends/access/" + id,
      request,
      false,
      true,
      apiUrl,
      addSendIdHeader
    );
    return new SendAccessResponse(r);
  }

  async getSendFileDownloadData(
    send: SendAccessView,
    request: SendAccessRequest,
    apiUrl?: string
  ): Promise<SendFileDownloadDataResponse> {
    const addSendIdHeader = (headers: Headers) => {
      headers.set("Send-Id", send.id);
    };
    const r = await this.apiService.send(
      "POST",
      "/sends/" + send.id + "/access/file/" + send.file.id,
      request,
      false,
      true,
      apiUrl,
      addSendIdHeader
    );
    return new SendFileDownloadDataResponse(r);
  }

  async getSends(): Promise<ListResponse<SendResponse>> {
    const r = await this.apiService.send("GET", "/sends", null, true, true);
    return new ListResponse(r, SendResponse);
  }

  async postSend(request: SendRequest): Promise<SendResponse> {
    const r = await this.apiService.send("POST", "/sends", request, true, true);
    return new SendResponse(r);
  }

  async postFileTypeSend(request: SendRequest): Promise<SendFileUploadDataResponse> {
    const r = await this.apiService.send("POST", "/sends/file/v2", request, true, true);
    return new SendFileUploadDataResponse(r);
  }

  async renewSendFileUploadUrl(
    sendId: string,
    fileId: string
  ): Promise<SendFileUploadDataResponse> {
    const r = await this.apiService.send(
      "GET",
      "/sends/" + sendId + "/file/" + fileId,
      null,
      true,
      true
    );
    return new SendFileUploadDataResponse(r);
  }

  postSendFile(sendId: string, fileId: string, data: FormData): Promise<any> {
    return this.apiService.send("POST", "/sends/" + sendId + "/file/" + fileId, data, true, false);
  }

  /**
   * @deprecated Mar 25 2021: This method has been deprecated in favor of direct uploads.
   * This method still exists for backward compatibility with old server versions.
   */
  async postSendFileLegacy(data: FormData): Promise<SendResponse> {
    const r = await this.apiService.send("POST", "/sends/file", data, true, true);
    return new SendResponse(r);
  }

  async putSend(id: string, request: SendRequest): Promise<SendResponse> {
    const r = await this.apiService.send("PUT", "/sends/" + id, request, true, true);
    return new SendResponse(r);
  }

  async putSendRemovePassword(id: string): Promise<SendResponse> {
    const r = await this.apiService.send(
      "PUT",
      "/sends/" + id + "/remove-password",
      null,
      true,
      true
    );
    return new SendResponse(r);
  }

  deleteSend(id: string): Promise<any> {
    return this.apiService.send("DELETE", "/sends/" + id, null, true, false);
  }

  async saveWithServer(sendData: [Send, EncArrayBuffer]): Promise<any> {
    const response = await this.upload(sendData);

    const data = new SendData(response);
    await this.sendService.upsert(data);
  }

  async deleteWithServer(id: string): Promise<any> {
    await this.deleteSend(id);
    await this.sendService.delete(id);
  }

  async removePasswordWithServer(id: string): Promise<any> {
    const response = await this.putSendRemovePassword(id);
    const data = new SendData(response);
    await this.sendService.upsert(data);
  }

  // Send File Upload methoids

  private async upload(sendData: [Send, EncArrayBuffer]): Promise<SendResponse> {
    const request = new SendRequest(sendData[0], sendData[1]?.buffer.byteLength);
    let response: SendResponse;
    if (sendData[0].id == null) {
      if (sendData[0].type === SendType.Text) {
        response = await this.postSend(request);
      } else {
        try {
          const uploadDataResponse = await this.postFileTypeSend(request);
          response = uploadDataResponse.sendResponse;
          await this.fileUploadService.upload(
            uploadDataResponse,
            sendData[0].file.fileName,
            sendData[1],
            this.generateMethods(uploadDataResponse, response)
          );
        } catch (e) {
          if (e instanceof ErrorResponse && (e as ErrorResponse).statusCode === 404) {
            response = await this.legacyServerSendFileUpload(sendData, request);
          } else if (e instanceof ErrorResponse) {
            throw new Error((e as ErrorResponse).getSingleMessage());
          } else {
            throw e;
          }
        }
      }
      sendData[0].id = response.id;
      sendData[0].accessId = response.accessId;
    } else {
      response = await this.putSend(sendData[0].id, request);
    }
    return response;
  }

  private generateMethods(
    uploadData: SendFileUploadDataResponse,
    response: SendResponse
  ): FileUploadApiMethods {
    return {
      postDirect: this.generatePostDirectCallback(response),
      renewFileUploadUrl: this.generateRenewFileUploadUrlCallback(response.id, response.file.id),
      rollback: this.generateRollbackCallback(response.id),
    };
  }

  private generatePostDirectCallback(sendResponse: SendResponse) {
    return (data: FormData) => {
      return this.postSendFile(sendResponse.id, sendResponse.file.id, data);
    };
  }

  private generateRenewFileUploadUrlCallback(sendId: string, fileId: string) {
    return async () => {
      const renewResponse = await this.renewSendFileUploadUrl(sendId, fileId);
      return renewResponse?.url;
    };
  }

  private generateRollbackCallback(sendId: string) {
    return () => {
      return this.deleteSend(sendId);
    };
  }

  /**
   * @deprecated Mar 25 2021: This method has been deprecated in favor of direct uploads.
   * This method still exists for backward compatibility with old server versions.
   */
  async legacyServerSendFileUpload(
    sendData: [Send, EncArrayBuffer],
    request: SendRequest
  ): Promise<SendResponse> {
    const fd = new FormData();
    try {
      const blob = new Blob([sendData[1].buffer], { type: "application/octet-stream" });
      fd.append("model", JSON.stringify(request));
      fd.append("data", blob, sendData[0].file.fileName.encryptedString);
    } catch (e) {
      if (Utils.isNode && !Utils.isBrowser) {
        fd.append("model", JSON.stringify(request));
        fd.append(
          "data",
          Buffer.from(sendData[1].buffer) as any,
          {
            filepath: sendData[0].file.fileName.encryptedString,
            contentType: "application/octet-stream",
          } as any
        );
      } else {
        throw e;
      }
    }
    return await this.postSendFileLegacy(fd);
  }
}
