import { BiometricsService } from "@bitwarden/common/key-management/biometrics/biometric.service";
import { BiometricsStatus } from "@bitwarden/common/key-management/biometrics/biometrics-status";
import { UserId } from "@bitwarden/common/types/guid";
import { UserKey } from "@bitwarden/common/types/key";

export class CliBiometricsService extends BiometricsService {
  async authenticateWithBiometrics(): Promise<boolean> {
    return false;
  }

  async getBiometricsStatus(): Promise<BiometricsStatus> {
    return BiometricsStatus.PlatformUnsupported;
  }

  async unlockWithBiometricsForUser(userId: UserId): Promise<UserKey> {
    return null;
  }

  async getBiometricsStatusForUser(userId: UserId): Promise<BiometricsStatus> {
    return BiometricsStatus.PlatformUnsupported;
  }

  async getShouldAutopromptNow(): Promise<boolean> {
    return false;
  }

  async setShouldAutopromptNow(value: boolean): Promise<void> {}
}
