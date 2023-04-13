import { DeviceType } from "@bitwarden/common/enums";

import BrowserPlatformUtilsService from "./browserPlatformUtils.service";

describe("Browser Utils Service", () => {
  describe("getBrowser", () => {
    const originalUserAgent = navigator.userAgent;

    // Reset the userAgent.
    afterAll(() => {
      Object.defineProperty(navigator, "userAgent", {
        value: originalUserAgent,
      });
    });

    let browserPlatformUtilsService: BrowserPlatformUtilsService;
    beforeEach(() => {
      (window as any).matchMedia = jest.fn().mockReturnValueOnce({});
      browserPlatformUtilsService = new BrowserPlatformUtilsService(null, null, null, window);
    });

    afterEach(() => {
      window.matchMedia = undefined;
      (window as any).chrome = undefined;
    });

    it("should detect chrome", () => {
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        value:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36",
      });

      (window as any).chrome = {};

      expect(browserPlatformUtilsService.getDevice()).toBe(DeviceType.ChromeExtension);
    });

    it("should detect firefox", () => {
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:58.0) Gecko/20100101 Firefox/58.0",
      });

      expect(browserPlatformUtilsService.getDevice()).toBe(DeviceType.FirefoxExtension);
    });

    it("should detect opera", () => {
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        value:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3175.3 Safari/537.36 OPR/49.0.2695.0 (Edition developer)",
      });

      expect(browserPlatformUtilsService.getDevice()).toBe(DeviceType.OperaExtension);
    });

    it("should detect edge", () => {
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        value:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.74 Safari/537.36 Edg/79.0.309.43",
      });

      expect(browserPlatformUtilsService.getDevice()).toBe(DeviceType.EdgeExtension);
    });

    it("should detect safari", () => {
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        value:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/602.4.8 (KHTML, like Gecko) Version/10.0.3 Safari/602.4.8",
      });

      expect(browserPlatformUtilsService.getDevice()).toBe(DeviceType.SafariExtension);
    });

    it("should detect vivaldi", () => {
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        value:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.97 Safari/537.36 Vivaldi/1.94.1008.40",
      });

      expect(browserPlatformUtilsService.getDevice()).toBe(DeviceType.VivaldiExtension);
    });
  });
});

describe("Safari Height Fix", () => {
  const originalUserAgent = navigator.userAgent;

  // Reset the userAgent.
  afterAll(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
    });
  });

  it("should apply fix for safari 15.6", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Safari/605.1.15",
    });
    expect(BrowserPlatformUtilsService.shouldApplySafariHeightFix(window)).toBe(true);
  });

  it("should apply fix for safari 16.1", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
    });
    expect(BrowserPlatformUtilsService.shouldApplySafariHeightFix(window)).toBe(true);
  });

  it("should not apply fix for safari 16.1", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15",
    });
    expect(BrowserPlatformUtilsService.shouldApplySafariHeightFix(window)).toBe(false);
  });

  it("should not apply fix for safari 16.4", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15",
    });
    expect(BrowserPlatformUtilsService.shouldApplySafariHeightFix(window)).toBe(false);
  });

  it("should not apply fix for safari 17.0 (future releases)", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    });
    expect(BrowserPlatformUtilsService.shouldApplySafariHeightFix(window)).toBe(false);
  });

  it("should not apply fix for chrome", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36",
    });
    expect(BrowserPlatformUtilsService.shouldApplySafariHeightFix(window)).toBe(false);
  });

  it("should not apply fix for firefox", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:58.0) Gecko/20100101 Firefox/58.0",
    });
    expect(BrowserPlatformUtilsService.shouldApplySafariHeightFix(window)).toBe(false);
  });

  it("should not apply fix for opera", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3175.3 Safari/537.36 OPR/49.0.2695.0 (Edition developer)",
    });
    expect(BrowserPlatformUtilsService.shouldApplySafariHeightFix(window)).toBe(false);
  });

  it("should not apply fix for edge", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.74 Safari/537.36 Edg/79.0.309.43",
    });
    expect(BrowserPlatformUtilsService.shouldApplySafariHeightFix(window)).toBe(false);
  });
});
