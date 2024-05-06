import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { mock, MockProxy } from "jest-mock-extended";
import { BehaviorSubject } from "rxjs";

import { I18nPipe } from "@bitwarden/angular/platform/pipes/i18n.pipe";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { BitIconButtonComponent } from "@bitwarden/components/src/icon-button/icon-button.component";
import { NavItemComponent } from "@bitwarden/components/src/navigation/nav-item.component";

import { ProductSwitcherItem, ProductSwitcherService } from "../shared/product-switcher.service";

import { NavigationProductSwitcherComponent } from "./navigation-switcher.component";

describe("NavigationProductSwitcherComponent", () => {
  let fixture: ComponentFixture<NavigationProductSwitcherComponent>;
  let productSwitcherService: MockProxy<ProductSwitcherService>;

  const mockProducts$ = new BehaviorSubject<{
    bento: ProductSwitcherItem[];
    other: ProductSwitcherItem[];
  }>({
    bento: [],
    other: [],
  });

  beforeEach(async () => {
    productSwitcherService = mock<ProductSwitcherService>();
    productSwitcherService.products$ = mockProducts$;
    mockProducts$.next({ bento: [], other: [] });

    await TestBed.configureTestingModule({
      imports: [RouterModule],
      declarations: [
        NavigationProductSwitcherComponent,
        NavItemComponent,
        BitIconButtonComponent,
        I18nPipe,
      ],
      providers: [
        { provide: ProductSwitcherService, useValue: productSwitcherService },
        {
          provide: I18nService,
          useValue: mock<I18nService>(),
        },
        {
          provide: ActivatedRoute,
          useValue: mock<ActivatedRoute>(),
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NavigationProductSwitcherComponent);
    fixture.detectChanges();
  });

  describe("other products", () => {
    it("links to `marketingRoute`", () => {
      mockProducts$.next({
        bento: [],
        other: [
          {
            isActive: false,
            name: "Other Product",
            icon: "bwi-lock",
            marketingRoute: "https://www.example.com/",
          },
        ],
      });

      fixture.detectChanges();

      const link = fixture.nativeElement.querySelector("a");

      expect(link.getAttribute("href")).toBe("https://www.example.com/");
    });

    it("uses `otherProductOverrides` when available", () => {
      mockProducts$.next({
        bento: [],
        other: [
          {
            isActive: false,
            name: "Other Product",
            icon: "bwi-lock",
            marketingRoute: "https://www.example.com/",
            otherProductOverrides: { name: "Alternate name" },
          },
        ],
      });

      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector("a").textContent.trim()).toBe("Alternate name");

      mockProducts$.next({
        bento: [],
        other: [
          {
            isActive: false,
            name: "Other Product",
            icon: "bwi-lock",
            marketingRoute: "https://www.example.com/",
            otherProductOverrides: { name: "Alternate name", supportingText: "Supporting Text" },
          },
        ],
      });

      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector("a").textContent.trim().replace(/\s+/g, " ")).toBe(
        "Alternate name Supporting Text",
      );
    });

    it("shows Organizations first in the other products list", () => {
      mockProducts$.next({
        bento: [],
        other: [
          { name: "AA Product", icon: "bwi-lock", marketingRoute: "https://www.example.com/" },
          { name: "Test Product", icon: "bwi-lock", marketingRoute: "https://www.example.com/" },
          { name: "Organizations", icon: "bwi-lock", marketingRoute: "https://www.example.com/" },
        ],
      });

      fixture.detectChanges();

      const links = fixture.nativeElement.querySelectorAll("a");

      expect(links.length).toBe(3);

      expect(links[0].textContent).toContain("Organizations");
      expect(links[1].textContent).toContain("AA Product");
      expect(links[2].textContent).toContain("Test Product");
    });
  });

  describe("available products", () => {
    it("shows all products", () => {
      mockProducts$.next({
        bento: [
          { isActive: true, name: "Password Manager", icon: "bwi-lock", appRoute: "/vault" },
          { isActive: false, name: "Secret Manager", icon: "bwi-lock", appRoute: "/sm" },
        ],
        other: [],
      });

      fixture.detectChanges();

      const links = fixture.nativeElement.querySelectorAll("a");

      expect(links.length).toBe(2);

      expect(links[0].textContent).toContain("Password Manager");
      expect(links[1].textContent).toContain("Secret Manager");
    });
  });

  it("links to `appRoute`", () => {
    mockProducts$.next({
      bento: [{ isActive: false, name: "Password Manager", icon: "bwi-lock", appRoute: "/vault" }],
      other: [],
    });

    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector("a");

    expect(link.getAttribute("href")).toBe("/vault");
  });
});
