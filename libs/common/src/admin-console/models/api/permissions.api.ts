import { BaseResponse } from "../../../models/response/base.response";

export class PermissionsApi extends BaseResponse {
  accessEventLogs: boolean;
  accessImportExport: boolean;
  accessReports: boolean;
  accessAppGuard: boolean;
  createNewCollections: boolean;
  editAnyCollection: boolean;
  deleteAnyCollection: boolean;
  editAssignedCollections: boolean;
  deleteAssignedCollections: boolean;
  manageCiphers: boolean;
  manageGroups: boolean;
  manageSso: boolean;
  managePolicies: boolean;
  manageUsers: boolean;
  manageResetPassword: boolean;
  manageScim: boolean;

  constructor(data: any = null) {
    super(data);
    if (data == null) {
      return this;
    }
    this.accessEventLogs = this.getResponseProperty("AccessEventLogs");
    this.accessImportExport = this.getResponseProperty("AccessImportExport");
    this.accessReports = this.getResponseProperty("AccessReports");
    this.accessAppGuard = this.getResponseProperty("AccessAppGuard");

    this.createNewCollections = this.getResponseProperty("CreateNewCollections");
    this.editAnyCollection = this.getResponseProperty("EditAnyCollection");
    this.deleteAnyCollection = this.getResponseProperty("DeleteAnyCollection");
    this.editAssignedCollections = this.getResponseProperty("EditAssignedCollections");
    this.deleteAssignedCollections = this.getResponseProperty("DeleteAssignedCollections");

    this.manageCiphers = this.getResponseProperty("ManageCiphers");
    this.manageGroups = this.getResponseProperty("ManageGroups");
    this.manageSso = this.getResponseProperty("ManageSso");
    this.managePolicies = this.getResponseProperty("ManagePolicies");
    this.manageUsers = this.getResponseProperty("ManageUsers");
    this.manageResetPassword = this.getResponseProperty("ManageResetPassword");
    this.manageScim = this.getResponseProperty("ManageScim");
  }
}
