import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { Region } from "@bitwarden/common/platform/abstractions/environment.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { EnvironmentService } from "@bitwarden/common/platform/services/environment.service";
import { StateProvider } from "@bitwarden/common/platform/state";

import { GroupPolicyEnvironment } from "../../admin-console/types/group-policy-environment";
import { devFlagEnabled, devFlagValue } from "../flags";

export class BrowserEnvironmentService extends EnvironmentService {
  constructor(
    private logService: LogService,
    stateProvider: StateProvider,
    accountService: AccountService,
  ) {
    super(stateProvider, accountService);
  }

  async hasManagedEnvironment(): Promise<boolean> {
    try {
      return (await this.getManagedEnvironment()) != null;
    } catch (e) {
      this.logService.error(e);
      return false;
    }
  }

  async settingsHaveChanged() {
    if (!(await this.hasManagedEnvironment())) {
      return false;
    }

    const env = await this.getManagedEnvironment();
    const urls = this.getUrls();

    return (
      env.base != urls.base ||
      env.webVault != urls.webVault ||
      env.api != urls.api ||
      env.identity != urls.identity ||
      env.icons != urls.icons ||
      env.notifications != urls.notifications ||
      env.events != urls.events
    );
  }

  getManagedEnvironment(): Promise<GroupPolicyEnvironment> {
    return devFlagEnabled("managedEnvironment")
      ? new Promise((resolve) => resolve(devFlagValue("managedEnvironment")))
      : new Promise((resolve, reject) => {
          if (chrome.storage.managed == null) {
            return resolve(null);
          }

          chrome.storage.managed.get("environment", (result) => {
            if (chrome.runtime.lastError) {
              return reject(chrome.runtime.lastError);
            }

            resolve(result.environment);
          });
        });
  }

  async setUrlsToManagedEnvironment() {
    const env = await this.getManagedEnvironment();
    await this.setEnvironment(Region.SelfHosted, {
      base: env.base,
      webVault: env.webVault,
      api: env.api,
      identity: env.identity,
      icons: env.icons,
      notifications: env.notifications,
      events: env.events,
    });
  }
}
