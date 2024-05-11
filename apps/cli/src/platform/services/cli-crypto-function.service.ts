import { NodeCryptoFunctionService } from "@bitwarden/node/services/node-crypto-function.service";
import { argon2 } from "@bitwarden/sdk-wasm";

export class CliCryptoFunctionService extends NodeCryptoFunctionService {
  async argon2(
    password: string | Uint8Array,
    salt: string | Uint8Array,
    iterations: number,
    memory: number,
    parallelism: number,
  ): Promise<Uint8Array> {
    const passwordArr = new Uint8Array(this.toUint8Buffer(password));
    const saltArr = new Uint8Array(this.toUint8Buffer(salt));
    const result = argon2(passwordArr, saltArr, iterations, memory / 1024, parallelism);

    return result;
  }
}
