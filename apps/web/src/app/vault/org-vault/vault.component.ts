import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewContainerRef,
} from "@angular/core";
import { ActivatedRoute, Params, Router } from "@angular/router";
import {
  BehaviorSubject,
  combineLatest,
  firstValueFrom,
  lastValueFrom,
  Observable,
  Subject,
} from "rxjs";
import {
  concatMap,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  switchMap,
  takeUntil,
} from "rxjs/operators";

import { SearchPipe } from "@bitwarden/angular/pipes/search.pipe";
import { ModalService } from "@bitwarden/angular/services/modal.service";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { BroadcasterService } from "@bitwarden/common/abstractions/broadcaster.service";
import { EventCollectionService } from "@bitwarden/common/abstractions/event/event-collection.service";
import { I18nService } from "@bitwarden/common/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/abstractions/log.service";
import { MessagingService } from "@bitwarden/common/abstractions/messaging.service";
import { OrganizationService } from "@bitwarden/common/abstractions/organization/organization.service.abstraction";
import { PlatformUtilsService } from "@bitwarden/common/abstractions/platformUtils.service";
import { SearchService } from "@bitwarden/common/abstractions/search.service";
import { TotpService } from "@bitwarden/common/abstractions/totp.service";
import { EventType } from "@bitwarden/common/enums/eventType";
import { RefreshTracker } from "@bitwarden/common/misc/refresh-tracker";
import { ServiceUtils } from "@bitwarden/common/misc/serviceUtils";
import { Utils } from "@bitwarden/common/misc/utils";
import { Organization } from "@bitwarden/common/models/domain/organization";
import { TreeNode } from "@bitwarden/common/models/domain/tree-node";
import { CollectionView } from "@bitwarden/common/models/view/collection.view";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { PasswordRepromptService } from "@bitwarden/common/vault/abstractions/password-reprompt.service";
import { SyncService } from "@bitwarden/common/vault/abstractions/sync/sync.service.abstraction";
import { CipherRepromptType } from "@bitwarden/common/vault/enums/cipher-reprompt-type";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { DialogService, Icons } from "@bitwarden/components";

import {
  CollectionAdminService,
  CollectionAdminView,
  GroupService,
  GroupView,
} from "../../organizations/core";
import { EntityEventsComponent } from "../../organizations/manage/entity-events.component";
import {
  CollectionDialogResult,
  CollectionDialogTabType,
  openCollectionDialog,
} from "../../organizations/shared";
import { CollectionsComponent } from "../../organizations/vault/collections.component";
import { VaultFilterService } from "../../vault/individual-vault/vault-filter/services/abstractions/vault-filter.service";
import { VaultFilter } from "../../vault/individual-vault/vault-filter/shared/models/vault-filter.model";
import { VaultItemEvent } from "../components/vault-items/vault-item-event";
import {
  BulkDeleteDialogResult,
  openBulkDeleteDialog,
} from "../individual-vault/bulk-action-dialogs/bulk-delete-dialog/bulk-delete-dialog.component";
import {
  BulkRestoreDialogResult,
  openBulkRestoreDialog,
} from "../individual-vault/bulk-action-dialogs/bulk-restore-dialog/bulk-restore-dialog.component";
import { RoutedVaultFilterBridgeService } from "../individual-vault/vault-filter/services/routed-vault-filter-bridge.service";
import { RoutedVaultFilterService } from "../individual-vault/vault-filter/services/routed-vault-filter.service";
import { createFilterFunction } from "../individual-vault/vault-filter/shared/models/filter-function";
import {
  All,
  RoutedVaultFilterModel,
  Unassigned,
} from "../individual-vault/vault-filter/shared/models/routed-vault-filter.model";
import { getNestedCollectionTree } from "../utils/collection-utils";

import { AddEditComponent } from "./add-edit.component";
import { AttachmentsComponent } from "./attachments.component";
import { VaultFilterComponent } from "./vault-filter/vault-filter.component";

const BroadcasterSubscriptionId = "OrgVaultComponent";
const SearchTextDebounceInterval = 200;

@Component({
  selector: "app-org-vault",
  templateUrl: "vault.component.html",
  providers: [RoutedVaultFilterService, RoutedVaultFilterBridgeService],
})
export class VaultComponent implements OnInit, OnDestroy {
  @ViewChild("vaultFilter", { static: true })
  vaultFilterComponent: VaultFilterComponent;
  // @ViewChild(VaultItemsComponent, { static: true }) vaultItemsComponent: VaultItemsComponent;
  @ViewChild("attachments", { read: ViewContainerRef, static: true })
  attachmentsModalRef: ViewContainerRef;
  @ViewChild("cipherAddEdit", { read: ViewContainerRef, static: true })
  cipherAddEditModalRef: ViewContainerRef;
  @ViewChild("collections", { read: ViewContainerRef, static: true })
  collectionsModalRef: ViewContainerRef;
  @ViewChild("eventsTemplate", { read: ViewContainerRef, static: true })
  eventsModalRef: ViewContainerRef;

  organization: Organization;
  trashCleanupWarning: string = null;
  activeFilter: VaultFilter = new VaultFilter();

  protected noItemIcon = Icons.Search;
  protected syncing = false;
  protected loading$: Observable<boolean>;
  protected filter$: Observable<RoutedVaultFilterModel>;
  protected organization$: Observable<Organization>;
  protected allCollections$: Observable<CollectionAdminView[]>;
  protected allOrganizations$: Observable<Organization[]>;
  protected allGroups$: Observable<GroupView[]>;
  protected ciphers$: Observable<CipherView[]>;
  protected collections$: Observable<CollectionAdminView[]>;
  protected selectedCollection$: Observable<TreeNode<CollectionAdminView> | undefined>;
  protected isEmpty$: Observable<boolean>;
  protected showMissingCollectionPermissionMessage$: Observable<boolean>;

  private refreshTracker = new RefreshTracker();
  private refresh$ = new BehaviorSubject<void>(null);

  private searchText$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private organizationService: OrganizationService,
    protected vaultFilterService: VaultFilterService,
    private routedVaultFilterBridgeService: RoutedVaultFilterBridgeService,
    private routedVaultFilterService: RoutedVaultFilterService,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef,
    private syncService: SyncService,
    private i18nService: I18nService,
    private modalService: ModalService,
    private dialogService: DialogService,
    private messagingService: MessagingService,
    private broadcasterService: BroadcasterService,
    private ngZone: NgZone,
    private platformUtilsService: PlatformUtilsService,
    private cipherService: CipherService,
    private passwordRepromptService: PasswordRepromptService,
    private collectionAdminService: CollectionAdminService,
    private searchService: SearchService,
    private searchPipe: SearchPipe,
    private groupService: GroupService,
    private logService: LogService,
    private eventCollectionService: EventCollectionService,
    private totpService: TotpService,
    private apiService: ApiService
  ) {}

  async ngOnInit() {
    this.loading$ = this.refreshTracker.loading$;
    this.trashCleanupWarning = this.i18nService.t(
      this.platformUtilsService.isSelfHost()
        ? "trashCleanupWarningSelfHosted"
        : "trashCleanupWarning"
    );

    this.route.parent.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.organization = this.organizationService.get(params.organizationId);
    });

    // verifies that the organization has been set
    combineLatest([this.route.queryParams, this.route.parent.params])
      .pipe(
        switchMap(async ([qParams]) => {
          const cipherId = getCipherIdFromParams(qParams);
          if (!cipherId) {
            return;
          }
          if (
            // Handle users with implicit collection access since they use the admin endpoint
            this.organization.canUseAdminCollections ||
            (await this.cipherService.get(cipherId)) != null
          ) {
            this.editCipherId(cipherId);
          } else {
            this.platformUtilsService.showToast(
              "error",
              this.i18nService.t("errorOccurred"),
              this.i18nService.t("unknownCipher")
            );
            this.router.navigate([], {
              queryParams: { cipherId: null, itemId: null },
              queryParamsHandling: "merge",
            });
          }
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();

    if (!this.organization.canUseAdminCollections) {
      this.broadcasterService.subscribe(BroadcasterSubscriptionId, (message: any) => {
        this.ngZone.run(async () => {
          switch (message.command) {
            case "syncStarted":
              this.syncing = true;
              break;
            case "syncCompleted":
              if (message.successfully) {
                await Promise.all([this.vaultFilterService.reloadCollections()]);
                this.refresh();
                this.changeDetectorRef.detectChanges();
              }
              this.syncing = false;
              break;
          }
        });
      });
      await this.syncService.fullSync(false);
    }

    this.routedVaultFilterBridgeService.activeFilter$
      .pipe(takeUntil(this.destroy$))
      .subscribe((activeFilter) => {
        this.activeFilter = activeFilter;
      });

    this.searchText$
      .pipe(debounceTime(SearchTextDebounceInterval), takeUntil(this.destroy$))
      .subscribe((searchText) =>
        this.router.navigate([], {
          queryParams: { search: Utils.isNullOrEmpty(searchText) ? null : searchText },
          queryParamsHandling: "merge",
          replaceUrl: true,
        })
      );

    const querySearchText$ = this.route.queryParams.pipe(map((queryParams) => queryParams.search));

    // loading$: Observable<boolean>;
    this.filter$ = this.routedVaultFilterService.filter$;

    const organizationId$ = this.filter$.pipe(
      map((filter) => filter.organizationId),
      distinctUntilChanged()
    );

    this.allCollections$ = this.refresh$.pipe(
      switchMap(() => organizationId$),
      this.refreshTracker.switchMap((orgId) => this.collectionAdminService.getAll(orgId)),
      takeUntil(this.destroy$),
      shareReplay({ refCount: false, bufferSize: 1 })
    );

    this.organization$ = this.refresh$.pipe(
      switchMap(() => organizationId$),
      map((organizationId) => this.organizationService.get(organizationId)),
      takeUntil(this.destroy$),
      shareReplay({ refCount: false, bufferSize: 1 })
    );

    this.allGroups$ = this.refresh$.pipe(
      switchMap(() => organizationId$),
      this.refreshTracker.switchMap((organizationId) => this.groupService.getAll(organizationId)),
      takeUntil(this.destroy$),
      shareReplay({ refCount: false, bufferSize: 1 })
    );

    const allCiphers$ = this.refresh$.pipe(
      switchMap(() => this.organization$),
      concatMap(async (organization) => {
        let ciphers;
        if (organization?.canEditAnyCollection) {
          ciphers = await this.cipherService.getAllFromApiForOrganization(this.organization?.id);
        } else {
          ciphers = (await this.cipherService.getAllDecrypted()).filter(
            (c) => c.organizationId === this.organization?.id
          );
        }
        await this.searchService.indexCiphers(this.organization?.id, ciphers);
        return ciphers;
      })
    );

    this.ciphers$ = combineLatest([allCiphers$, this.filter$, querySearchText$]).pipe(
      filter(([ciphers, filter]) => ciphers != undefined && filter != undefined),
      concatMap(async ([ciphers, filter, searchText]) => {
        if (filter.collectionId === undefined && filter.type === undefined) {
          return [];
        }

        const filterFunction = createFilterFunction(filter);

        if (this.searchService.isSearchable(searchText)) {
          return await this.searchService.searchCiphers(searchText, [filterFunction], ciphers);
        }

        return ciphers.filter(filterFunction);
      }),
      takeUntil(this.destroy$),
      shareReplay({ refCount: false, bufferSize: 1 })
    );

    const nestedCollections$ = this.allCollections$.pipe(
      map((collections) => getNestedCollectionTree(collections)),
      takeUntil(this.destroy$),
      shareReplay({ refCount: false, bufferSize: 1 })
    );

    this.collections$ = combineLatest([nestedCollections$, this.filter$, querySearchText$]).pipe(
      filter(([collections, filter]) => collections != undefined && filter != undefined),
      map(([collections, filter, searchText]) => {
        if (
          filter.collectionId === Unassigned ||
          (filter.collectionId === undefined && filter.type !== undefined)
        ) {
          return [];
        }

        let collectionsToReturn = [];
        if (filter.collectionId === undefined || filter.collectionId === All) {
          collectionsToReturn = collections.map((c) => c.node);
        } else {
          const selectedCollection = ServiceUtils.getTreeNodeObjectFromList(
            collections,
            filter.collectionId
          );
          collectionsToReturn = selectedCollection?.children.map((c) => c.node) ?? [];
        }

        if (this.searchService.isSearchable(searchText)) {
          collectionsToReturn = this.searchPipe.transform(
            collectionsToReturn,
            searchText,
            (collection) => collection.name,
            (collection) => collection.id
          );
        }

        return collectionsToReturn;
      }),
      takeUntil(this.destroy$),
      shareReplay({ refCount: false, bufferSize: 1 })
    );

    this.isEmpty$ = combineLatest([
      this.refreshTracker.loading$,
      this.collections$,
      this.ciphers$,
    ]).pipe(
      map(
        ([loading, collections, ciphers]) =>
          !loading && collections?.length === 0 && ciphers?.length === 0
      ),
      takeUntil(this.destroy$),
      shareReplay({ refCount: false, bufferSize: 1 })
    );

    this.selectedCollection$ = combineLatest([nestedCollections$, this.filter$]).pipe(
      filter(([collections, filter]) => collections != undefined && filter != undefined),
      map(([collections, filter]) => {
        if (
          filter.collectionId === undefined ||
          filter.collectionId === All ||
          filter.collectionId === Unassigned
        ) {
          return undefined;
        }

        return ServiceUtils.getTreeNodeObjectFromList(collections, filter.collectionId);
      }),
      takeUntil(this.destroy$),
      shareReplay({ refCount: false, bufferSize: 1 })
    );

    this.showMissingCollectionPermissionMessage$ = combineLatest([
      this.selectedCollection$,
      this.organization$,
    ]).pipe(
      map(([collection, organization]) => {
        // Not filtering by collections or filtering by all collections, so no need to show message
        if (collection == undefined) {
          return false;
        }

        // Filtering by a collection, so show message if user is not assigned
        return !collection.node.assigned && !organization.isAdmin;
      }),
      takeUntil(this.destroy$),
      shareReplay({ refCount: false, bufferSize: 1 })
    );
  }

  ngOnDestroy() {
    this.broadcasterService.unsubscribe(BroadcasterSubscriptionId);
    this.destroy$.next();
    this.destroy$.complete();
  }

  onVaultItemsEvent(event: VaultItemEvent) {
    if (event.type === "attachements") {
      this.editCipherAttachments(event.item);
    } else if (event.type === "collections") {
      this.editCipherCollections(event.item);
    } else if (event.type === "clone") {
      this.cloneCipher(event.item);
    } else if (event.type === "restore") {
      if (event.items.length === 1) {
        this.restore(event.items[0]);
      } else {
        this.bulkRestore(event.items);
      }
    } else if (event.type === "delete") {
      const ciphers = event.items.filter((i) => i.collection === undefined).map((i) => i.cipher);
      const collections = event.items
        .filter((i) => i.cipher === undefined)
        .map((i) => i.collection);
      if (ciphers.length === 1 && collections.length === 0) {
        this.deleteCipher(ciphers[0]);
      } else if (ciphers.length === 0 && collections.length === 1) {
        this.deleteCollection(collections[0]);
      } else {
        this.bulkDelete(ciphers, collections, this.organization);
      }
    } else if (event.type === "copy") {
      if (event.field === "username") {
        this.copy(event.item, event.item.login.username, "Username", "username");
      } else if (event.field === "password") {
        this.copy(event.item, event.item.login.password, "Password", "password");
      } else if (event.field === "totp") {
        this.copy(event.item, event.item.login.totp, "verificationCodeTotp", "TOTP");
      }
    } else if (event.type === "edit") {
      this.editCollection(event.item, "info");
    } else if (event.type === "access") {
      this.editCollection(event.item, "access");
    } else if (event.type === "events") {
      this.viewEvents(event.item);
    }
  }

  async refreshItems() {
    this.refresh();
  }

  filterSearchText(searchText: string) {
    this.searchText$.next(searchText);
  }

  async editCipherAttachments(cipher: CipherView) {
    if (this.organization.maxStorageGb == null || this.organization.maxStorageGb === 0) {
      this.messagingService.send("upgradeOrganization", { organizationId: cipher.organizationId });
      return;
    }

    let madeAttachmentChanges = false;

    const [modal] = await this.modalService.openViewRef(
      AttachmentsComponent,
      this.attachmentsModalRef,
      (comp) => {
        comp.organization = this.organization;
        comp.cipherId = cipher.id;
        // eslint-disable-next-line rxjs-angular/prefer-takeuntil
        comp.onUploadedAttachment.subscribe(() => (madeAttachmentChanges = true));
        // eslint-disable-next-line rxjs-angular/prefer-takeuntil
        comp.onDeletedAttachment.subscribe(() => (madeAttachmentChanges = true));
      }
    );

    // eslint-disable-next-line rxjs-angular/prefer-takeuntil, rxjs/no-async-subscribe
    modal.onClosed.subscribe(async () => {
      if (madeAttachmentChanges) {
        this.refresh();
        // await this.vaultItemsComponent.refresh();
      }
      madeAttachmentChanges = false;
    });
  }

  async editCipherCollections(cipher: CipherView) {
    const currCollections = await firstValueFrom(this.vaultFilterService.filteredCollections$);
    const [modal] = await this.modalService.openViewRef(
      CollectionsComponent,
      this.collectionsModalRef,
      (comp) => {
        comp.collectionIds = cipher.collectionIds;
        comp.collections = currCollections.filter((c) => !c.readOnly && c.id != null);
        comp.organization = this.organization;
        comp.cipherId = cipher.id;
        // eslint-disable-next-line rxjs-angular/prefer-takeuntil, rxjs/no-async-subscribe
        comp.onSavedCollections.subscribe(async () => {
          modal.close();
          this.refresh();
          // await this.vaultItemsComponent.refresh();
        });
      }
    );
  }

  async addCipher() {
    const collections = (await firstValueFrom(this.vaultFilterService.filteredCollections$)).filter(
      (c) => !c.readOnly && c.id != null
    );

    await this.editCipher(null, (comp) => {
      comp.organizationId = this.organization.id;
      comp.type = this.activeFilter.cipherType;
      comp.collections = collections;
      if (this.activeFilter.collectionId) {
        comp.collectionIds = [this.activeFilter.collectionId];
      }
    });
  }

  async navigateToCipher(cipher: CipherView) {
    this.go({ itemId: cipher?.id });
  }

  async editCipher(
    cipher: CipherView,
    additionalComponentParameters?: (comp: AddEditComponent) => void
  ) {
    return this.editCipherId(cipher?.id, additionalComponentParameters);
  }

  async editCipherId(
    cipherId: string,
    additionalComponentParameters?: (comp: AddEditComponent) => void
  ) {
    const cipher = await this.cipherService.get(cipherId);
    if (cipher != null && cipher.reprompt != 0) {
      if (!(await this.passwordRepromptService.showPasswordPrompt())) {
        this.go({ cipherId: null, itemId: null });
        return;
      }
    }

    const defaultComponentParameters = (comp: AddEditComponent) => {
      comp.organization = this.organization;
      comp.cipherId = cipherId;
      // eslint-disable-next-line rxjs-angular/prefer-takeuntil, rxjs/no-async-subscribe
      comp.onSavedCipher.subscribe(async () => {
        modal.close();
        // await this.vaultItemsComponent.refresh();
        this.refresh();
      });
      // eslint-disable-next-line rxjs-angular/prefer-takeuntil, rxjs/no-async-subscribe
      comp.onDeletedCipher.subscribe(async () => {
        modal.close();
        // await this.vaultItemsComponent.refresh();
        this.refresh();
      });
      // eslint-disable-next-line rxjs-angular/prefer-takeuntil, rxjs/no-async-subscribe
      comp.onRestoredCipher.subscribe(async () => {
        modal.close();
        // await this.vaultItemsComponent.refresh();
        this.refresh();
      });
    };

    const [modal, childComponent] = await this.modalService.openViewRef(
      AddEditComponent,
      this.cipherAddEditModalRef,
      additionalComponentParameters == null
        ? defaultComponentParameters
        : (comp) => {
            defaultComponentParameters(comp);
            additionalComponentParameters(comp);
          }
    );

    modal.onClosedPromise().then(() => {
      this.go({ cipherId: null, itemId: null });
    });

    return childComponent;
  }

  async cloneCipher(cipher: CipherView) {
    const collections = (await firstValueFrom(this.vaultFilterService.filteredCollections$)).filter(
      (c) => !c.readOnly && c.id != null
    );

    await this.editCipher(cipher, (comp) => {
      comp.cloneMode = true;
      comp.collections = collections;
      comp.organizationId = this.organization.id;
      comp.collectionIds = cipher.collectionIds;
    });
  }

  async restore(c: CipherView): Promise<boolean> {
    // REVIEW QUESTION: Original restore didn't reprompt cipher. I added it now.
    // Should I remove again? Was it just a bug that it was missing?
    if (!(await this.repromptCipher([c]))) {
      return;
    }

    if (!c.isDeleted) {
      return;
    }
    const confirmed = await this.platformUtilsService.showDialog(
      this.i18nService.t("restoreItemConfirmation"),
      this.i18nService.t("restoreItem"),
      this.i18nService.t("yes"),
      this.i18nService.t("no"),
      "warning"
    );
    if (!confirmed) {
      return false;
    }

    try {
      this.cipherService.restoreWithServer(c.id);
      this.platformUtilsService.showToast("success", null, this.i18nService.t("restoredItem"));
      this.refresh();
    } catch (e) {
      this.logService.error(e);
    }
  }

  async bulkRestore(ciphers: CipherView[]) {
    if (!(await this.repromptCipher(ciphers))) {
      return;
    }

    const selectedCipherIds = ciphers.map((cipher) => cipher.id);
    if (selectedCipherIds.length === 0) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("nothingSelected")
      );
      return;
    }

    const dialog = openBulkRestoreDialog(this.dialogService, {
      data: { cipherIds: selectedCipherIds },
    });

    const result = await lastValueFrom(dialog.closed);
    if (result === BulkRestoreDialogResult.Restored) {
      this.refresh();
    }
  }

  async deleteCipher(c: CipherView): Promise<boolean> {
    if (!(await this.repromptCipher([c]))) {
      return;
    }

    const permanent = c.isDeleted;
    const confirmed = await this.platformUtilsService.showDialog(
      this.i18nService.t(
        permanent ? "permanentlyDeleteItemConfirmation" : "deleteItemConfirmation"
      ),
      this.i18nService.t(permanent ? "permanentlyDeleteItem" : "deleteItem"),
      this.i18nService.t("yes"),
      this.i18nService.t("no"),
      "warning"
    );
    if (!confirmed) {
      return false;
    }

    try {
      await this.deleteCipherWithServer(c.id, permanent);
      this.platformUtilsService.showToast(
        "success",
        null,
        this.i18nService.t(permanent ? "permanentlyDeletedItem" : "deletedItem")
      );
      this.refresh();
    } catch (e) {
      this.logService.error(e);
    }
  }

  async deleteCollection(collection: CollectionView): Promise<void> {
    if (!this.organization.canDeleteAssignedCollections) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("missingPermissions")
      );
      return;
    }
    const confirmed = await this.platformUtilsService.showDialog(
      this.i18nService.t("deleteCollectionConfirmation"),
      collection.name,
      this.i18nService.t("yes"),
      this.i18nService.t("no"),
      "warning"
    );
    if (!confirmed) {
      return;
    }
    try {
      await this.apiService.deleteCollection(this.organization?.id, collection.id);
      this.platformUtilsService.showToast(
        "success",
        null,
        this.i18nService.t("deletedCollectionId", collection.name)
      );
      this.refresh();
    } catch (e) {
      this.logService.error(e);
    }
  }

  async bulkDelete(
    ciphers: CipherView[],
    collections: CollectionView[],
    organization: Organization
  ) {
    if (!(await this.repromptCipher(ciphers))) {
      return;
    }

    if (ciphers.length === 0 && collections.length === 0) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("nothingSelected")
      );
      return;
    }
    const currentFilter = await firstValueFrom(this.filter$);
    const dialog = openBulkDeleteDialog(this.dialogService, {
      data: {
        permanent: currentFilter.type === "trash",
        cipherIds: ciphers.map((c) => c.id),
        collectionIds: collections.map((c) => c.id),
        organization,
      },
    });

    const result = await lastValueFrom(dialog.closed);
    if (result === BulkDeleteDialogResult.Deleted) {
      this.refresh();
    }
  }

  async copy(cipher: CipherView, value: string, typeI18nKey: string, aType: string) {
    if (
      this.passwordRepromptService.protectedFields().includes(aType) &&
      !(await this.repromptCipher([cipher]))
    ) {
      return;
    }

    if (value === cipher.login.totp) {
      value = await this.totpService.getCode(value);
    }

    if (!cipher.viewPassword) {
      return;
    }

    this.platformUtilsService.copyToClipboard(value, { window: window });
    this.platformUtilsService.showToast(
      "info",
      null,
      this.i18nService.t("valueCopied", this.i18nService.t(typeI18nKey))
    );

    if (typeI18nKey === "password" || typeI18nKey === "verificationCodeTotp") {
      this.eventCollectionService.collect(
        EventType.Cipher_ClientToggledHiddenFieldVisible,
        cipher.id
      );
    } else if (typeI18nKey === "securityCode") {
      this.eventCollectionService.collect(EventType.Cipher_ClientCopiedCardCode, cipher.id);
    }
  }

  async editCollection(c: CollectionView, tab: "info" | "access"): Promise<void> {
    const tabType = tab == "info" ? CollectionDialogTabType.Info : CollectionDialogTabType.Access;

    const dialog = openCollectionDialog(this.dialogService, {
      data: { collectionId: c?.id, organizationId: this.organization?.id, initialTab: tabType },
    });

    const result = await lastValueFrom(dialog.closed);
    if (result === CollectionDialogResult.Saved || result === CollectionDialogResult.Deleted) {
      this.refresh();
    }
  }

  async viewEvents(cipher: CipherView) {
    await this.modalService.openViewRef(EntityEventsComponent, this.eventsModalRef, (comp) => {
      comp.name = cipher.name;
      comp.organizationId = this.organization.id;
      comp.entityId = cipher.id;
      comp.showUser = true;
      comp.entity = "cipher";
    });
  }

  protected deleteCipherWithServer(id: string, permanent: boolean) {
    return permanent
      ? this.cipherService.deleteWithServer(id)
      : this.cipherService.softDeleteWithServer(id);
  }

  protected async repromptCipher(ciphers: CipherView[]) {
    const notProtected = !ciphers.find((cipher) => cipher.reprompt !== CipherRepromptType.None);

    return notProtected || (await this.passwordRepromptService.showPasswordPrompt());
  }

  private refresh() {
    this.refresh$.next();
  }

  private go(queryParams: any = null) {
    if (queryParams == null) {
      queryParams = {
        type: this.activeFilter.cipherType,
        collectionId: this.activeFilter.collectionId,
        deleted: this.activeFilter.isDeleted || null,
      };
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      queryParamsHandling: "merge",
      replaceUrl: true,
    });
  }
}

/**
 * Allows backwards compatibility with
 * old links that used the original `cipherId` param
 */
const getCipherIdFromParams = (params: Params): string => {
  return params["itemId"] || params["cipherId"];
};
