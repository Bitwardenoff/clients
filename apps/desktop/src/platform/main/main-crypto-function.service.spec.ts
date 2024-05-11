import { Utils } from "@bitwarden/common/platform/misc/utils";

import { MainCryptoFunctionService } from "./main-crypto-function.service";

describe("Main Crypto Function Service", () => {
  describe("argon2", () => {
    const regularKey = "bQuK9aSlX+NnvIxJNmtWINhqZ/t3SVksTNffphRw3Hs=";
    const utf8Key = "osyqJYGkJkcAPMWSEDJnMKy4eOFsHh0IFR8Ca1z+Fck=";
    const unicodeKey = "wZcA1oXJ3vKf2ui+04uvyy2LkJmiAf75MTfmtpuBJUc=";

    testArgon2(regularKey, utf8Key, unicodeKey);
  });
});

function testArgon2(regularKey: string, utf8Key: string, unicodeKey: string) {
  const regularUser = "user@example.com";
  const utf8User = "üser@example.com";
  const unicodeUser = "😀user🙏@example.com";

  const regularPassword = "password";
  const utf8Password = "pǻssword";
  const unicodePassword = "😀password🙏";

  it("should create valid key from regular input", async () => {
    const cryptoFunctionService = new MainCryptoFunctionService();
    const key = await cryptoFunctionService.argon2(regularPassword, regularUser, 5, 4 * 1024, 3);
    expect(Utils.fromBufferToB64(key)).toBe(regularKey);
  });

  it("should create valid key from utf8 input", async () => {
    const cryptoFunctionService = new MainCryptoFunctionService();
    const key = await cryptoFunctionService.argon2(utf8Password, utf8User, 5, 4 * 1024, 3);
    expect(Utils.fromBufferToB64(key)).toBe(utf8Key);
  });

  it("should create valid key from unicode input", async () => {
    const cryptoFunctionService = new MainCryptoFunctionService();
    const key = await cryptoFunctionService.argon2(unicodePassword, unicodeUser, 5, 4 * 1024, 3);
    expect(Utils.fromBufferToB64(key)).toBe(unicodeKey);
  });
}
