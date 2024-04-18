import { mock } from "jest-mock-extended";

import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { AuthRequestResponse } from "@bitwarden/common/auth/models/response/auth-request.response";
import { FakeMasterPasswordService } from "@bitwarden/common/auth/services/master-password/fake-master-password.service";
import { AuthRequestPushNotification } from "@bitwarden/common/models/response/notification.response";
import { AppIdService } from "@bitwarden/common/platform/abstractions/app-id.service";
import { CryptoService } from "@bitwarden/common/platform/abstractions/crypto.service";
import { Utils } from "@bitwarden/common/platform/misc/utils";
import { EncString } from "@bitwarden/common/platform/models/domain/enc-string";
import { SymmetricCryptoKey } from "@bitwarden/common/platform/models/domain/symmetric-crypto-key";
import { StateProvider } from "@bitwarden/common/platform/state";
import { FakeAccountService, mockAccountServiceWith } from "@bitwarden/common/spec";
import { UserId } from "@bitwarden/common/types/guid";
import { MasterKey, UserKey } from "@bitwarden/common/types/key";

import { AuthRequestService } from "./auth-request.service";

describe("AuthRequestService", () => {
  let sut: AuthRequestService;

  const stateProvider = mock<StateProvider>();
  let accountService: FakeAccountService;
  let masterPasswordService: FakeMasterPasswordService;
  const appIdService = mock<AppIdService>();
  const cryptoService = mock<CryptoService>();
  const apiService = mock<ApiService>();

  let mockPrivateKey: Uint8Array;
  const mockUserId = Utils.newGuid() as UserId;

  beforeEach(() => {
    jest.clearAllMocks();
    accountService = mockAccountServiceWith(mockUserId);
    masterPasswordService = new FakeMasterPasswordService();

    sut = new AuthRequestService(
      appIdService,
      accountService,
      masterPasswordService,
      cryptoService,
      apiService,
      stateProvider,
    );

    mockPrivateKey = new Uint8Array(64);
  });

  describe("authRequestPushNotification$", () => {
    it("should emit when sendAuthRequestPushNotification is called", () => {
      const notification = {
        id: "PUSH_NOTIFICATION",
        userId: "USER_ID",
      } as AuthRequestPushNotification;

      const spy = jest.fn();
      sut.authRequestPushNotification$.subscribe(spy);

      sut.sendAuthRequestPushNotification(notification);

      expect(spy).toHaveBeenCalledWith("PUSH_NOTIFICATION");
    });
  });

  describe("AcceptAuthRequests", () => {
    it("returns an error when userId isn't provided", async () => {
      await expect(sut.getAcceptAuthRequests(undefined)).rejects.toThrow("User ID is required");
      await expect(sut.setAcceptAuthRequests(true, undefined)).rejects.toThrow(
        "User ID is required",
      );
    });
  });

  describe("AdminAuthRequest", () => {
    it("returns an error when userId isn't provided", async () => {
      await expect(sut.getAdminAuthRequest(undefined)).rejects.toThrow("User ID is required");
      await expect(sut.setAdminAuthRequest(undefined, undefined)).rejects.toThrow(
        "User ID is required",
      );
      await expect(sut.clearAdminAuthRequest(undefined)).rejects.toThrow("User ID is required");
    });

    it("does not allow clearing from setAdminAuthRequest", async () => {
      await expect(sut.setAdminAuthRequest(null, "USER_ID" as UserId)).rejects.toThrow(
        "Auth request is required",
      );
    });
  });

  describe("approveOrDenyAuthRequest", () => {
    beforeEach(() => {
      cryptoService.rsaEncrypt.mockResolvedValue({
        encryptedString: "ENCRYPTED_STRING",
      } as EncString);
      appIdService.getAppId.mockResolvedValue("APP_ID");
    });
    it("should throw if auth request is missing id or key", async () => {
      const authRequestNoId = new AuthRequestResponse({ id: "", key: "KEY" });
      const authRequestNoPublicKey = new AuthRequestResponse({ id: "123", publicKey: "" });

      await expect(sut.approveOrDenyAuthRequest(true, authRequestNoId)).rejects.toThrow(
        "Auth request has no id",
      );
      await expect(sut.approveOrDenyAuthRequest(true, authRequestNoPublicKey)).rejects.toThrow(
        "Auth request has no public key",
      );
    });

    it("should use the master key and hash if they exist", async () => {
      masterPasswordService.masterKeySubject.next({ encKey: new Uint8Array(64) } as MasterKey);
      masterPasswordService.masterKeyHashSubject.next("MASTER_KEY_HASH");

      await sut.approveOrDenyAuthRequest(
        true,
        new AuthRequestResponse({ id: "123", publicKey: "KEY" }),
      );

      expect(cryptoService.rsaEncrypt).toHaveBeenCalledWith(new Uint8Array(64), expect.anything());
    });

    it("should use the user key if the master key and hash do not exist", async () => {
      cryptoService.getUserKey.mockResolvedValueOnce({ key: new Uint8Array(64) } as UserKey);

      await sut.approveOrDenyAuthRequest(
        true,
        new AuthRequestResponse({ id: "123", publicKey: "KEY" }),
      );

      expect(cryptoService.rsaEncrypt).toHaveBeenCalledWith(new Uint8Array(64), expect.anything());
    });
  });
  describe("setUserKeyAfterDecryptingSharedUserKey", () => {
    it("decrypts and sets user key when given valid auth request response and private key", async () => {
      // Arrange
      const mockAuthReqResponse = {
        key: "authReqPublicKeyEncryptedUserKey",
      } as AuthRequestResponse;

      const mockDecryptedUserKey = {} as UserKey;
      jest.spyOn(sut, "decryptPubKeyEncryptedUserKey").mockResolvedValueOnce(mockDecryptedUserKey);

      cryptoService.setUserKey.mockResolvedValueOnce(undefined);

      // Act
      await sut.setUserKeyAfterDecryptingSharedUserKey(mockAuthReqResponse, mockPrivateKey);

      // Assert
      expect(sut.decryptPubKeyEncryptedUserKey).toBeCalledWith(
        mockAuthReqResponse.key,
        mockPrivateKey,
      );
      expect(cryptoService.setUserKey).toBeCalledWith(mockDecryptedUserKey);
    });
  });

  describe("setKeysAfterDecryptingSharedMasterKeyAndHash", () => {
    it("decrypts and sets master key and hash and user key when given valid auth request response and private key", async () => {
      // Arrange
      const mockAuthReqResponse = {
        key: "authReqPublicKeyEncryptedMasterKey",
        masterPasswordHash: "authReqPublicKeyEncryptedMasterKeyHash",
      } as AuthRequestResponse;

      const mockDecryptedMasterKey = {} as MasterKey;
      const mockDecryptedMasterKeyHash = "mockDecryptedMasterKeyHash";
      const mockDecryptedUserKey = {} as UserKey;

      jest.spyOn(sut, "decryptPubKeyEncryptedMasterKeyAndHash").mockResolvedValueOnce({
        masterKey: mockDecryptedMasterKey,
        masterKeyHash: mockDecryptedMasterKeyHash,
      });

      masterPasswordService.masterKeySubject.next(undefined);
      masterPasswordService.masterKeyHashSubject.next(undefined);
      masterPasswordService.decryptUserKeyWithMasterKey.mockResolvedValueOnce(mockDecryptedUserKey);
      cryptoService.setUserKey.mockResolvedValueOnce(undefined);

      // Act
      await sut.setKeysAfterDecryptingSharedMasterKeyAndHash(mockAuthReqResponse, mockPrivateKey);

      // Assert
      expect(sut.decryptPubKeyEncryptedMasterKeyAndHash).toBeCalledWith(
        mockAuthReqResponse.key,
        mockAuthReqResponse.masterPasswordHash,
        mockPrivateKey,
      );
      expect(masterPasswordService.mock.setMasterKey).toHaveBeenCalledWith(
        mockDecryptedMasterKey,
        mockUserId,
      );
      expect(masterPasswordService.mock.setMasterKeyHash).toHaveBeenCalledWith(
        mockDecryptedMasterKeyHash,
        mockUserId,
      );
      expect(masterPasswordService.decryptUserKeyWithMasterKey).toHaveBeenCalledWith(
        mockDecryptedMasterKey,
      );
      expect(cryptoService.setUserKey).toHaveBeenCalledWith(mockDecryptedUserKey);
    });
  });

  describe("decryptAuthReqPubKeyEncryptedUserKey", () => {
    it("returns a decrypted user key when given valid public key encrypted user key and an auth req private key", async () => {
      // Arrange
      const mockPubKeyEncryptedUserKey = "pubKeyEncryptedUserKey";
      const mockDecryptedUserKeyBytes = new Uint8Array(64);
      const mockDecryptedUserKey = new SymmetricCryptoKey(mockDecryptedUserKeyBytes) as UserKey;

      cryptoService.rsaDecrypt.mockResolvedValueOnce(mockDecryptedUserKeyBytes);

      // Act
      const result = await sut.decryptPubKeyEncryptedUserKey(
        mockPubKeyEncryptedUserKey,
        mockPrivateKey,
      );

      // Assert
      expect(cryptoService.rsaDecrypt).toBeCalledWith(mockPubKeyEncryptedUserKey, mockPrivateKey);
      expect(result).toEqual(mockDecryptedUserKey);
    });
  });

  describe("decryptAuthReqPubKeyEncryptedMasterKeyAndHash", () => {
    it("returns a decrypted master key and hash when given a valid public key encrypted master key, public key encrypted master key hash, and an auth req private key", async () => {
      // Arrange
      const mockPubKeyEncryptedMasterKey = "pubKeyEncryptedMasterKey";
      const mockPubKeyEncryptedMasterKeyHash = "pubKeyEncryptedMasterKeyHash";

      const mockDecryptedMasterKeyBytes = new Uint8Array(64);
      const mockDecryptedMasterKey = new SymmetricCryptoKey(
        mockDecryptedMasterKeyBytes,
      ) as MasterKey;
      const mockDecryptedMasterKeyHashBytes = new Uint8Array(64);
      const mockDecryptedMasterKeyHash = Utils.fromBufferToUtf8(mockDecryptedMasterKeyHashBytes);

      cryptoService.rsaDecrypt
        .mockResolvedValueOnce(mockDecryptedMasterKeyBytes)
        .mockResolvedValueOnce(mockDecryptedMasterKeyHashBytes);

      // Act
      const result = await sut.decryptPubKeyEncryptedMasterKeyAndHash(
        mockPubKeyEncryptedMasterKey,
        mockPubKeyEncryptedMasterKeyHash,
        mockPrivateKey,
      );

      // Assert
      expect(cryptoService.rsaDecrypt).toHaveBeenNthCalledWith(
        1,
        mockPubKeyEncryptedMasterKey,
        mockPrivateKey,
      );
      expect(cryptoService.rsaDecrypt).toHaveBeenNthCalledWith(
        2,
        mockPubKeyEncryptedMasterKeyHash,
        mockPrivateKey,
      );
      expect(result.masterKey).toEqual(mockDecryptedMasterKey);
      expect(result.masterKeyHash).toEqual(mockDecryptedMasterKeyHash);
    });
  });
});
