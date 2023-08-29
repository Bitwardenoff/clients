import { parse } from "tldts";
import { IResult } from "tldts-core";

import { FeatureFlag } from "../../../enums/feature-flag.enum";
import { ConfigServiceAbstraction } from "../../../platform/abstractions/config/config.service.abstraction";
import { LogService } from "../../../platform/abstractions/log.service";
import { Utils } from "../../../platform/misc/utils";
import {
  Fido2AutenticatorError,
  Fido2AutenticatorErrorCode,
  Fido2AuthenticatorGetAssertionParams,
  Fido2AuthenticatorMakeCredentialsParams,
  Fido2AuthenticatorService,
  PublicKeyCredentialDescriptor,
} from "../../abstractions/fido2/fido2-authenticator.service.abstraction";
import {
  AssertCredentialParams,
  AssertCredentialResult,
  CreateCredentialParams,
  CreateCredentialResult,
  FallbackRequestedError,
  Fido2ClientService as Fido2ClientServiceAbstraction,
  PublicKeyCredentialParam,
  UserRequestedFallbackAbortReason,
  UserVerification,
} from "../../abstractions/fido2/fido2-client.service.abstraction";

import { isValidRpId } from "./domain-utils";
import { Fido2Utils } from "./fido2-utils";

export class Fido2ClientService implements Fido2ClientServiceAbstraction {
  constructor(
    private authenticator: Fido2AuthenticatorService,
    private configService: ConfigServiceAbstraction,
    private logService?: LogService
  ) {}

  private verifyCredentialRequest(
    params: CreateCredentialParams | AssertCredentialParams,
    enableFido2VaultCredentials: boolean,
    parsedOrigin: IResult
  ) {
    const { sameOriginWithAncestors, origin } = params;
    const rpId =
      "rpId" in params ? params.rpId : "rp" in params ? params.rp.id : parsedOrigin.hostname;

    if (!enableFido2VaultCredentials) {
      this.logService?.warning(`[Fido2Client] Fido2VaultCredential is not enabled`);
      throw new FallbackRequestedError();
    }

    if (!sameOriginWithAncestors) {
      this.logService?.warning(
        `[Fido2Client] Invalid 'sameOriginWithAncestors' value: ${sameOriginWithAncestors}`
      );
      throw new DOMException("Invalid 'sameOriginWithAncestors' value", "NotAllowedError");
    }

    if (parsedOrigin.hostname == undefined || !origin.startsWith("https://")) {
      this.logService?.warning(`[Fido2Client] Invalid https origin: ${origin}`);
      throw new DOMException("'origin' is not a valid https origin", "SecurityError");
    }

    if (!isValidRpId(rpId, origin)) {
      this.logService?.warning(
        `[Fido2Client] 'rp.id' cannot be used with the current origin: rp.id = ${rpId}; origin = ${origin}`
      );
      throw new DOMException("'rp.id' cannot be used with the current origin", "SecurityError");
    }
  }

  async isFido2FeatureEnabled(): Promise<boolean> {
    return await this.configService.getFeatureFlagBool(FeatureFlag.Fido2VaultCredentials);
  }

  async createCredential(
    params: CreateCredentialParams,
    abortController = new AbortController()
  ): Promise<CreateCredentialResult> {
    const { sameOriginWithAncestors, origin, user } = params;
    const parsedOrigin = parse(origin, { allowPrivateDomains: true });
    const enableFido2VaultCredentials = await this.isFido2FeatureEnabled();
    const rpId = params.rp.id ?? parsedOrigin.hostname;

    this.verifyCredentialRequest(params, enableFido2VaultCredentials, parsedOrigin);

    const userId = Fido2Utils.stringToBuffer(user.id);
    if (userId.length < 1 || userId.length > 64) {
      this.logService?.warning(
        `[Fido2Client] Invalid 'user.id' length: ${user.id} (${userId.length})`
      );
      throw new TypeError("Invalid 'user.id' length");
    }

    let credTypesAndPubKeyAlgs: PublicKeyCredentialParam[];
    if (params.pubKeyCredParams?.length > 0) {
      credTypesAndPubKeyAlgs = params.pubKeyCredParams.filter(
        (kp) => kp.alg === -7 && kp.type === "public-key"
      );
    } else {
      credTypesAndPubKeyAlgs = [
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" },
      ];
    }

    if (credTypesAndPubKeyAlgs.length === 0) {
      const requestedAlgorithms = credTypesAndPubKeyAlgs.map((p) => p.alg).join(", ");
      this.logService?.warning(
        `[Fido2Client] No compatible algorithms found, RP requested: ${requestedAlgorithms}`
      );
      throw new DOMException("No supported key algorithms were found", "NotSupportedError");
    }

    const collectedClientData = {
      type: "webauthn.create",
      challenge: params.challenge,
      origin: origin,
      crossOrigin: !sameOriginWithAncestors,
      // tokenBinding: {} // Not currently supported
    };
    const clientDataJSON = JSON.stringify(collectedClientData);
    const clientDataJSONBytes = Utils.fromByteStringToArray(clientDataJSON);
    const clientDataHash = await crypto.subtle.digest({ name: "SHA-256" }, clientDataJSONBytes);
    if (abortController.signal.aborted) {
      this.logService?.info(`[Fido2Client] Aborted with AbortController`);
      throw new DOMException(undefined, "AbortError");
    }
    const timeout = setAbortTimeout(
      abortController,
      params.authenticatorSelection?.userVerification,
      params.timeout
    );
    const excludeCredentialDescriptorList: PublicKeyCredentialDescriptor[] =
      params.excludeCredentials?.map((credential) => ({
        id: Fido2Utils.stringToBuffer(credential.id),
        transports: credential.transports,
        type: credential.type,
      })) ?? [];

    const makeCredentialParams: Fido2AuthenticatorMakeCredentialsParams = {
      requireResidentKey:
        params.authenticatorSelection?.residentKey === "required" ||
        params.authenticatorSelection?.residentKey === "preferred" ||
        (params.authenticatorSelection?.residentKey === undefined &&
          params.authenticatorSelection?.requireResidentKey === true),
      requireUserVerification: params.authenticatorSelection?.userVerification === "required",
      enterpriseAttestationPossible: params.attestation === "enterprise",
      excludeCredentialDescriptorList,
      credTypesAndPubKeyAlgs,
      hash: clientDataHash,
      rpEntity: {
        id: rpId,
        name: params.rp.name,
      },
      userEntity: {
        id: Fido2Utils.stringToBuffer(user.id),
        displayName: user.displayName,
      },
      fallbackSupported: params.fallbackSupported,
    };
    let makeCredentialResult;
    try {
      makeCredentialResult = await this.authenticator.makeCredential(
        makeCredentialParams,
        abortController
      );
    } catch (error) {
      if (
        abortController.signal.aborted &&
        abortController.signal.reason === UserRequestedFallbackAbortReason
      ) {
        this.logService?.info(`[Fido2Client] Aborting because user requested fallback`);
        throw new FallbackRequestedError();
      }

      if (
        error instanceof Fido2AutenticatorError &&
        error.errorCode === Fido2AutenticatorErrorCode.InvalidState
      ) {
        this.logService?.warning(`[Fido2Client] Unknown error: ${error}`);
        throw new DOMException(undefined, "InvalidStateError");
      }

      this.logService?.info(`[Fido2Client] Aborted by user: ${error}`);
      throw new DOMException(undefined, "NotAllowedError");
    }

    if (abortController.signal.aborted) {
      this.logService?.info(`[Fido2Client] Aborted with AbortController`);
      throw new DOMException(undefined, "AbortError");
    }

    clearTimeout(timeout);
    return {
      credentialId: Fido2Utils.bufferToString(makeCredentialResult.credentialId),
      attestationObject: Fido2Utils.bufferToString(makeCredentialResult.attestationObject),
      authData: Fido2Utils.bufferToString(makeCredentialResult.authData),
      clientDataJSON: Fido2Utils.bufferToString(clientDataJSONBytes),
      publicKeyAlgorithm: makeCredentialResult.publicKeyAlgorithm,
      transports: ["hybrid"],
    };
  }

  async assertCredential(
    params: AssertCredentialParams,
    abortController = new AbortController()
  ): Promise<AssertCredentialResult> {
    const { sameOriginWithAncestors, origin, userVerification } = params;
    const parsedOrigin = parse(origin, { allowPrivateDomains: true });
    const rpId = params.rpId ?? parsedOrigin.hostname;
    const enableFido2VaultCredentials = await this.isFido2FeatureEnabled();

    this.verifyCredentialRequest(params, enableFido2VaultCredentials, parsedOrigin);

    const { domain: effectiveDomain } = parsedOrigin;
    if (effectiveDomain == undefined) {
      this.logService?.warning(`[Fido2Client] Invalid origin: ${origin}`);
      throw new DOMException("'origin' is not a valid domain", "SecurityError");
    }

    const collectedClientData = {
      type: "webauthn.get",
      challenge: params.challenge,
      origin: origin,
      crossOrigin: !sameOriginWithAncestors,
      // tokenBinding: {} // Not currently supported
    };
    const clientDataJSON = JSON.stringify(collectedClientData);
    const clientDataJSONBytes = Utils.fromByteStringToArray(clientDataJSON);
    const clientDataHash = await crypto.subtle.digest({ name: "SHA-256" }, clientDataJSONBytes);

    if (abortController.signal.aborted) {
      this.logService?.info(`[Fido2Client] Aborted with AbortController`);
      throw new DOMException(undefined, "AbortError");
    }

    const timeout = setAbortTimeout(abortController, userVerification, params.timeout);

    const allowCredentialDescriptorList: PublicKeyCredentialDescriptor[] =
      params.allowedCredentialIds.map((id) => ({
        id: Fido2Utils.stringToBuffer(id),
        type: "public-key",
      }));

    const getAssertionParams: Fido2AuthenticatorGetAssertionParams = {
      rpId,
      requireUserVerification: userVerification === "required",
      hash: clientDataHash,
      allowCredentialDescriptorList,
      extensions: {},
      fallbackSupported: params.fallbackSupported,
    };

    let getAssertionResult;
    try {
      getAssertionResult = await this.authenticator.getAssertion(
        getAssertionParams,
        abortController
      );
    } catch (error) {
      if (
        abortController.signal.aborted &&
        abortController.signal.reason === UserRequestedFallbackAbortReason
      ) {
        this.logService?.info(`[Fido2Client] Aborting because user requested fallback`);
        throw new FallbackRequestedError();
      }

      if (
        error instanceof Fido2AutenticatorError &&
        error.errorCode === Fido2AutenticatorErrorCode.InvalidState
      ) {
        this.logService?.warning(`[Fido2Client] Unknown error: ${error}`);
        throw new DOMException(undefined, "InvalidStateError");
      }

      this.logService?.info(`[Fido2Client] Aborted by user: ${error}`);
      throw new DOMException(undefined, "NotAllowedError");
    }

    if (abortController.signal.aborted) {
      this.logService?.info(`[Fido2Client] Aborted with AbortController`);
      throw new DOMException(undefined, "AbortError");
    }
    clearTimeout(timeout);

    return {
      authenticatorData: Fido2Utils.bufferToString(getAssertionResult.authenticatorData),
      clientDataJSON: Fido2Utils.bufferToString(clientDataJSONBytes),
      credentialId: Fido2Utils.bufferToString(getAssertionResult.selectedCredential.id),
      userHandle:
        getAssertionResult.selectedCredential.userHandle !== undefined
          ? Fido2Utils.bufferToString(getAssertionResult.selectedCredential.userHandle)
          : undefined,
      signature: Fido2Utils.bufferToString(getAssertionResult.signature),
    };
  }
}

const TIMEOUTS = {
  NO_VERIFICATION: {
    DEFAULT: 120000,
    MIN: 30000,
    MAX: 180000,
  },
  WITH_VERIFICATION: {
    DEFAULT: 300000,
    MIN: 30000,
    MAX: 600000,
  },
};

function setAbortTimeout(
  abortController: AbortController,
  userVerification?: UserVerification,
  timeout?: number
): number {
  let clampedTimeout: number;

  if (userVerification === "required") {
    timeout = timeout ?? TIMEOUTS.WITH_VERIFICATION.DEFAULT;
    clampedTimeout = Math.max(
      TIMEOUTS.WITH_VERIFICATION.MIN,
      Math.min(timeout, TIMEOUTS.WITH_VERIFICATION.MAX)
    );
  } else {
    timeout = timeout ?? TIMEOUTS.NO_VERIFICATION.DEFAULT;
    clampedTimeout = Math.max(
      TIMEOUTS.NO_VERIFICATION.MIN,
      Math.min(timeout, TIMEOUTS.NO_VERIFICATION.MAX)
    );
  }

  return window.setTimeout(() => abortController.abort(), clampedTimeout);
}
