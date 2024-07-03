import { UserId } from "@bitwarden/common/types/guid";

import { PasswordInputResult } from "../input-password/password-input-result";

export abstract class SetPasswordJitService {
  setPassword: (
    passwordInputResult: PasswordInputResult,
    orgSsoIdentifier: string,
    orgId: string,
    resetPasswordAutoEnroll: boolean,
    userId: UserId,
  ) => Promise<void>;
  runClientSpecificLogic: () => Promise<void> | null;
}
