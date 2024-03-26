import { firstValueFrom } from "rxjs";

import {
  FakeAccountService,
  mockAccountServiceWith,
  FakeActiveUserState,
  FakeStateProvider,
  FakeSingleUserState,
} from "../../../../spec";
import { UserId } from "../../../types/guid";
import { BillingAccountProfile } from "../../abstractions/account/billing-account-profile-state.service";

import {
  BILLING_ACCOUNT_PROFILE_KEY_DEFINITION,
  DefaultBillingAccountProfileStateService,
} from "./billing-account-profile-state.service";

describe("BillingAccountProfileStateService", () => {
  let stateProvider: FakeStateProvider;
  let sut: DefaultBillingAccountProfileStateService;
  let billingAccountProfileState: FakeActiveUserState<BillingAccountProfile>;
  let userBillingAccountProfileState: FakeSingleUserState<BillingAccountProfile>;
  let accountService: FakeAccountService;

  const userId = "fakeUserId" as UserId;

  beforeEach(() => {
    accountService = mockAccountServiceWith(userId);
    stateProvider = new FakeStateProvider(accountService);

    sut = new DefaultBillingAccountProfileStateService(stateProvider);

    billingAccountProfileState = stateProvider.activeUser.getFake(
      BILLING_ACCOUNT_PROFILE_KEY_DEFINITION,
    );

    userBillingAccountProfileState = stateProvider.singleUser.getFake(
      userId,
      BILLING_ACCOUNT_PROFILE_KEY_DEFINITION,
    );
  });

  afterEach(() => {
    return jest.resetAllMocks();
  });

  describe("hasPremiumFromAnyOrganization$", () => {
    it("should emit true if they have premium from an organization", async () => {
      userBillingAccountProfileState.nextState({
        hasPremiumPersonally: false,
        hasPremiumFromAnyOrganization: true,
      });

      expect(await firstValueFrom(sut.hasPremiumFromAnyOrganization$)).toBe(true);
    });

    it("should emit false if they do not have premium from an organization", async () => {
      userBillingAccountProfileState.nextState({
        hasPremiumPersonally: false,
        hasPremiumFromAnyOrganization: false,
      });

      expect(await firstValueFrom(sut.hasPremiumFromAnyOrganization$)).toBe(false);
    });

    it("should emit false if there is no active user", async () => {
      await accountService.switchAccount(null);

      expect(await firstValueFrom(sut.hasPremiumFromAnyOrganization$)).toBe(false);
    });
  });

  describe("hasPremiumPersonally$", () => {
    it("should return true if the user has premium personally", async () => {
      userBillingAccountProfileState.nextState({
        hasPremiumPersonally: true,
        hasPremiumFromAnyOrganization: false,
      });

      expect(await firstValueFrom(sut.hasPremiumPersonally$)).toBe(true);
    });

    it("should return false if the user does not have premium personally", async () => {
      userBillingAccountProfileState.nextState({
        hasPremiumPersonally: false,
        hasPremiumFromAnyOrganization: false,
      });

      expect(await firstValueFrom(sut.hasPremiumPersonally$)).toBe(false);
    });

    it("should emit false if there is no active user", async () => {
      await accountService.switchAccount(null);

      expect(await firstValueFrom(sut.hasPremiumPersonally$)).toBe(false);
    });
  });

  describe("hasPremiumFromAnySource$", () => {
    it("should emit changes in hasPremiumPersonally", async () => {
      userBillingAccountProfileState.nextState({
        hasPremiumPersonally: true,
        hasPremiumFromAnyOrganization: false,
      });

      expect(await firstValueFrom(sut.hasPremiumFromAnySource$)).toBe(true);
    });

    it("should emit changes in hasPremiumFromAnyOrganization", async () => {
      userBillingAccountProfileState.nextState({
        hasPremiumPersonally: false,
        hasPremiumFromAnyOrganization: true,
      });

      expect(await firstValueFrom(sut.hasPremiumFromAnySource$)).toBe(true);
    });

    it("should return false if there is no active user", async () => {
      await accountService.switchAccount(null);

      expect(await firstValueFrom(sut.hasPremiumFromAnySource$)).toBe(false);
    });
  });

  describe("setHasPremium", () => {
    it("should update the active users state when called", async () => {
      await sut.setHasPremium(true, false);

      expect(billingAccountProfileState.nextMock).toHaveBeenCalledWith([
        userId,
        { hasPremiumPersonally: true, hasPremiumFromAnyOrganization: false },
      ]);
    });
  });
});
