import { Observable } from "rxjs";

import { DeriveDefinition, DerivedState } from "@bitwarden/common/platform/state";
// eslint-disable-next-line import/no-restricted-paths -- extending this class for this client
import { DefaultDerivedStateProvider } from "@bitwarden/common/platform/state/implementations/default-derived-state.provider";
import { ShapeToInstances, Type } from "@bitwarden/common/src/types/state";

import { ForegroundDerivedState } from "./foreground-derived-state";

export class ForegroundDerivedStateProvider extends DefaultDerivedStateProvider {
  override buildDerivedState<TFrom, TTo, TDeps extends Record<string, Type<unknown>>>(
    _parentState$: Observable<TFrom>,
    deriveDefinition: DeriveDefinition<TFrom, TTo, TDeps>,
    _dependencies: ShapeToInstances<TDeps>,
  ): DerivedState<TTo> {
    return new ForegroundDerivedState(deriveDefinition);
  }
}
