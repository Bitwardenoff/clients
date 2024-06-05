import { MonoTypeOperatorFunction, Observable } from "rxjs";

import { DeriveDefinition, DerivedState } from "@bitwarden/common/platform/state";
// eslint-disable-next-line import/no-restricted-paths -- extending this class for this client
import { DefaultDerivedStateProvider } from "@bitwarden/common/platform/state/implementations/default-derived-state.provider";
import { DerivedStateDependencies } from "@bitwarden/common/src/types/state";

import { ForegroundDerivedState } from "./foreground-derived-state";

export class ForegroundDerivedStateProvider extends DefaultDerivedStateProvider {
  constructor(private pipeCustomizer: MonoTypeOperatorFunction<unknown>) {
    super();
  }
  override buildDerivedState<TFrom, TTo, TDeps extends DerivedStateDependencies>(
    _parentState$: Observable<TFrom>,
    deriveDefinition: DeriveDefinition<TFrom, TTo, TDeps>,
    _dependencies: TDeps,
  ): DerivedState<TTo> {
    return new ForegroundDerivedState(
      deriveDefinition,
      deriveDefinition.buildCacheKey(),
      this.pipeCustomizer as MonoTypeOperatorFunction<TTo>,
    );
  }
}
