import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, Router, convertToParamMap } from "@angular/router";
import { mock, MockProxy } from "jest-mock-extended";
import { firstValueFrom, of } from "rxjs";

import { I18nPipe } from "@bitwarden/angular/platform/pipes/i18n.pipe";
import { OrganizationService } from "@bitwarden/common/admin-console/abstractions/organization/organization.service.abstraction";
import { ProviderService } from "@bitwarden/common/admin-console/abstractions/provider.service";
import { Organization } from "@bitwarden/common/admin-console/models/domain/organization";
import { Provider } from "@bitwarden/common/admin-console/models/domain/provider";

import { ProductSwitcherService } from "./product-switcher.service";

describe("ProductSwitcherService", () => {
  let service: ProductSwitcherService;
  let router: MockProxy<Router>;
  let organizationService: MockProxy<OrganizationService>;
  let providerService: MockProxy<ProviderService>;
  let activeRouteParams = convertToParamMap({ organizationId: "1234" });

  const setRouterURL = (path: string) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    // `url` is a read-only property in practice but is mocked here for testing purposes
    router.url = path;
  };

  beforeEach(() => {
    router = mock<Router>();
    organizationService = mock<OrganizationService>();
    providerService = mock<ProviderService>();

    setRouterURL("/");

    organizationService.organizations$ = of([{}] as Organization[]);
    providerService.getAll.mockResolvedValue([] as Provider[]);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: OrganizationService, useValue: organizationService },
        { provide: ProviderService, useValue: providerService },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(activeRouteParams),
          },
        },
        {
          provide: I18nPipe,
          useValue: {
            transform: (key: string) => key,
          },
        },
      ],
    });
  });

  describe("product separation", () => {
    describe("Password Manager", () => {
      it("is always included", async () => {
        service = TestBed.inject(ProductSwitcherService);

        const products = await firstValueFrom(service.products$);

        expect(products.bento.find((p) => p.name === "Password Manager")).toBeDefined();
      });
    });

    describe("Secret Manager", () => {
      it("is included in other when there are no organizations with SM", async () => {
        service = TestBed.inject(ProductSwitcherService);

        const products = await firstValueFrom(service.products$);

        expect(products.other.find((p) => p.name === "Secrets Manager")).toBeDefined();
      });

      it("is included in bento when there is an organization with SM", async () => {
        organizationService.organizations$ = of([
          { id: "1234", canAccessSecretsManager: true, enabled: true },
        ] as Organization[]);

        service = TestBed.inject(ProductSwitcherService);

        const products = await firstValueFrom(service.products$);

        expect(products.bento.find((p) => p.name === "Secrets Manager")).toBeDefined();
      });
    });

    describe("Admin/Organizations", () => {
      it("includes Organizations in other when there are organizations", async () => {
        service = TestBed.inject(ProductSwitcherService);

        const products = await firstValueFrom(service.products$);

        expect(products.other.find((p) => p.name === "Organizations")).toBeDefined();
        expect(products.bento.find((p) => p.name === "Admin Console")).toBeUndefined();
      });

      it("includes Admin Console in bento when a user has access to it", async () => {
        organizationService.organizations$ = of([{ id: "1234", isOwner: true }] as Organization[]);

        service = TestBed.inject(ProductSwitcherService);

        const products = await firstValueFrom(service.products$);

        expect(products.bento.find((p) => p.name === "Admin Console")).toBeDefined();
        expect(products.other.find((p) => p.name === "Organizations")).toBeUndefined();
      });
    });

    describe("Provider Portal", () => {
      it("is not included when there are no providers", async () => {
        service = TestBed.inject(ProductSwitcherService);

        const products = await firstValueFrom(service.products$);

        expect(products.bento.find((p) => p.name === "Provider Portal")).toBeUndefined();
        expect(products.other.find((p) => p.name === "Provider Portal")).toBeUndefined();
      });

      it("is included when there are providers", async () => {
        providerService.getAll.mockResolvedValue([{ id: "67899" }] as Provider[]);

        service = TestBed.inject(ProductSwitcherService);

        const products = await firstValueFrom(service.products$);

        expect(products.bento.find((p) => p.name === "Provider Portal")).toBeDefined();
      });
    });
  });

  describe("active product", () => {
    it("marks Password Manager as active", async () => {
      service = TestBed.inject(ProductSwitcherService);

      const products = await firstValueFrom(service.products$);

      const { isActive } = products.bento.find((p) => p.name === "Password Manager");

      expect(isActive).toBe(true);
    });

    it("marks Secret Manager as active", async () => {
      setRouterURL("/sm/");

      service = TestBed.inject(ProductSwitcherService);

      const products = await firstValueFrom(service.products$);

      const { isActive } = products.other.find((p) => p.name === "Secrets Manager");

      expect(isActive).toBe(true);
    });

    it("marks Admin Console as active", async () => {
      organizationService.organizations$ = of([{ id: "1234", isOwner: true }] as Organization[]);
      activeRouteParams = convertToParamMap({ organizationId: "1" });
      setRouterURL("/organizations/");

      service = TestBed.inject(ProductSwitcherService);

      const products = await firstValueFrom(service.products$);

      const { isActive } = products.bento.find((p) => p.name === "Admin Console");

      expect(isActive).toBe(true);
    });

    it("marks Provider Portal as active", async () => {
      providerService.getAll.mockResolvedValue([{ id: "67899" }] as Provider[]);
      setRouterURL("/providers/");

      service = TestBed.inject(ProductSwitcherService);

      const products = await firstValueFrom(service.products$);

      const { isActive } = products.bento.find((p) => p.name === "Provider Portal");

      expect(isActive).toBe(true);
    });
  });
});
