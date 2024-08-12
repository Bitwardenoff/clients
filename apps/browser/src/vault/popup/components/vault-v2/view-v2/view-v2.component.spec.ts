import { Location } from "@angular/common";
import { ComponentFixture, fakeAsync, flush, TestBed } from "@angular/core/testing";
import { ActivatedRoute, Router } from "@angular/router";
import { mock } from "jest-mock-extended";
import { Subject } from "rxjs";

import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CipherType } from "@bitwarden/common/vault/enums";

import { ViewV2Component } from "./view-v2.component";

// 'qrcode-parser' is used by `BrowserTotpCaptureService` but is an es6 module that jest doesn't like
// mocking it here to prevent jest from throwing an error. I wasn't able to find a way to mock the
// `BrowserTotpCaptureService` where jest would not load the file in the first place.
jest.mock("qrcode-parser", () => {});

describe("ViewV2Component", () => {
  let component: ViewV2Component;
  let fixture: ComponentFixture<ViewV2Component>;
  const params$ = new Subject();
  const mockNavigate = jest.fn();

  const mockCipher = {
    id: "122-333-444",
    type: CipherType.Login,
  };

  const mockCipherService = {
    get: jest.fn().mockResolvedValue({ decrypt: jest.fn().mockResolvedValue(mockCipher) }),
    getKeyForCipherKeyDecryption: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    mockNavigate.mockClear();

    await TestBed.configureTestingModule({
      imports: [ViewV2Component],
      providers: [
        { provide: Router, useValue: { navigate: mockNavigate } },
        { provide: CipherService, useValue: mockCipherService },
        { provide: LogService, useValue: mock<LogService>() },
        { provide: PlatformUtilsService, useValue: mock<PlatformUtilsService>() },
        { provide: ConfigService, useValue: mock<ConfigService>() },
        { provide: ActivatedRoute, useValue: { queryParams: params$ } },
        {
          provide: I18nService,
          useValue: {
            t: (key: string, ...rest: string[]) => {
              if (rest?.length) {
                return `${key} ${rest.join(" ")}`;
              }
              return key;
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe("queryParams", () => {
    it("loads an existing cipher", fakeAsync(() => {
      params$.next({ cipherId: "122-333-444" });

      flush(); // Resolve all promises

      expect(mockCipherService.get).toHaveBeenCalledWith("122-333-444");
      expect(component.cipher).toEqual(mockCipher);
    }));

    it("sets isNewCipher to true when newCipher is true", fakeAsync(() => {
      params$.next({ cipherId: "122-333-444", newCipher: "true" });

      flush(); // Resolve all promises

      expect(component.isNewCipher).toBe(true);

      params$.next({ cipherId: "122-333-444" });

      flush(); // Resolve all promises

      expect(component.isNewCipher).toBe(false);
    }));

    it("sets the correct header text", fakeAsync(() => {
      // Set header text for a login
      mockCipher.type = CipherType.Login;
      params$.next({ cipherId: mockCipher.id });
      flush(); // Resolve all promises

      expect(component.headerText).toEqual("viewItemHeader typelogin");

      // Set header text for a card
      mockCipher.type = CipherType.Card;
      params$.next({ cipherId: mockCipher.id });
      flush(); // Resolve all promises

      expect(component.headerText).toEqual("viewItemHeader typecard");

      // Set header text for an identity
      mockCipher.type = CipherType.Identity;
      params$.next({ cipherId: mockCipher.id });
      flush(); // Resolve all promises

      expect(component.headerText).toEqual("viewItemHeader typeidentity");

      // Set header text for a secure note
      mockCipher.type = CipherType.SecureNote;
      params$.next({ cipherId: mockCipher.id });
      flush(); // Resolve all promises

      expect(component.headerText).toEqual("viewItemHeader note");
    }));
  });

  describe("handleBack", () => {
    it("navigates to /vault when isNewCipher is true", async () => {
      component.isNewCipher = true;

      await component.handleBack();

      expect(mockNavigate).toHaveBeenCalledWith(["/vault"]);
    });

    it("calls location.back when isNewCipher is false", async () => {
      component.isNewCipher = false;
      const location = TestBed.inject(Location);
      const backSpy = jest.spyOn(location, "back");

      await component.handleBack();

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(backSpy).toHaveBeenCalled();
    });
  });
});
