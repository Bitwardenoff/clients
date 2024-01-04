/**
 * include structuredClone in test environment.
 * @jest-environment ../../../../shared/test.environment.ts
 */

import { mock } from "jest-mock-extended";
import { BehaviorSubject, firstValueFrom } from "rxjs";

import { FakeActiveUserStateProvider } from "../../../spec/fake-state-provider";
import { PolicyService } from "../../admin-console/abstractions/policy/policy.service.abstraction";
import { PolicyType } from "../../admin-console/enums";
import { Policy } from "../../admin-console/models/domain/policy";
import { ActiveUserState, ActiveUserStateProvider } from "../../platform/state";
import { GeneratorStrategy } from "../abstractions/generation-strategy.abstraction";
import { PolicyEvaluator } from "../abstractions/policy-evaluator.abstraction";

import { GeneratorService } from "./generator.service";
import { PasswordGenerationOptions } from "./password/password-generation-options";

describe("Password generator service", () => {
  describe("options$", () => {
    it("should return the state from strategy.key", () => {
      // mock the call chain
      const state = mock<ActiveUserState<PasswordGenerationOptions>>();
      const stateProvider = mock<ActiveUserStateProvider>();
      stateProvider.get.mockReturnValue(state);
      const strategy = mock<GeneratorStrategy<any, any>>({ disk: {} });
      const service = new GeneratorService(strategy, null, stateProvider);

      // invoke the getter. It returns the state but that's not important.
      service.options$;

      expect(stateProvider.get).toHaveBeenCalledWith(strategy.disk);
    });
  });

  describe("saveOptions()", () => {
    it("should update the state at strategy.key", () => {
      // mock the call chain
      const state = mock<ActiveUserState<PasswordGenerationOptions>>();
      const stateProvider = mock<ActiveUserStateProvider>();
      stateProvider.get.mockReturnValue(state);
      const strategy = mock<GeneratorStrategy<any, any>>({ disk: {} });
      const service = new GeneratorService(strategy, null, stateProvider);

      // invoke the save. The mocks are synchronous so no need to await.
      service.saveOptions({});

      expect(stateProvider.get).toHaveBeenCalledWith(strategy.disk);
      expect(state.update).toHaveBeenCalled();
    });

    it("should trigger an options$ update", async () => {
      const provider = new FakeActiveUserStateProvider();
      const strategy = mock<GeneratorStrategy<any, any>>({ disk: {} });
      provider.getFake(strategy.disk).stateSubject.next({ length: 9 });
      const service = new GeneratorService(strategy, null, provider);

      await service.saveOptions({ length: 10 });

      const options = await firstValueFrom(service.options$);
      expect(options).toEqual({ length: 10 });
    });
  });

  describe("policy$", () => {
    it("should return the policy from the policy service", () => {
      const policyService = mock<PolicyService>();
      const policyInput = mock<Policy>({ data: {} });
      const policyObservable = new BehaviorSubject<Policy>(policyInput).asObservable();
      policyService.get$.mockReturnValue(policyObservable);
      const strategy = mock<GeneratorStrategy<any, any>>({ policy: PolicyType.PasswordGenerator });
      const service = new GeneratorService(strategy, policyService, null);

      // invoke the getter. It returns the policy but that's not important.
      service.policy$;

      expect(policyService.get$).toHaveBeenCalledWith(strategy.policy);
    });

    it("should map the policy using the generation strategy", async () => {
      const policyService = mock<PolicyService>();
      const policyInput = mock<Policy>();
      const policyObservable = new BehaviorSubject<Policy>(policyInput).asObservable();
      policyService.get$.mockReturnValue(policyObservable);
      const expectedOutput = {};
      const strategy = mock<GeneratorStrategy<any, any>>();
      strategy.toGeneratorPolicy.mockReturnValue(expectedOutput);

      const service = new GeneratorService(strategy, policyService, null);

      const policy = await firstValueFrom(service.policy$);

      expect(strategy.toGeneratorPolicy).toHaveBeenCalledWith(policyInput);
      expect(policy).toEqual(expectedOutput);
    });
  });

  describe("policyInEffect$", () => {
    it("should rely upon the latest policy from the policy service", () => {
      const policyService = mock<PolicyService>();
      const policyInput = mock<Policy>({ data: {} });
      const policyObservable = new BehaviorSubject<Policy>(policyInput).asObservable();
      policyService.get$.mockReturnValue(policyObservable);
      const strategy = mock<GeneratorStrategy<any, any>>({ policy: PolicyType.PasswordGenerator });
      const service = new GeneratorService(strategy, policyService, null);

      // invoke the getter. It returns the policy but that's not important.
      service.policyInEffect$;

      expect(policyService.get$).toHaveBeenCalledWith(strategy.policy);
    });

    it("should map the policy using the generation strategy", async () => {
      const policyService = mock<PolicyService>();
      const policyInput = mock<Policy>();
      const policyObservable = new BehaviorSubject<Policy>(policyInput).asObservable();
      policyService.get$.mockReturnValue(policyObservable);
      const evaluator = mock<PolicyEvaluator<any>>();
      evaluator.policyInEffect = true;
      const strategy = mock<GeneratorStrategy<any, any>>({ evaluator: () => evaluator });
      const service = new GeneratorService(strategy, policyService, null);

      const policy = await firstValueFrom(service.policyInEffect$);

      expect(policy).toEqual(true);
    });
  });

  describe("enforcePolicy()", () => {
    it("should load the policy from policy$", async () => {
      const policyService = mock<PolicyService>();
      const policyInput = mock<Policy>();
      const policyObservable = new BehaviorSubject<Policy>(policyInput).asObservable();
      policyService.get$.mockReturnValue(policyObservable);
      const evaluator = mock<PolicyEvaluator<any>>();
      const strategy = mock<GeneratorStrategy<any, any>>({ evaluator: () => evaluator });
      const service = new GeneratorService(strategy, policyService, null);

      await service.enforcePolicy({});

      expect(policyService.get$).toHaveBeenCalledWith(PolicyType.PasswordGenerator);
    });

    it("should evaluate the policy using the generation strategy", async () => {
      const policyService = mock<PolicyService>();
      const policyInput = mock<Policy>();
      const policyObservable = new BehaviorSubject<Policy>(policyInput).asObservable();
      policyService.get$.mockReturnValue(policyObservable);
      const evaluator = mock<PolicyEvaluator<any>>();
      const strategy = mock<GeneratorStrategy<any, any>>({ evaluator: () => evaluator });
      const service = new GeneratorService(strategy, policyService, null);

      await service.enforcePolicy({});

      expect(evaluator.applyPolicy).toHaveBeenCalled();
      expect(evaluator.sanitize).toHaveBeenCalled();
    });
  });

  describe("generate()", () => {
    it("should invoke the generation strategy", async () => {
      const strategy = mock<GeneratorStrategy<any, any>>();
      const service = new GeneratorService(strategy, null, null);

      await service.generate({});

      expect(strategy.generate).toHaveBeenCalled();
    });
  });
});
