import { BaseResponse } from "../../../../../../../libs/common/src/models/response/base.response";

export class ProjectsMappedToSecretResponse extends BaseResponse {
  id: string;
  name: string;

  constructor(response: any) {
    super(response);
    this.name = this.getResponseProperty("Name");
    this.id = this.getResponseProperty("Id");
  }
}
