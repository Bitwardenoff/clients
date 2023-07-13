import { concatMap, Observable, Subject } from "rxjs";

import { EnvironmentUrls } from "../../auth/models/domain/environment-urls";
import {
  EnvironmentService as EnvironmentServiceAbstraction,
  Region,
  Urls,
} from "../abstractions/environment.service";
import { StateService } from "../abstractions/state.service";

export class EnvironmentService implements EnvironmentServiceAbstraction {
  private readonly urlsSubject = new Subject<void>();
  urls: Observable<void> = this.urlsSubject.asObservable();
  selectedRegion?: Region;
  initialized = true;

  protected baseUrl: string;
  protected webVaultUrl: string;
  protected apiUrl: string;
  protected identityUrl: string;
  protected iconsUrl: string;
  protected notificationsUrl: string;
  protected eventsUrl: string;
  private keyConnectorUrl: string;
  private scimUrl: string = null;
  private cloudWebVaultUrl: string;

  readonly usUrls: Urls = {
    base: null,
    api: "https://api.bitwarden.com",
    identity: "https://identity.bitwarden.com",
    icons: "https://icons.bitwarden.net",
    webVault: "https://vault.bitwarden.com",
    notifications: "https://notifications.bitwarden.com",
    events: "https://events.bitwarden.com",
    scim: "https://scim.bitwarden.com/v2",
  };

  readonly euUrls: Urls = {
    base: null,
    api: "https://api.bitwarden.eu",
    identity: "https://identity.bitwarden.eu",
    icons: "https://icons.bitwarden.eu",
    webVault: "https://vault.bitwarden.eu",
    notifications: "https://notifications.bitwarden.eu",
    events: "https://events.bitwarden.eu",
    scim: "https://scim.bitwarden.eu/v2",
  };

  constructor(private stateService: StateService) {
    this.stateService.activeAccount$
      .pipe(
        concatMap(async () => {
          if (!this.initialized) {
            return;
          }
          await this.setUrlsFromStorage();
        })
      )
      .subscribe();
  }

  hasBaseUrl() {
    return this.baseUrl != null;
  }

  getNotificationsUrl() {
    if (this.notificationsUrl != null) {
      return this.notificationsUrl;
    }

    if (this.baseUrl != null) {
      return this.baseUrl + "/notifications";
    }

    return "https://notifications.bitwarden.com";
  }

  getWebVaultUrl() {
    if (this.webVaultUrl != null) {
      return this.webVaultUrl;
    }

    if (this.baseUrl) {
      return this.baseUrl;
    }
    return "https://vault.bitwarden.com";
  }

  getCloudWebVaultUrl() {
    if (this.cloudWebVaultUrl != null) {
      return this.cloudWebVaultUrl;
    }

    return this.usUrls.webVault;
  }

  setCloudWebVaultUrl(region: Region) {
    switch (region) {
      case Region.EU:
        this.cloudWebVaultUrl = this.euUrls.webVault;
        break;
      case Region.US:
      default:
        this.cloudWebVaultUrl = this.usUrls.webVault;
        break;
    }
  }

  getSendUrl() {
    return this.getWebVaultUrl() === "https://vault.bitwarden.com"
      ? "https://send.bitwarden.com/#"
      : this.getWebVaultUrl() + "/#/send/";
  }

  getIconsUrl() {
    if (this.iconsUrl != null) {
      return this.iconsUrl;
    }

    if (this.baseUrl) {
      return this.baseUrl + "/icons";
    }

    return "https://icons.bitwarden.net";
  }

  getApiUrl() {
    if (this.apiUrl != null) {
      return this.apiUrl;
    }

    if (this.baseUrl) {
      return this.baseUrl + "/api";
    }

    return "https://api.bitwarden.com";
  }

  getIdentityUrl() {
    if (this.identityUrl != null) {
      return this.identityUrl;
    }

    if (this.baseUrl) {
      return this.baseUrl + "/identity";
    }

    return "https://identity.bitwarden.com";
  }

  getEventsUrl() {
    if (this.eventsUrl != null) {
      return this.eventsUrl;
    }

    if (this.baseUrl) {
      return this.baseUrl + "/events";
    }

    return "https://events.bitwarden.com";
  }

  getKeyConnectorUrl() {
    return this.keyConnectorUrl;
  }

  getScimUrl() {
    if (this.scimUrl != null) {
      return this.scimUrl + "/v2";
    }

    return this.getWebVaultUrl() === "https://vault.bitwarden.com"
      ? "https://scim.bitwarden.com/v2"
      : this.getWebVaultUrl() + "/scim/v2";
  }

  async setUrlsFromStorage(): Promise<void> {
    const savedRegion = await this.stateService.getRegion();
    const savedUrls = await this.stateService.getEnvironmentUrls();

    // In release `2023.5.0`, we set the `base` property of the environment URLs to the US web vault URL when a user clicked the "US" region.
    // This check will detect these cases and convert them to the proper region instead.
    // We are detecting this by checking for the presence of the web vault URL in the `base` and the absence of the `notifications` property.
    // This is because the `notifications` will not be `null` in the web vault, and we don't want to migrate the URLs in that case.
    if (savedUrls.base === "https://vault.bitwarden.com" && savedUrls.notifications == null) {
      await this.setRegion(Region.US);
      return;
    }

    const region = Region[savedRegion as keyof typeof Region] ?? null;

    const urls: Urls = {
      base: savedUrls.base,
      api: savedUrls.api,
      identity: savedUrls.identity,
      webVault: savedUrls.webVault,
      icons: savedUrls.icons,
      notifications: savedUrls.notifications,
      events: savedUrls.events,
      keyConnector: savedUrls.keyConnector,
      // scimUrl is not stored
    };

    await this.setRegion(region, urls);
  }

  async setSelfHostedUrls(urls: Urls): Promise<Urls> {
    urls.base = this.formatUrl(urls.base);
    urls.webVault = this.formatUrl(urls.webVault);
    urls.api = this.formatUrl(urls.api);
    urls.identity = this.formatUrl(urls.identity);
    urls.icons = this.formatUrl(urls.icons);
    urls.notifications = this.formatUrl(urls.notifications);
    urls.events = this.formatUrl(urls.events);
    urls.keyConnector = this.formatUrl(urls.keyConnector);
    urls.scim = this.formatUrl(urls.scim) ?? this.scimUrl; // scimUrl cannot be cleared

    await this.setRegion(Region.SelfHosted, urls);

    return urls;
  }

  getUrls() {
    return {
      base: this.baseUrl,
      webVault: this.webVaultUrl,
      cloudWebVault: this.cloudWebVaultUrl,
      api: this.apiUrl,
      identity: this.identityUrl,
      icons: this.iconsUrl,
      notifications: this.notificationsUrl,
      events: this.eventsUrl,
      keyConnector: this.keyConnectorUrl,
      scim: this.scimUrl,
    };
  }

  /**
   * Sets the in state and in the EnvironmentService, using the provided URLs for Region.SelfHosted.
   * @param region The region to set.
   * @param selfHostedUrls The environment URLs to set for a self-hosted region.
   */
  async setRegion(region: Region, selfHostedUrls?: Urls): Promise<void> {
    region = region ?? Region.SelfHosted;

    this.selectedRegion = region;
    await this.stateService.setRegion(region);

    if (region === Region.SelfHosted) {
      await this.stateService.setEnvironmentUrls({
        base: selfHostedUrls.base,
        api: selfHostedUrls.api,
        identity: selfHostedUrls.identity,
        webVault: selfHostedUrls.webVault,
        icons: selfHostedUrls.icons,
        notifications: selfHostedUrls.notifications,
        events: selfHostedUrls.events,
        keyConnector: selfHostedUrls.keyConnector,
        // scimUrl is not saved to storage
      });
      this.setUrlsInternal(selfHostedUrls);
    } else {
      // If we are setting the region to EU or US, clear the self-hosted URLs
      await this.stateService.setEnvironmentUrls(new EnvironmentUrls());
      if (region === Region.EU) {
        this.setUrlsInternal(this.euUrls);
      } else if (region === Region.US) {
        this.setUrlsInternal(this.usUrls);
      }
    }
  }

  private setUrlsInternal(urls: Urls) {
    this.baseUrl = this.formatUrl(urls.base);
    this.webVaultUrl = this.formatUrl(urls.webVault);
    this.apiUrl = this.formatUrl(urls.api);
    this.identityUrl = this.formatUrl(urls.identity);
    this.iconsUrl = this.formatUrl(urls.icons);
    this.notificationsUrl = this.formatUrl(urls.notifications);
    this.eventsUrl = this.formatUrl(urls.events);
    this.keyConnectorUrl = this.formatUrl(urls.keyConnector);
    this.scimUrl = this.formatUrl(urls.scim) ?? this.scimUrl; // scimUrl cannot be cleared
    this.urlsSubject.next();
  }

  private formatUrl(url: string): string {
    if (url == null || url === "") {
      return null;
    }

    url = url.replace(/\/+$/g, "");
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    return url.trim();
  }

  isCloud(): boolean {
    return [
      "https://api.bitwarden.com",
      "https://vault.bitwarden.com/api",
      "https://api.bitwarden.eu",
      "https://vault.bitwarden.eu/api",
    ].includes(this.getApiUrl());
  }

  isSelfHosted(): boolean {
    return ![
      "http://vault.bitwarden.com",
      "https://vault.bitwarden.com",
      "http://vault.bitwarden.eu",
      "https://vault.bitwarden.eu",
      "http://vault.qa.bitwarden.pw",
      "https://vault.qa.bitwarden.pw",
    ].includes(this.getWebVaultUrl());
  }
}
