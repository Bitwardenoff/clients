import { BiometricsService } from "@bitwarden/common/key-management/biometrics/biometric.service";
import { UserId } from "@bitwarden/common/types/guid";

/**
 * This service extends the base biometrics service to provide desktop specific functions,
 * specifically for the main process.
 */
export abstract class DesktopBiometricsService extends BiometricsService {
  /**
   * Enables biometrics for the user. This will can store the biometric unlock key in secure storage (windows/mac). This requires the user to authenticate with biometrics, to prove
   * they are the system user. If denied, this resolves to false.
   */
  abstract enableBiomtricUnlockForUser(userId: UserId, unlockKey: string): Promise<boolean>;

  /**
   * Disables biometrics for the user.
   */
  abstract disableBiometricUnlockForUser(userId: UserId): Promise<void>;

  /**
   * Windows and linux need the biometric unlock key (at the moment userkey) to be provided to the biometric service on the first unlock of the session.
   */
  abstract provideBiometricProtectedUnlockKeyForUser(
    userId: UserId,
    unlockKey: string,
  ): Promise<void>;

  /**
   * Performs autosetup for configuring any system files necessary for biometrics (polkit).
   */
  abstract setupBiometrics(): Promise<void>;

  /**
   * Sets the client keyhalf for the provided userid in memory after an unlock of the vault.
   * @deprecated Client key half should be handled in the rust code only.
   */
  abstract setClientKeyHalfForUser(userId: UserId, value: string): Promise<void>;
}
