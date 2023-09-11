export interface NewCredentialParams {
  credentialName: string;
  userName: string;
  userVerification: boolean;
}

export interface PickCredentialParams {
  cipherIds: string[];
  userVerification: boolean;
}

export abstract class Fido2UserInterfaceService {
  newSession: (
    fallbackSupported: boolean,
    abortController?: AbortController
  ) => Promise<Fido2UserInterfaceSession>;
}

export abstract class Fido2UserInterfaceSession {
  fallbackRequested = false;
  aborted = false;

  pickCredential: (
    params: PickCredentialParams,
    abortController?: AbortController
  ) => Promise<{ cipherId: string; userVerified: boolean }>;
  confirmNewCredential: (
    params: NewCredentialParams,
    abortController?: AbortController
  ) => Promise<{ cipherId: string; userVerified: boolean }>;
  ensureUnlockedVault: () => Promise<void>;
  informExcludedCredential: (
    existingCipherIds: string[],
    abortController?: AbortController
  ) => Promise<void>;
  informCredentialNotFound: (abortController?: AbortController) => Promise<void>;
  close: () => void;
}
