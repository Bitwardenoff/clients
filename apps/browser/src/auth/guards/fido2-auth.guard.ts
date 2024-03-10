import { inject } from "@angular/core";
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from "@angular/router";

import { AuthService } from "@bitwarden/common/auth/abstractions/auth.service";
import { AuthenticationStatus } from "@bitwarden/common/auth/enums/authentication-status";

import { PopupHistoryService } from "../../platform/popup/services/popup-history.service";

/**
 * This guard verifies the user's authetication status.
 * If "Locked", it saves the intended route in memory and redirects to the lock screen. Otherwise, the intended route is allowed.
 */
export const fido2AuthGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const routerService = inject(PopupHistoryService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const authStatus = await authService.getAuthStatus();

  if (authStatus === AuthenticationStatus.Locked) {
    await routerService.push(state.url);
    return router.createUrlTree(["/lock"], { queryParams: route.queryParams });
  }

  return true;
};
