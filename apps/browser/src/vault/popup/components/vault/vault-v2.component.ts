import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Router, RouterLink } from "@angular/router";
import { combineLatest } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { ButtonModule, Icons, NoItemsModule } from "@bitwarden/components";

import { CurrentAccountComponent } from "../../../../auth/popup/account-switching/current-account.component";
import { PopOutComponent } from "../../../../platform/popup/components/pop-out.component";
import { PopupHeaderComponent } from "../../../../platform/popup/layout/popup-header.component";
import { PopupPageComponent } from "../../../../platform/popup/layout/popup-page.component";
import { VaultPopupItemsService } from "../../services/vault-popup-items.service";
import { AutofillVaultListItemsComponent, VaultListItemsContainerComponent } from "../vault-v2";
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
  ],
})
export class VaultV2Component implements OnInit, OnDestroy {
  protected favoriteCiphers$ = this.vaultPopupItemsService.favoriteCiphers$;
  protected remainingCiphers$ = this.vaultPopupItemsService.remainingCiphers$;

  /** Visual state of the vault */
  protected vaultState: VaultState | null = null;

  protected vaultIcon = Icons.Vault;
  protected deactivatedIcon = Icons.DeactivatedOrg;
  protected noResultsIcon = Icons.NoResults;

  protected VaultStateEnum = VaultState;

  constructor(
    private vaultPopupItemsService: VaultPopupItemsService,
    private router: Router,
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

  ngOnInit(): void {}

  ngOnDestroy(): void {}

  addCipher() {
    // TODO: Add currently filtered organization to query params if available
    void this.router.navigate(["/add-cipher"], {});
  }
}
