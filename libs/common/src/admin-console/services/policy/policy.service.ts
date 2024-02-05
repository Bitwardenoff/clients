import { map, Observable, of } from "rxjs";

import { ListResponse } from "../../../models/response/list.response";
import { KeyDefinition, POLICIES_DISK, StateProvider } from "../../../platform/state";
import { PolicyId, UserId } from "../../../types/guid";
import { OrganizationService } from "../../abstractions/organization/organization.service.abstraction";
import { InternalPolicyService as InternalPolicyServiceAbstraction } from "../../abstractions/policy/policy.service.abstraction";
import { OrganizationUserStatusType, PolicyType } from "../../enums";
import { PolicyData } from "../../models/data/policy.data";
import { MasterPasswordPolicyOptions } from "../../models/domain/master-password-policy-options";
import { Policy } from "../../models/domain/policy";
import { ResetPasswordPolicyOptions } from "../../models/domain/reset-password-policy-options";
import { PolicyResponse } from "../../models/response/policy.response";

const policyRecordToArray = (policiesMap: { [id: string]: PolicyData }) =>
  Object.values(policiesMap || {}).map((f) => new Policy(f));

export const POLICY_POLICY = KeyDefinition.record<PolicyData, PolicyId>(POLICIES_DISK, "policies", {
  deserializer: (policyData) => policyData,
});

export class PolicyService implements InternalPolicyServiceAbstraction {
  private policyState = this.stateProvider.getActive(POLICY_POLICY);

  policies$ = this.policyState.state$.pipe(map((policyData) => policyRecordToArray(policyData)));

  constructor(
    private stateProvider: StateProvider,
    private organizationService: OrganizationService,
  ) {}

  // --- Core state management methods ---

  get$(policyType: PolicyType) {
    return this.policies$.pipe(
      map((policies) => policies.filter((p) => p.type == policyType)),
      map((policies) => policies.filter((p) => this.enforcedPolicyFilter(p))),
    );
  }

  getForUser$(userId: UserId, policyType: PolicyType) {
    return this.stateProvider.getUser(userId, POLICY_POLICY).state$.pipe(
      map((policyData) => policyRecordToArray(policyData)),
      map((policy) => policy.filter((p) => p.type === policyType)),
      map((policies) => policies.filter((p) => this.enforcedPolicyFilter(p))),
    );
  }

  policyAppliesToActiveUser$(policyType: PolicyType) {
    return this.get$(policyType).pipe(map((policies) => policies.length > 0));
  }

  async upsert(policy: PolicyData): Promise<any> {
    await this.policyState.update((policies) => {
      policies ??= {};
      policies[policy.id] = policy;
      return policies;
    });
  }

  async replace(policies: { [id: string]: PolicyData }): Promise<void> {
    await this.policyState.update(() => policies);
  }

  async clear(userId?: UserId): Promise<void> {
    if (userId == null) {
      await this.policyState.update(() => ({}));
      return;
    }

    await this.stateProvider.getUser(userId, POLICY_POLICY).update(() => ({}));
  }

  mapPolicyFromResponse(policyResponse: PolicyResponse): Policy {
    const policyData = new PolicyData(policyResponse);
    return new Policy(policyData);
  }

  mapPoliciesFromToken(policiesResponse: ListResponse<PolicyResponse>): Policy[] {
    if (policiesResponse?.data == null) {
      return null;
    }

    return policiesResponse.data.map((response) => this.mapPolicyFromResponse(response));
  }

  // --- Policy-specific interfaces - to be deprecated ---

  masterPasswordPolicyOptions$(policies?: Policy[]): Observable<MasterPasswordPolicyOptions> {
    const observable = policies
      ? of(policies.filter((p) => p.type === PolicyType.MasterPassword))
      : this.get$(PolicyType.MasterPassword);

    return observable.pipe(
      map((obsPolicies) => {
        let enforcedOptions: MasterPasswordPolicyOptions = null;

        if (obsPolicies == null || obsPolicies.length === 0) {
          return enforcedOptions;
        }

        obsPolicies.forEach((currentPolicy) => {
          if (!currentPolicy.enabled || currentPolicy.data == null) {
            return;
          }

          if (enforcedOptions == null) {
            enforcedOptions = new MasterPasswordPolicyOptions();
          }

          if (
            currentPolicy.data.minComplexity != null &&
            currentPolicy.data.minComplexity > enforcedOptions.minComplexity
          ) {
            enforcedOptions.minComplexity = currentPolicy.data.minComplexity;
          }

          if (
            currentPolicy.data.minLength != null &&
            currentPolicy.data.minLength > enforcedOptions.minLength
          ) {
            enforcedOptions.minLength = currentPolicy.data.minLength;
          }

          if (currentPolicy.data.requireUpper) {
            enforcedOptions.requireUpper = true;
          }

          if (currentPolicy.data.requireLower) {
            enforcedOptions.requireLower = true;
          }

          if (currentPolicy.data.requireNumbers) {
            enforcedOptions.requireNumbers = true;
          }

          if (currentPolicy.data.requireSpecial) {
            enforcedOptions.requireSpecial = true;
          }

          if (currentPolicy.data.enforceOnLogin) {
            enforcedOptions.enforceOnLogin = true;
          }
        });

        return enforcedOptions;
      }),
    );
  }

  evaluateMasterPassword(
    passwordStrength: number,
    newPassword: string,
    enforcedPolicyOptions: MasterPasswordPolicyOptions,
  ): boolean {
    if (enforcedPolicyOptions == null) {
      return true;
    }

    if (
      enforcedPolicyOptions.minComplexity > 0 &&
      enforcedPolicyOptions.minComplexity > passwordStrength
    ) {
      return false;
    }

    if (
      enforcedPolicyOptions.minLength > 0 &&
      enforcedPolicyOptions.minLength > newPassword.length
    ) {
      return false;
    }

    if (enforcedPolicyOptions.requireUpper && newPassword.toLocaleLowerCase() === newPassword) {
      return false;
    }

    if (enforcedPolicyOptions.requireLower && newPassword.toLocaleUpperCase() === newPassword) {
      return false;
    }

    if (enforcedPolicyOptions.requireNumbers && !/[0-9]/.test(newPassword)) {
      return false;
    }

    // eslint-disable-next-line
    if (enforcedPolicyOptions.requireSpecial && !/[!@#$%\^&*]/g.test(newPassword)) {
      return false;
    }

    return true;
  }

  getResetPasswordPolicyOptions(
    policies: Policy[],
    orgId: string,
  ): [ResetPasswordPolicyOptions, boolean] {
    const resetPasswordPolicyOptions = new ResetPasswordPolicyOptions();

    if (policies == null || orgId == null) {
      return [resetPasswordPolicyOptions, false];
    }

    const policy = policies.find(
      (p) => p.organizationId === orgId && p.type === PolicyType.ResetPassword && p.enabled,
    );
    resetPasswordPolicyOptions.autoEnrollEnabled = policy?.data?.autoEnrollEnabled ?? false;

    return [resetPasswordPolicyOptions, policy?.enabled ?? false];
  }

  // --- Private helper methods ---

  private enforcedPolicyFilter(policy: Policy) {
    const org = this.organizationService.get(policy.organizationId);

    // This shouldn't happen, i.e. the user should only have policies for orgs they are a member of
    // But if it does, err on the side of enforcing the policy
    if (org == null) {
      return true;
    }

    return (
      org.status >= OrganizationUserStatusType.Accepted &&
      org.usePolicies &&
      !this.isExemptFromPolicy(policy)
    );
  }

  /**
   * Determines whether an orgUser is exempt from a specific policy because of their role
   * Generally orgUsers who can manage policies are exempt from them, but some policies are stricter
   * @returns
   */
  private isExemptFromPolicy(policy: Policy) {
    const org = this.organizationService.get(policy.organizationId);

    switch (policy.type) {
      case PolicyType.MaximumVaultTimeout:
        // Max Vault Timeout applies to everyone except owners
        return org.isOwner;
      default:
        return org.canManagePolicies;
    }
  }
}
