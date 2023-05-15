import { mock, mockReset } from "jest-mock-extended";

import { PlatformUtilsService } from "../../abstractions/platformUtils.service";
import { LogService } from "../abstractions/log.service";
import { StateService } from "../abstractions/state.service";
import { CryptoFunctionService } from "../platform/abstractions/crypto-function.service";
import { EncryptService } from "../platform/abstractions/encrypt.service";
import { CryptoService } from "../services/crypto.service";

describe("cryptoService", () => {
  let cryptoService: CryptoService;

  const cryptoFunctionService = mock<CryptoFunctionService>();
  const encryptService = mock<EncryptService>();
  const platformUtilService = mock<PlatformUtilsService>();
  const logService = mock<LogService>();
  const stateService = mock<StateService>();

  beforeEach(() => {
    mockReset(cryptoFunctionService);
    mockReset(encryptService);
    mockReset(platformUtilService);
    mockReset(logService);
    mockReset(stateService);

    cryptoService = new CryptoService(
      cryptoFunctionService,
      encryptService,
      platformUtilService,
      logService,
      stateService
    );
  });

  it("instantiates", () => {
    expect(cryptoService).not.toBeFalsy();
  });
});
