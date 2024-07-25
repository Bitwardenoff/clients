import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { combineLatest, firstValueFrom, map, Observable, shareReplay } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { CollectionId, OrganizationId } from "@bitwarden/common/types/guid";
import { CipherType } from "@bitwarden/common/vault/enums";
import { ButtonModule, DialogService, Icons, NoItemsModule } from "@bitwarden/components";

import { CurrentAccountComponent } from "../../../../auth/popup/account-switching/current-account.component";
import { PopOutComponent } from "../../../../platform/popup/components/pop-out.component";
import { PopupHeaderComponent } from "../../../../platform/popup/layout/popup-header.component";
import { PopupPageComponent } from "../../../../platform/popup/layout/popup-page.component";
import { VaultPopupItemsService } from "../../services/vault-popup-items.service";
import { VaultPopupListFiltersService } from "../../services/vault-popup-list-filters.service";
import { VaultUiOnboardingService } from "../../services/vault-ui-onboarding.service";
import { AutofillVaultListItemsComponent, VaultListItemsContainerComponent } from "../vault-v2";
import {
  NewItemDropdownV2Component,
  NewItemInitialValues,
} from "../vault-v2/new-item-dropdown/new-item-dropdown-v2.component";
import { VaultListFiltersComponent } from "../vault-v2/vault-list-filters/vault-list-filters.component";
import { VaultV2SearchComponent } from "../vault-v2/vault-search/vault-v2-search.component";
import { VaultUiOnboardingComponent } from "../vault-v2/vault-ui-onboarding/vault-ui-onboarding.component";

enum VaultState {
  Empty,
  NoResults,
  DeactivatedOrg,
}

@Component({
  selector: "app-vault",
  templateUrl: "vault-v2.component.html",
  standalone: true,
  imports: [
    PopupPageComponent,
    PopupHeaderComponent,
    PopOutComponent,
    CurrentAccountComponent,
    NoItemsModule,
    JslibModule,
    CommonModule,
    AutofillVaultListItemsComponent,
    VaultListItemsContainerComponent,
    VaultListFiltersComponent,
    ButtonModule,
    RouterLink,
    VaultV2SearchComponent,
    NewItemDropdownV2Component,
  ],
  providers: [VaultUiOnboardingService],
})
export class VaultV2Component implements OnInit, OnDestroy {
  cipherType = CipherType;

  private onboardingUiReleaseDate = new Date("2024-07-25");

  protected favoriteCiphers$ = this.vaultPopupItemsService.favoriteCiphers$;
  protected remainingCiphers$ = this.vaultPopupItemsService.remainingCiphers$;

  protected newItemItemValues$: Observable<NewItemInitialValues> =
    this.vaultPopupListFiltersService.filters$.pipe(
      map((filter) => ({
        organizationId: (filter.organization?.id ||
          filter.collection?.organizationId) as OrganizationId,
        collectionId: filter.collection?.id as CollectionId,
        folderId: filter.folder?.id,
      })),
      shareReplay({ refCount: true, bufferSize: 1 }),
    );

  /** Visual state of the vault */
  protected vaultState: VaultState | null = null;

  protected vaultIcon = Icons.Vault;
  protected deactivatedIcon = Icons.DeactivatedOrg;
  protected noResultsIcon = Icons.NoResults;

  protected VaultStateEnum = VaultState;

  constructor(
    private vaultPopupItemsService: VaultPopupItemsService,
    private vaultPopupListFiltersService: VaultPopupListFiltersService,
    private dialogService: DialogService,
    private vaultUiOnboardingService: VaultUiOnboardingService,
    private apiService: ApiService,
  ) {
    combineLatest([
      this.vaultPopupItemsService.emptyVault$,
      this.vaultPopupItemsService.noFilteredResults$,
      this.vaultPopupItemsService.showDeactivatedOrg$,
    ])
      .pipe(takeUntilDestroyed())
      .subscribe(([emptyVault, noResults, deactivatedOrg]) => {
        switch (true) {
          case emptyVault:
            this.vaultState = VaultState.Empty;
            break;
          case deactivatedOrg:
            // The deactivated org state takes precedence over the no results state
            this.vaultState = VaultState.DeactivatedOrg;
            break;
          case noResults:
            this.vaultState = VaultState.NoResults;
            break;
          default:
            this.vaultState = null;
        }
      });
  }

  async ngOnInit() {
    await this.showOnboardingDialog();
  }

  ngOnDestroy(): void {}

  /**
   * Checks whether the onboarding dialog should be shown and opens it if necessary.
   * The dialog is shown if the user has not previously viewed it and is not a new account.
   */
  private async showOnboardingDialog(): Promise<void> {
    const hasViewedDialog = await this.vaultUiOnboardingService.getVaultUiOnboardingState();

    if (!hasViewedDialog && !(await this.isNewAccount())) {
      await this.openVaultUiOnboardingDialog();
    }
  }

  private async openVaultUiOnboardingDialog(): Promise<boolean> {
    const dialogRef = VaultUiOnboardingComponent.open(this.dialogService);

    return firstValueFrom(dialogRef.closed);
  }

  private async isNewAccount(): Promise<boolean> {
    const userProfile = await this.apiService.getProfile();
    const profileCreationDate = new Date(userProfile.creationDate);
    return profileCreationDate > this.onboardingUiReleaseDate;
  }
}
