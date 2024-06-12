import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { combineLatest, filter, map } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { CipherType } from "@bitwarden/common/vault/enums";
import { ButtonModule, Icons, NoItemsModule } from "@bitwarden/components";

import { CurrentAccountComponent } from "../../../../auth/popup/account-switching/current-account.component";
import { PopOutComponent } from "../../../../platform/popup/components/pop-out.component";
import { PopupHeaderComponent } from "../../../../platform/popup/layout/popup-header.component";
import { PopupPageComponent } from "../../../../platform/popup/layout/popup-page.component";
import { VaultPopupItemsService } from "../../services/vault-popup-items.service";
import {
  MY_VAULT_ID,
  VaultPopupListFiltersService,
} from "../../services/vault-popup-list-filters.service";
import { AutofillVaultListItemsComponent, VaultListItemsContainerComponent } from "../vault-v2";
import { NewItemDropdownV2Component } from "../vault-v2/new-item-dropdown/new-item-dropdown-v2.component";
import { VaultListFiltersComponent } from "../vault-v2/vault-list-filters/vault-list-filters.component";
import { VaultV2SearchComponent } from "../vault-v2/vault-search/vault-v2-search.component";

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
})
export class VaultV2Component {
  cipherType = CipherType;

  protected favoriteCiphers$ = this.vaultPopupItemsService.favoriteCiphers$;
  protected remainingCiphers$ = this.vaultPopupItemsService.remainingCiphers$;

  /** The `id` of the filtered organization */
  protected selectedVaultId: string | null = null;

  /** Visual state of the vault */
  protected vaultState: VaultState | null = null;

  protected vaultIcon = Icons.Vault;
  protected deactivatedIcon = Icons.DeactivatedOrg;
  protected noResultsIcon = Icons.NoResults;

  protected VaultStateEnum = VaultState;

  constructor(
    private vaultPopupItemsService: VaultPopupItemsService,
    private vaultPopupListFiltersService: VaultPopupListFiltersService,
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

    this.vaultPopupListFiltersService.filters$
      .pipe(
        takeUntilDestroyed(),
        filter((filters) => filters.organization?.id !== MY_VAULT_ID),
        map((filters) => filters.organization?.id ?? null),
      )
      .subscribe((organizationId) => {
        this.selectedVaultId = organizationId;
      });
  }
}
