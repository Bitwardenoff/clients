import { Injectable, OnDestroy, Optional } from "@angular/core";
import {
  BehaviorSubject,
  EmptyError,
  Observable,
  Subject,
  distinctUntilChanged,
  firstValueFrom,
  map,
  merge,
  takeUntil,
} from "rxjs";

import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { ValidationService } from "@bitwarden/common/platform/abstractions/validation.service";

import { FunctionReturningAwaitable, functionToObservable } from "../utils/function-to-observable";

export type ContextState = { status: "inactive" } | { status: "active"; origin: unknown };
export type Status = ContextState["status"];
export type ServiceState = { [context: string]: ContextState };

@Injectable({
  providedIn: "root",
})
export class AsyncActionsService implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly states$ = new BehaviorSubject<ServiceState>({});

  constructor(
    @Optional() private validationService?: ValidationService,
    @Optional() private logService?: LogService,
  ) {}

  /**
   * Emits the current state of the context.
   * - When no action has been executed, it emits `{ status: "inactive" }`.
   * - When an action has been executed, it emits `{ status: "active", origin: unknown }`.
   *
   * @param context The context for which to get the state.
   */
  state$(context: string): Observable<ContextState> {
    // Using a constant here to avoid creating a new object every time the observable emits,
    // which causes the distinctUntilChanged operator to emit the value.
    const inactiveState = { status: "inactive" } as ContextState;
    return this.states$.pipe(
      map((states) => states[context] ?? inactiveState),
      distinctUntilChanged(),
    );
  }

  /**
   * Takes a function that returns a promise or an observable and executes it, handling the loading state and errors.
   * - If the function returns a promise, the loading state will be set to true until the promise is resolved or rejected.
   * - If the function returns an observable, the loading state will be set to true until the observable emits, completes or errors.
   *   - The observable will be unsubscribed if the service is destroyed.
   * - Regular functions are also supported, but the loading state will not be set. This is useful for functions that might
   *   need to return early.
   *
   * NOTE: The handler will not be executed if another action is already active in the same context.
   *
   * @param context A string that will be used to group the loading state of multiple async actions.
   * @param origin The object that the action originated from.
   * @param handler The function to execute.
   * @param until An observable that will cause the action to be cancelled when it emits.
   */
  async execute(
    context: string,
    origin: unknown,
    handler: FunctionReturningAwaitable,
    until?: Observable<unknown>,
  ): Promise<void> {
    // Access the current state directly, otherwise you can execute multiple actions in the same context
    // by not awaiting the promise returned by this method.
    if (this.states$.value?.[context]?.status === "active") {
      return;
    }

    this.updateState((state) => ({ ...state, [context]: { status: "active", origin } }));

    try {
      await firstValueFrom(
        functionToObservable(handler).pipe(
          takeUntil(until ? merge(this.destroy$, until) : this.destroy$),
        ),
      );
    } catch (error) {
      if (error instanceof EmptyError) {
        // The observable completed without emitting any value, ignore it, the finally block will handle cleanup.
        return;
      }

      this.logService?.error(`Async action exception: ${error}`, error);
      this.validationService?.showError(error);
    } finally {
      this.removeState(context);
    }
  }

  private updateState(handler: (state: ServiceState) => ServiceState) {
    this.states$.next(handler(this.states$.value));
  }

  private removeState(context: string) {
    this.updateState((state) => {
      const newState = { ...state };
      delete newState[context];
      return newState;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
