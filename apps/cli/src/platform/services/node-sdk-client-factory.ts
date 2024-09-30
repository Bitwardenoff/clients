import { SdkClientFactory } from "@bitwarden/common/platform/abstractions/sdk/sdk-client-factory";
import * as sdk from "@bitwarden/sdk-internal";

/**
 * The sdk-internal package exposes a non ESM module with a slightly different initialization.
 */
export class NodeSdkClientFactory implements SdkClientFactory {
  async createSdkClient(
    ...args: ConstructorParameters<typeof sdk.BitwardenClient>
  ): Promise<sdk.BitwardenClient> {
    return Promise.resolve(new sdk.BitwardenClient(...args));
  }
}
