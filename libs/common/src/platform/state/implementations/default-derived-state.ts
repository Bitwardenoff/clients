import { Observable, ReplaySubject, Subject, concatMap, merge, share, timer } from "rxjs";

import { ShapeToInstances, DerivedStateDependencies } from "../../../types/state";
import {
  AbstractStorageService,
  ObservableStorageService,
} from "../../abstractions/storage.service";
import { DeriveDefinition, derivedKeyBuilder } from "../derive-definition";
import { DerivedState } from "../derived-state";

/**
 * Default derived state
 */
export class DefaultDerivedState<TFrom, TTo, TDeps extends DerivedStateDependencies>
  implements DerivedState<TTo>
{
  private readonly storageKey: string;
  private forcedValueSubject = new Subject<TTo>();
  // for testing purposes
  private replaySubject: ReplaySubject<TTo>;

  state$: Observable<TTo>;

  constructor(
    private parentState$: Observable<TFrom>,
    protected deriveDefinition: DeriveDefinition<TFrom, TTo, TDeps>,
    private memoryStorage: AbstractStorageService & ObservableStorageService,
    private dependencies: ShapeToInstances<TDeps>,
  ) {
    this.storageKey = derivedKeyBuilder(deriveDefinition);

    const derivedState$ = this.parentState$.pipe(
      concatMap(async (state) => {
        let derivedStateOrPromise = this.deriveDefinition.derive(state, this.dependencies);
        if (derivedStateOrPromise instanceof Promise) {
          derivedStateOrPromise = await derivedStateOrPromise;
        }
        const derivedState = derivedStateOrPromise;
        await this.memoryStorage.save(this.storageKey, derivedState);
        return derivedState;
      }),
    );

    this.state$ = merge(this.forcedValueSubject, derivedState$).pipe(
      share({
        connector: () => {
          this.replaySubject = new ReplaySubject<TTo>(1);
          return this.replaySubject;
        },
        resetOnRefCountZero: () => timer(this.deriveDefinition.cleanupDelayMs),
      }),
    );
  }

  async forceValue(value: TTo) {
    await this.memoryStorage.save(this.storageKey, value);
    this.forcedValueSubject.next(value);
    return value;
  }
}
