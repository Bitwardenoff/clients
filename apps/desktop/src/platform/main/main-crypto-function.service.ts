import * as argon2 from "argon2";
import { ipcMain } from "electron";

import { NodeCryptoFunctionService } from "@bitwarden/node/services/node-crypto-function.service";

export class MainCryptoFunctionService extends NodeCryptoFunctionService {
  init() {
    ipcMain.handle(
      "crypto.argon2",
      async (
        event,
        opts: {
          password: string | Uint8Array;
          salt: string | Uint8Array;
          iterations: number;
          memory: number;
          parallelism: number;
        },
      ) => {
        return await this.argon2(
          opts.password,
          opts.salt,
          opts.iterations,
          opts.memory,
          opts.parallelism,
        );
      },
    );
  }

  async argon2(
    password: string | Uint8Array,
    salt: string | Uint8Array,
    iterations: number,
    memory: number,
    parallelism: number,
  ): Promise<Uint8Array> {
    const nodePassword = this.toNodeValue(password);
    const nodeSalt = this.toNodeBuffer(this.toUint8Buffer(salt));

    const hash = await argon2.hash(nodePassword, {
      salt: nodeSalt,
      raw: true,
      hashLength: 32,
      timeCost: iterations,
      memoryCost: memory,
      parallelism: parallelism,
      type: argon2.argon2id,
    });
    return this.toUint8Buffer(hash);
  }
}
