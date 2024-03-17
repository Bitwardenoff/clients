import * as path from "path";

import { app } from "electron";
import { firstValueFrom } from "rxjs";

import { TokenService as TokenServiceAbstraction } from "@bitwarden/common/auth/abstractions/token.service";
import { AccountServiceImplementation } from "@bitwarden/common/auth/services/account.service";
import { TokenService } from "@bitwarden/common/auth/services/token.service";
import { StateService } from "@bitwarden/common/platform/abstractions/state.service";
import { DefaultBiometricStateService } from "@bitwarden/common/platform/biometrics/biometric-state.service";
import { StateFactory } from "@bitwarden/common/platform/factories/state-factory";
import { GlobalState } from "@bitwarden/common/platform/models/domain/global-state";
import { EnvironmentService } from "@bitwarden/common/platform/services/environment.service";
import { MemoryStorageService } from "@bitwarden/common/platform/services/memory-storage.service";
import { MigrationBuilderService } from "@bitwarden/common/platform/services/migration-builder.service";
import { MigrationRunner } from "@bitwarden/common/platform/services/migration-runner";
import { NoopMessagingService } from "@bitwarden/common/platform/services/noop-messaging.service";
/* eslint-disable import/no-restricted-paths -- We need the implementation to inject, but generally this should not be accessed */
import { StorageServiceProvider } from "@bitwarden/common/platform/services/storage-service.provider";
import { DefaultActiveUserStateProvider } from "@bitwarden/common/platform/state/implementations/default-active-user-state.provider";
import { DefaultDerivedStateProvider } from "@bitwarden/common/platform/state/implementations/default-derived-state.provider";
import { DefaultGlobalStateProvider } from "@bitwarden/common/platform/state/implementations/default-global-state.provider";
import { DefaultSingleUserStateProvider } from "@bitwarden/common/platform/state/implementations/default-single-user-state.provider";
import { DefaultStateProvider } from "@bitwarden/common/platform/state/implementations/default-state.provider";
import { StateEventRegistrarService } from "@bitwarden/common/platform/state/state-event-registrar.service";
import { MemoryStorageService as MemoryStorageServiceForStateProviders } from "@bitwarden/common/platform/state/storage/memory-storage.service";
/* eslint-enable import/no-restricted-paths */

import { MenuMain } from "./main/menu/menu.main";
import { MessagingMain } from "./main/messaging.main";
import { NativeMessagingMain } from "./main/native-messaging.main";
import { PowerMonitorMain } from "./main/power-monitor.main";
import { TrayMain } from "./main/tray.main";
import { UpdaterMain } from "./main/updater.main";
import { WindowMain } from "./main/window.main";
import { Account } from "./models/account";
import { BiometricsService, BiometricsServiceAbstraction } from "./platform/main/biometric/index";
import { ClipboardMain } from "./platform/main/clipboard.main";
import { DesktopCredentialStorageListener } from "./platform/main/desktop-credential-storage-listener";
import { MainCryptoFunctionService } from "./platform/main/main-crypto-function.service";
import { DesktopSettingsService } from "./platform/services/desktop-settings.service";
import { ElectronLogMainService } from "./platform/services/electron-log.main.service";
import { ELECTRON_SUPPORTS_SECURE_STORAGE } from "./platform/services/electron-platform-utils.service";
import { ElectronStateService } from "./platform/services/electron-state.service";
import { ElectronStorageService } from "./platform/services/electron-storage.service";
import { I18nMainService } from "./platform/services/i18n.main.service";
import { ElectronMainMessagingService } from "./services/electron-main-messaging.service";

export class Main {
  logService: ElectronLogMainService;
  i18nService: I18nMainService;
  storageService: ElectronStorageService;
  memoryStorageService: MemoryStorageService;
  memoryStorageForStateProviders: MemoryStorageServiceForStateProviders;
  messagingService: ElectronMainMessagingService;
  stateService: StateService;
  environmentService: EnvironmentService;
  mainCryptoFunctionService: MainCryptoFunctionService;
  desktopCredentialStorageListener: DesktopCredentialStorageListener;
  desktopSettingsService: DesktopSettingsService;
  migrationRunner: MigrationRunner;
  tokenService: TokenServiceAbstraction;

  windowMain: WindowMain;
  messagingMain: MessagingMain;
  updaterMain: UpdaterMain;
  menuMain: MenuMain;
  powerMonitorMain: PowerMonitorMain;
  trayMain: TrayMain;
  biometricsService: BiometricsServiceAbstraction;
  nativeMessagingMain: NativeMessagingMain;
  clipboardMain: ClipboardMain;

  constructor() {
    // Set paths for portable builds
    let appDataPath = null;
    if (process.env.BITWARDEN_APPDATA_DIR != null) {
      appDataPath = process.env.BITWARDEN_APPDATA_DIR;
    } else if (process.platform === "win32" && process.env.PORTABLE_EXECUTABLE_DIR != null) {
      appDataPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR, "bitwarden-appdata");
    } else if (process.platform === "linux" && process.env.SNAP_USER_DATA != null) {
      appDataPath = path.join(process.env.SNAP_USER_DATA, "appdata");
    }

    app.on("ready", () => {
      // on ready stuff...
    });

    if (appDataPath != null) {
      app.setPath("userData", appDataPath);
    }
    app.setPath("logs", path.join(app.getPath("userData"), "logs"));

    const args = process.argv.slice(1);
    const watch = args.some((val) => val === "--watch");

    if (watch) {
      const execName = process.platform === "win32" ? "electron.cmd" : "electron";
      // eslint-disable-next-line
      require("electron-reload")(__dirname, {
        electron: path.join(__dirname, "../../../", "node_modules", ".bin", execName),
        electronArgv: ["--inspect=5858", "--watch"],
      });
    }

    this.logService = new ElectronLogMainService(null, app.getPath("userData"));

    const storageDefaults: any = {};
    // Default vault timeout to "on restart", and action to "lock"
    storageDefaults["global.vaultTimeout"] = -1;
    storageDefaults["global.vaultTimeoutAction"] = "lock";
    this.storageService = new ElectronStorageService(app.getPath("userData"), storageDefaults);
    this.memoryStorageService = new MemoryStorageService();
    // TODO: Will any calls to active work here? This needs to be synced up more than likely
    this.memoryStorageForStateProviders = new MemoryStorageServiceForStateProviders();
    const storageServiceProvider = new StorageServiceProvider(
      this.storageService,
      this.memoryStorageForStateProviders,
    );
    const globalStateProvider = new DefaultGlobalStateProvider(storageServiceProvider);

    this.i18nService = new I18nMainService("en", "./locales/", globalStateProvider);

    const accountService = new AccountServiceImplementation(
      new NoopMessagingService(),
      this.logService,
      globalStateProvider,
    );

    const stateEventRegistrarService = new StateEventRegistrarService(
      globalStateProvider,
      storageServiceProvider,
    );

    const singleUserStateProvider = new DefaultSingleUserStateProvider(
      storageServiceProvider,
      stateEventRegistrarService,
    );

    const activeUserStateProvider = new DefaultActiveUserStateProvider(
      accountService,
      singleUserStateProvider,
    );

    const stateProvider = new DefaultStateProvider(
      activeUserStateProvider,
      singleUserStateProvider,
      globalStateProvider,
      new DefaultDerivedStateProvider(this.memoryStorageForStateProviders),
    );

    this.environmentService = new EnvironmentService(stateProvider, accountService);

    this.tokenService = new TokenService(
      singleUserStateProvider,
      globalStateProvider,
      ELECTRON_SUPPORTS_SECURE_STORAGE,
      this.storageService,
    );

    this.migrationRunner = new MigrationRunner(
      this.storageService,
      this.logService,
      new MigrationBuilderService(),
    );

    // TODO: this state service will have access to on disk storage, but not in memory storage.
    // If we could get this to work using the stateService singleton that the rest of the app uses we could save
    // ourselves from some hacks, like having to manually update the app menu vs. the menu subscribing to events.
    this.stateService = new ElectronStateService(
      this.storageService,
      null,
      this.memoryStorageService,
      this.logService,
      new StateFactory(GlobalState, Account),
      accountService, // will not broadcast logouts. This is a hack until we can remove messaging dependency
      this.environmentService,
      this.tokenService,
      this.migrationRunner,
      false, // Do not use disk caching because this will get out of sync with the renderer service
    );

    this.desktopSettingsService = new DesktopSettingsService(stateProvider);

    const biometricStateService = new DefaultBiometricStateService(stateProvider);

    this.windowMain = new WindowMain(
      this.stateService,
      biometricStateService,
      this.logService,
      this.storageService,
      this.desktopSettingsService,
      (arg) => this.processDeepLink(arg),
      (win) => this.trayMain.setupWindowListeners(win),
    );
    this.messagingMain = new MessagingMain(this, this.desktopSettingsService);
    this.updaterMain = new UpdaterMain(this.i18nService, this.windowMain);
    this.trayMain = new TrayMain(this.windowMain, this.i18nService, this.desktopSettingsService);

    this.messagingService = new ElectronMainMessagingService(this.windowMain, (message) => {
      this.messagingMain.onMessage(message);
    });

    this.powerMonitorMain = new PowerMonitorMain(this.messagingService);
    this.menuMain = new MenuMain(
      this.i18nService,
      this.messagingService,
      this.environmentService,
      this.windowMain,
      this.updaterMain,
    );

    this.biometricsService = new BiometricsService(
      this.i18nService,
      this.windowMain,
      this.logService,
      this.messagingService,
      process.platform,
      biometricStateService,
    );

    this.desktopCredentialStorageListener = new DesktopCredentialStorageListener(
      "Bitwarden",
      this.biometricsService,
      this.logService,
    );

    this.nativeMessagingMain = new NativeMessagingMain(
      this.logService,
      this.windowMain,
      app.getPath("userData"),
      app.getPath("exe"),
    );

    this.clipboardMain = new ClipboardMain();
    this.clipboardMain.init();

    this.mainCryptoFunctionService = new MainCryptoFunctionService();
    this.mainCryptoFunctionService.init();
  }

  bootstrap() {
    this.desktopCredentialStorageListener.init();
    // Run migrations first, then other things
    this.migrationRunner.run().then(
      async () => {
        await this.windowMain.init();
        await this.i18nService.init();
        this.messagingMain.init();
        // FIXME: Verify that this floating promise is intentional. If it is, add an explanatory comment and ensure there is proper error handling.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.menuMain.init();
        await this.trayMain.init("Bitwarden", [
          {
            label: this.i18nService.t("lockVault"),
            enabled: false,
            id: "lockVault",
            click: () => this.messagingService.send("lockVault"),
          },
        ]);
        if (await firstValueFrom(this.desktopSettingsService.startToTray$)) {
          // FIXME: Verify that this floating promise is intentional. If it is, add an explanatory comment and ensure there is proper error handling.
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.trayMain.hideToTray();
        }
        this.powerMonitorMain.init();
        await this.updaterMain.init();

        // TODO: Migrate these settings
        if (
          (await this.stateService.getEnableBrowserIntegration()) ||
          (await this.stateService.getEnableDuckDuckGoBrowserIntegration())
        ) {
          // FIXME: Verify that this floating promise is intentional. If it is, add an explanatory comment and ensure there is proper error handling.
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.nativeMessagingMain.listen();
        }

        app.removeAsDefaultProtocolClient("bitwarden");
        if (process.env.NODE_ENV === "development" && process.platform === "win32") {
          // Fix development build on Windows requirering a different protocol client
          app.setAsDefaultProtocolClient("bitwarden", process.execPath, [
            process.argv[1],
            path.resolve(process.argv[2]),
          ]);
        } else {
          app.setAsDefaultProtocolClient("bitwarden");
        }

        // Process protocol for macOS
        app.on("open-url", (event, url) => {
          event.preventDefault();
          this.processDeepLink([url]);
        });

        // Handle window visibility events
        this.windowMain.win.on("hide", () => {
          this.messagingService.send("windowHidden");
        });
        this.windowMain.win.on("minimize", () => {
          this.messagingService.send("windowHidden");
        });
      },
      (e: any) => {
        // eslint-disable-next-line
        console.error(e);
      },
    );
  }

  private processDeepLink(argv: string[]): void {
    argv
      .filter((s) => s.indexOf("bitwarden://") === 0)
      .forEach((s) => {
        this.messagingService.send("deepLink", { urlString: s });
      });
  }
}
