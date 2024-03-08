import { Constructor } from "type-fest";

import { SafeInjectionToken } from "../services/injection-tokens";

// TODO: type-fest also provides a type like this when we upgrade >= 3.7.0
type AbstractConstructor<T> = abstract new (...args: any) => T;

type MapParametersToDeps<T> = {
  [K in keyof T]: AbstractConstructor<T[K]> | SafeInjectionToken<T[K]>;
};

type SafeInjectionTokenType<T> = T extends SafeInjectionToken<infer J> ? J : never;

export const useClass = <
  A extends AbstractConstructor<any>, // A is an abstract class
  I extends Constructor<InstanceType<A>>, // I is the implementation, it has a non-abstract ctor that returns a type that extends A
  D extends MapParametersToDeps<ConstructorParameters<I>>, // accept an array of constructor types OR injection tokens matching ctor parameters
>(obj: {
  provide: A;
  useClass: I;
  deps: D;
}) => obj;

export const useValue = <
  A extends SafeInjectionToken<any>,
  V extends SafeInjectionTokenType<A>,
>(obj: {
  provide: A;
  useValue: V;
}) => obj;

type FunctionOrConstructorParameters<T> =
  T extends Constructor<any>
    ? ConstructorParameters<T>
    : T extends (...args: any) => any
      ? Parameters<T>
      : never;

export const useFactory = <
  A extends SafeInjectionToken<any> | AbstractConstructor<any>,
  I extends (
    ...args: any
  ) => A extends SafeInjectionToken<any>
    ? SafeInjectionTokenType<A>
    : A extends AbstractConstructor<any>
      ? InstanceType<A>
      : never,
  D extends MapParametersToDeps<FunctionOrConstructorParameters<I>>,
>(obj: {
  provide: A;
  useFactory: I;
  deps: D;
}) => obj;
