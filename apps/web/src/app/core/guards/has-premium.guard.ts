import { inject } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  CanActivateFn,
  UrlTree,
} from "@angular/router";
import { Observable, of } from "rxjs";
import { catchError, filter, map, switchMap, timeout } from "rxjs/operators";

import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { BillingAccountProfileStateService } from "@bitwarden/common/billing/abstractions/account/billing-account-profile-state.service";
import { MessagingService } from "@bitwarden/common/platform/abstractions/messaging.service";
import { SyncService } from "@bitwarden/common/platform/sync";

/**
 * CanActivate guard that checks if the user has premium and otherwise triggers the "premiumRequired"
 * message and blocks navigation.
 */
export function hasPremiumGuard(): CanActivateFn {
  return (
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> => {
    const router = inject(Router);
    const messagingService = inject(MessagingService);
    const billingAccountProfileStateService = inject(BillingAccountProfileStateService);
    const accountService = inject(AccountService);
    const syncService = inject(SyncService);

    return billingAccountProfileStateService.hasPremiumFromAnySource$.pipe(
      switchMap((userHasPremium: boolean) => {
        if (userHasPremium) {
          // If user has premium, allow navigation
          return of(true);
        }
        return accountService.activeAccount$.pipe(
          filter((a) => a != null),
          switchMap((a) => syncService.lastSync$(a.id)),
          filter((lastSyncDate) => lastSyncDate != null),
          timeout(10_000),
          switchMap(() => billingAccountProfileStateService.hasPremiumFromAnySource$),
          map((userHasPremium: boolean) => {
            if (!userHasPremium) {
              messagingService.send("premiumRequired");
              return router.createUrlTree(["/"]);
            }
            return true; // Allow navigation if user has premium
          }),
        );
      }),
      catchError(() => {
        messagingService.send("premiumRequired");
        return of(router.createUrlTree(["/"]));
      }),
    );
  };
}
