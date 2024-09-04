import {
  Fido2AuthenticatorGetAssertionParams,
  Fido2AuthenticatorGetAssertionResult,
  Fido2AuthenticatorMakeCredentialResult,
  Fido2AuthenticatorMakeCredentialsParams,
  Fido2AuthenticatorService as Fido2AuthenticatorServiceAbstraction,
} from "@bitwarden/common/platform/abstractions/fido2/fido2-authenticator.service.abstraction";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { Fido2Utils } from "@bitwarden/common/platform/services/fido2/fido2-utils";
import { guidToRawFormat } from "@bitwarden/common/platform/services/fido2/guid-utils";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import type { autofill } from "@bitwarden/desktop-napi";

export class NativeAutofillRendererService {
  constructor(
    private cipherService: CipherService,
    private fido2AuthenticatorService: Fido2AuthenticatorServiceAbstraction<void>,
    private logService: LogService,
  ) {
    ipc.autofill.listenPasskeyRegistration((clientId, sequenceNumber, request, callback) => {
      this.logService.warning("listenPasskeyRegistration", clientId, sequenceNumber, request);
      this.logService.warning(
        "listenPasskeyRegistration2",
        this.convertRegistrationRequest(request),
      );

      const controller = new AbortController();
      void this.fido2AuthenticatorService
        .makeCredential(this.convertRegistrationRequest(request), null, controller)
        .then((response) => {
          callback(null, this.convertRegistrationResponse(request, response));
        })
        .catch((error) => {
          this.logService.error("listenPasskeyRegistration error", error);
          callback(error, null);
        });
    });

    ipc.autofill.listenPasskeyAssertion(async (clientId, sequenceNumber, request, callback) => {
      this.logService.warning("listenPasskeyAssertion", clientId, sequenceNumber, request);

      // TODO: For some reason the credentialId is passed as an empty array in the request, so we need to
      // get it from the cipher. For that we use the recordIdentifier, which is the cipherId.
      if (request.recordIdentifier && request.credentialId.length === 0) {
        const cipher = await this.cipherService.get(request.recordIdentifier);
        if (!cipher) {
          this.logService.error("listenPasskeyAssertion error", "Cipher not found");
          callback(new Error("Cipher not found"), null);
          return;
        }

        const decrypted = await cipher.decrypt(
          await this.cipherService.getKeyForCipherKeyDecryption(cipher),
        );

        const fido2Credential = decrypted.login.fido2Credentials?.[0];
        if (!fido2Credential) {
          this.logService.error("listenPasskeyAssertion error", "Fido2Credential not found");
          callback(new Error("Fido2Credential not found"), null);
          return;
        }

        request.credentialId = Array.from(
          guidToRawFormat(decrypted.login.fido2Credentials?.[0].credentialId),
        );
      }

      const controller = new AbortController();
      void this.fido2AuthenticatorService
        .getAssertion(this.convertAssertionRequest(request), null, controller)
        .then((response) => {
          callback(null, this.convertAssertionResponse(request, response));
        })
        .catch((error) => {
          this.logService.error("listenPasskeyAssertion error", error);
          callback(error, null);
        });
    });
  }

  private convertRegistrationRequest(
    request: autofill.PasskeyRegistrationRequest,
  ): Fido2AuthenticatorMakeCredentialsParams {
    return {
      hash: new Uint8Array(request.clientDataHash),
      rpEntity: {
        name: request.relyingPartyId,
        id: request.relyingPartyId,
      },
      userEntity: {
        id: new Uint8Array(request.userHandle),
        name: request.userName,
        displayName: request.userName,
        icon: undefined,
      },
      credTypesAndPubKeyAlgs: request.supportedAlgorithms.map((alg) => ({
        alg,
        type: "public-key",
      })),
      // TODO: Marked as optional but needs to be defined?
      excludeCredentialDescriptorList: [],
      requireResidentKey: true,
      requireUserVerification:
        request.userVerification === "required" || request.userVerification === "preferred",
      fallbackSupported: false,
    };
  }

  private convertRegistrationResponse(
    request: autofill.PasskeyRegistrationRequest,
    response: Fido2AuthenticatorMakeCredentialResult,
  ): autofill.PasskeyRegistrationResponse {
    return {
      relyingPartyId: request.relyingPartyId,
      clientDataHash: request.clientDataHash,
      credentialId: Array.from(Fido2Utils.bufferSourceToUint8Array(response.credentialId)),
      attestationObject: Array.from(
        Fido2Utils.bufferSourceToUint8Array(response.attestationObject),
      ),
    };
  }

  private convertAssertionRequest(
    request: autofill.PasskeyAssertionRequest,
  ): Fido2AuthenticatorGetAssertionParams {
    return {
      rpId: request.relyingPartyId,
      hash: new Uint8Array(request.clientDataHash),
      allowCredentialDescriptorList: [
        {
          id: new Uint8Array(request.credentialId),
          type: "public-key",
        },
      ],
      extensions: {},
      requireUserVerification:
        request.userVerification === "required" || request.userVerification === "preferred",
      fallbackSupported: false,
    };
  }

  private convertAssertionResponse(
    request: autofill.PasskeyAssertionRequest,
    response: Fido2AuthenticatorGetAssertionResult,
  ): autofill.PasskeyAssertionResponse {
    return {
      userHandle: Array.from(response.selectedCredential.userHandle),
      relyingPartyId: request.relyingPartyId,
      signature: Array.from(response.signature),
      clientDataHash: request.clientDataHash,
      authenticatorData: Array.from(response.authenticatorData),
      credentialId: Array.from(response.selectedCredential.id),
    };
  }
}
