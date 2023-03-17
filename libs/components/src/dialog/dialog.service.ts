import {
  DEFAULT_DIALOG_CONFIG,
  Dialog,
  DialogConfig,
  DialogRef,
  DIALOG_SCROLL_STRATEGY,
} from "@angular/cdk/dialog";
import { ComponentType, Overlay, OverlayContainer } from "@angular/cdk/overlay";
import {
  Inject,
  Injectable,
  Injector,
  OnDestroy,
  Optional,
  SkipSelf,
  TemplateRef,
} from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { filter, firstValueFrom, Subject, switchMap, takeUntil } from "rxjs";

import {
  DialogServiceAbstraction,
  SimpleDialogCloseType,
  SimpleDialogType,
} from "@bitwarden/angular/services/dialog";
import { AuthService } from "@bitwarden/common/auth/abstractions/auth.service";
import { AuthenticationStatus } from "@bitwarden/common/auth/enums/authentication-status";

import { SimpleDialogOptions } from "../../../angular/src/services/dialog/simple-dialog-options";

import { SimpleConfigurableDialogComponent } from "./simple-configurable-dialog/simple-configurable-dialog.component";

@Injectable()
export class DialogService extends Dialog implements OnDestroy, DialogServiceAbstraction {
  private _destroy$ = new Subject<void>();

  private backDropClasses = ["tw-fixed", "tw-bg-black", "tw-bg-opacity-30", "tw-inset-0"];

  constructor(
    /** Parent class constructor */
    _overlay: Overlay,
    _injector: Injector,
    @Optional() @Inject(DEFAULT_DIALOG_CONFIG) _defaultOptions: DialogConfig,
    @Optional() @SkipSelf() _parentDialog: Dialog,
    _overlayContainer: OverlayContainer,
    @Inject(DIALOG_SCROLL_STRATEGY) scrollStrategy: any,

    /** Not in parent class */
    @Optional() router: Router,
    @Optional() authService: AuthService
  ) {
    super(_overlay, _injector, _defaultOptions, _parentDialog, _overlayContainer, scrollStrategy);

    /** Close all open dialogs if the vault locks */
    if (router && authService) {
      router.events
        .pipe(
          filter((event) => event instanceof NavigationEnd),
          switchMap(() => authService.getAuthStatus()),
          filter((v) => v !== AuthenticationStatus.Unlocked),
          takeUntil(this._destroy$)
        )
        .subscribe(() => this.closeAll());
    }
  }

  override ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
    super.ngOnDestroy();
  }

  override open<R = unknown, D = unknown, C = unknown>(
    componentOrTemplateRef: ComponentType<C> | TemplateRef<C>,
    config?: DialogConfig<D, DialogRef<R, C>>
  ): DialogRef<R, C> {
    config = {
      backdropClass: this.backDropClasses,
      ...config,
    };

    return super.open(componentOrTemplateRef, config);
  }

  /**
   * Opens a simple dialog, returns true if the user accepted the dialog.
   *
   * @param {SimpleDialogOptions} simpleDialogOptions - An object containing options for the dialog.
   * @returns `boolean` - True if the user accepted the dialog, false otherwise.
   */
  async openSimpleDialog(simpleDialogOptions: SimpleDialogOptions): Promise<boolean> {
    const dialogRef = this.open(SimpleConfigurableDialogComponent, {
      data: simpleDialogOptions,
      disableClose: simpleDialogOptions.disableClose,
    });

    return (await firstValueFrom(dialogRef.closed)) == SimpleDialogCloseType.ACCEPT;
  }

  /**
   * Opens a simple dialog.
   *
   * @deprecated Use `openSimpleDialog` instead. If you find a use case for the `dialogRef`
   * please let #wg-component-library know and we can un-deprecate this method.
   *
   * @param {SimpleDialogOptions} simpleDialogOptions - An object containing options for the dialog.
   * @returns `DialogRef` - The reference to the opened dialog.
   * Contains a closed observable which can be subscribed to for determining which button
   * a user pressed (see `SimpleDialogCloseType`)
   */
  openSimpleDialogRef(simpleDialogOptions: SimpleDialogOptions): DialogRef {
    return this.open(SimpleConfigurableDialogComponent, {
      data: simpleDialogOptions,
      disableClose: simpleDialogOptions.disableClose,
    });
  }

  /**
   * Migrated from `platformUtilsService.showDialog`.
   *
   * @deprecated Use `openSimpleDialog` instead.
   */
  async legacyShowDialog(
    body: string,
    title?: string,
    confirmText?: string,
    cancelText?: string,
    type?: SimpleDialogType
  ): Promise<boolean> {
    return this.openSimpleDialog({
      title: title,
      content: body,
      acceptButtonText: confirmText,
      cancelButtonText: cancelText,
      type: type ?? SimpleDialogType.WARNING,
    });
  }
}
