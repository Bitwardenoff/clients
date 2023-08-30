import { MockProxy, mock } from "jest-mock-extended";
import { Subject, skip, take } from "rxjs";

import { AuthService } from "../../../auth/abstractions/auth.service";
import { AuthenticationStatus } from "../../../auth/enums/authentication-status";
import { ConfigApiServiceAbstraction } from "../../abstractions/config/config-api.service.abstraction";
import { ServerConfig } from "../../abstractions/config/server-config";
import { EnvironmentService } from "../../abstractions/environment.service";
import { StateService } from "../../abstractions/state.service";
import { ServerConfigData } from "../../models/data/server-config.data";
import {
  EnvironmentServerConfigResponse,
  ServerConfigResponse,
  ThirdPartyServerConfigResponse,
} from "../../models/response/server-config.response";

import { ConfigService } from "./config.service";

describe("ConfigService", () => {
  let stateService: MockProxy<StateService>;
  let configApiService: MockProxy<ConfigApiServiceAbstraction>;
  let authService: MockProxy<AuthService>;
  let environmentService: MockProxy<EnvironmentService>;

  let serverResponseCount: number; // increments to track distinct responses received from server

  // Observables will start emitting as soon as this is created, so only create it
  // after everything is mocked
  const configServiceFactory = () => {
    const configService = new ConfigService(
      stateService,
      configApiService,
      authService,
      environmentService
    );
    configService.init();
    return configService;
  };

  beforeEach(() => {
    stateService = mock();
    configApiService = mock();
    authService = mock();
    environmentService = mock();
    environmentService.urls = new Subject();

    serverResponseCount = 1;
    configApiService.get.mockImplementation(() =>
      Promise.resolve(serverConfigResponseFactory("server" + serverResponseCount++))
    );

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("Loads config from storage", (done) => {
    const storedConfigData = serverConfigDataFactory("storedConfig");
    stateService.getServerConfig.mockResolvedValueOnce(storedConfigData);

    const configService = configServiceFactory();

    configService.serverConfig$.pipe(take(1)).subscribe((config) => {
      expect(config).toEqual(new ServerConfig(storedConfigData));
      expect(stateService.getServerConfig).toHaveBeenCalledTimes(1);
      expect(stateService.setServerConfig).not.toHaveBeenCalled();
      done();
    });
  });

  describe("Fetches config from server", () => {
    beforeEach(() => {
      stateService.getServerConfig.mockResolvedValueOnce(null);
    });

    it("when the service is created", (done) => {
      const configService = configServiceFactory();

      // skip initial load from storage
      configService.serverConfig$.pipe(skip(1), take(1)).subscribe((config) => {
        try {
          expect(config.gitHash).toEqual("server1");
          done();
        } catch (e) {
          done(e);
        }
      });

      jest.advanceTimersByTime(1);
    });

    it.each<number | jest.DoneCallback>([1, 2, 3])(
      "after %p hour/s",
      (hours: number, done: jest.DoneCallback) => {
        const configService = configServiceFactory();

        // skip initial load from storage, plus first fetch, plus previous hours (if any)
        configService.serverConfig$.pipe(skip(hours + 1), take(1)).subscribe((config) => {
          try {
            expect(config.gitHash).toEqual("server" + (hours + 1));
            expect(configApiService.get).toHaveBeenCalledTimes(hours + 1);
            done();
          } catch (e) {
            done(e);
          }
        });

        const oneHourInMs = 1000 * 3600;
        jest.advanceTimersByTime(oneHourInMs * hours + 10);
      }
    );

    it("when environment URLs change", (done) => {
      const configService = configServiceFactory();

      // skip initial load from storage
      configService.serverConfig$.pipe(skip(1), take(1)).subscribe((config) => {
        try {
          expect(config.gitHash).toEqual("server1");
          done();
        } catch (e) {
          done(e);
        }
      });

      (environmentService.urls as Subject<void>).next();
    });

    it("when triggerServerConfigFetch() is called", (done) => {
      const configService = configServiceFactory();

      // skip initial load from storage
      configService.serverConfig$.pipe(skip(1), take(1)).subscribe((config) => {
        try {
          expect(config.gitHash).toEqual("server1");
          done();
        } catch (e) {
          done(e);
        }
      });

      configService.triggerServerConfigFetch();
    });
  });

  it("Saves server config to storage when the user is logged in", (done) => {
    stateService.getServerConfig.mockResolvedValueOnce(null);
    authService.getAuthStatus.mockResolvedValue(AuthenticationStatus.Locked);
    const configService = configServiceFactory();

    // skip initial load from storage
    configService.serverConfig$.pipe(skip(1), take(1)).subscribe(() => {
      try {
        expect(stateService.setServerConfig).toHaveBeenCalledWith(
          expect.objectContaining({ gitHash: "server1" })
        );
        done();
      } catch (e) {
        done(e);
      }
    });

    jest.advanceTimersByTime(1);
  });
});

function serverConfigDataFactory(gitHash: string) {
  return new ServerConfigData(serverConfigResponseFactory(gitHash));
}

function serverConfigResponseFactory(gitHash: string) {
  return new ServerConfigResponse({
    version: "myConfigVersion",
    gitHash: gitHash,
    server: new ThirdPartyServerConfigResponse({
      name: "myThirdPartyServer",
      url: "www.example.com",
    }),
    environment: new EnvironmentServerConfigResponse({
      vault: "vault.example.com",
    }),
    featureStates: {
      feat1: "off",
      feat2: "on",
      feat3: "off",
    },
  });
}
