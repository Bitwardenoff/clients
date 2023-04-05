import { FieldType, LinkedIdType } from "../../enums";
import { BaseResponse } from "../response/base.response";

export class FieldApi extends BaseResponse {
  name: string;
  value: string;
  type: FieldType;
  linkedId: LinkedIdType;

  constructor(data: any = null) {
    super(data);
    if (data == null) {
      return;
    }
    this.type = this.getResponseProperty("Type");
    this.name = this.getResponseProperty("Name");
    this.value = this.getResponseProperty("Value");
    this.linkedId = this.getResponseProperty("linkedId");
  }
}
