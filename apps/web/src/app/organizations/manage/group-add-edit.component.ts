import { DIALOG_DATA, DialogConfig, DialogRef } from "@angular/cdk/dialog";
import { Component, Inject, OnInit } from "@angular/core";
import { FormBuilder, FormControl, Validators } from "@angular/forms";

import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { CollectionService } from "@bitwarden/common/abstractions/collection.service";
import { I18nService } from "@bitwarden/common/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/abstractions/log.service";
import { PlatformUtilsService } from "@bitwarden/common/abstractions/platformUtils.service";
import { CollectionData } from "@bitwarden/common/models/data/collection.data";
import { Collection } from "@bitwarden/common/models/domain/collection";
import { GroupRequest } from "@bitwarden/common/models/request/group.request";
import { CollectionDetailsResponse } from "@bitwarden/common/models/response/collection.response";
import { DialogService } from "@bitwarden/components";

import {
  AccessItemType,
  AccessItemValue,
  AccessItemView,
  convertToPermission,
  convertToSelectionReadOnly,
  PermissionMode,
} from "../components/access-selector";
import { GroupServiceAbstraction } from "../services/abstractions/group";
import { GroupView } from "../views/group.view";

/**
 * Indices for the available tabs in the dialog
 */
export enum GroupAddEditTabType {
  Info = 0,
  Members = 1,
  Collections = 2,
}

export interface GroupAddEditDialogParams {
  /**
   * ID of the organization the group belongs to
   */
  organizationId: string;

  /**
   * Optional ID of the group being modified
   */
  groupId?: string;

  /**
   * Tab to open when the dialog is open.
   * Defaults to Group Info
   */
  initialTab?: GroupAddEditTabType;
}

export enum GroupAddEditDialogResultType {
  Saved = "saved",
  Canceled = "canceled",
  Deleted = "deleted",
}

/**
 * Strongly typed helper to open a groupAddEditDialog
 * @param dialogService Instance of the dialog service that will be used to open the dialog
 * @param config Configuration for the dialog
 */
export const openGroupAddEditDialog = (
  dialogService: DialogService,
  config: DialogConfig<GroupAddEditDialogParams>
) => {
  return dialogService.open<GroupAddEditDialogResultType, GroupAddEditDialogParams>(
    GroupAddEditComponent,
    config
  );
};

@Component({
  selector: "app-group-add-edit",
  templateUrl: "group-add-edit.component.html",
})
export class GroupAddEditComponent implements OnInit {
  protected permissionMode = PermissionMode;
  protected resultType = GroupAddEditDialogResultType;

  tabIndex: GroupAddEditTabType;
  loading = true;
  editMode = false;
  title: string;
  formPromise: Promise<any>;
  deletePromise: Promise<any>;
  collections: AccessItemView[] = [];
  members: AccessItemView[] = [];
  group: GroupView;

  groupForm = this.formBuilder.group({
    accessAll: new FormControl(false),
    name: new FormControl("", Validators.required),
    externalId: new FormControl(""),
    members: new FormControl<AccessItemValue[]>([]),
    collections: new FormControl<AccessItemValue[]>([]),
  });

  get groupId(): string | undefined {
    return this.params.groupId;
  }

  get organizationId(): string {
    return this.params.organizationId;
  }

  constructor(
    @Inject(DIALOG_DATA) private params: GroupAddEditDialogParams,
    private dialogRef: DialogRef<GroupAddEditDialogResultType>,
    private apiService: ApiService,
    private groupService: GroupServiceAbstraction,
    private i18nService: I18nService,
    private collectionService: CollectionService,
    private platformUtilsService: PlatformUtilsService,
    private logService: LogService,
    private formBuilder: FormBuilder
  ) {
    this.tabIndex = params.initialTab ?? GroupAddEditTabType.Info;
  }

  async ngOnInit() {
    this.editMode = this.loading = this.groupId != null;
    const collectionsPromise = this.loadCollections();
    const membersPromise = this.loadMembers();

    await Promise.all([collectionsPromise, membersPromise]);

    if (this.editMode) {
      this.editMode = true;
      this.title = this.i18nService.t("editGroup");
      try {
        this.group = await this.groupService.get(this.organizationId, this.groupId);
        const users = await this.apiService.getGroupUsers(this.organizationId, this.groupId);

        this.groupForm.patchValue({
          name: this.group.name,
          externalId: this.group.externalId,
          accessAll: this.group.accessAll,
          members: users.map((u) => ({
            id: u,
            type: AccessItemType.Member,
          })),
          collections: this.group.collections.map((gc) => ({
            id: gc.id,
            type: AccessItemType.Collection,
            permission: convertToPermission(gc),
          })),
        });
      } catch (e) {
        this.logService.error(e);
      }
    } else {
      this.title = this.i18nService.t("addGroup");
    }

    this.loading = false;
  }

  async loadCollections() {
    const response = await this.apiService.getCollections(this.organizationId);
    const collections = response.data.map(
      (r) => new Collection(new CollectionData(r as CollectionDetailsResponse))
    );
    this.collections = (await this.collectionService.decryptMany(collections)).map((c) => ({
      id: c.id,
      type: AccessItemType.Collection,
      labelName: c.name,
      listName: c.name,
    }));
  }

  async loadMembers() {
    const response = await this.apiService.getOrganizationUsers(this.organizationId);
    this.members = response.data.map((m) => ({
      id: m.id,
      type: AccessItemType.Member,
      email: m.email,
      role: m.type,
      listName: m.name?.length > 0 ? `${m.name} (${m.email})` : m.email,
      labelName: m.name || m.email,
      status: m.status,
    }));
  }

  async submit() {
    const request = new GroupRequest();
    const formValue = this.groupForm.value;
    request.name = formValue.name;
    request.externalId = formValue.externalId;
    request.accessAll = formValue.accessAll;
    request.users = formValue.members?.map((m) => m.id) ?? [];

    if (!request.accessAll) {
      request.collections = formValue.collections.map((c) => convertToSelectionReadOnly(c));
    }

    try {
      if (this.editMode) {
        this.formPromise = this.apiService.putGroup(this.organizationId, this.groupId, request);
      } else {
        this.formPromise = this.apiService.postGroup(this.organizationId, request);
      }
      await this.formPromise;
      this.platformUtilsService.showToast(
        "success",
        null,
        this.i18nService.t(this.editMode ? "editedGroupId" : "createdGroupId", formValue.name)
      );
      this.dialogRef.close(GroupAddEditDialogResultType.Saved);
    } catch (e) {
      this.logService.error(e);
    }
  }

  async delete() {
    if (!this.editMode) {
      return;
    }

    const confirmed = await this.platformUtilsService.showDialog(
      this.i18nService.t("deleteGroupConfirmation"),
      this.group.name,
      this.i18nService.t("yes"),
      this.i18nService.t("no"),
      "warning"
    );
    if (!confirmed) {
      return false;
    }

    try {
      this.deletePromise = this.groupService.delete(this.organizationId, this.groupId);
      await this.deletePromise;
      this.platformUtilsService.showToast(
        "success",
        null,
        this.i18nService.t("deletedGroupId", this.group.name)
      );
      this.dialogRef.close(GroupAddEditDialogResultType.Deleted);
    } catch (e) {
      this.logService.error(e);
    }
  }
}
