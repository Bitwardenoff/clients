import { importProvidersFrom, Component } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { Meta, StoryObj, applicationConfig, moduleMetadata } from "@storybook/angular";
import { of } from "rxjs";

import { ClientType } from "@bitwarden/common/enums";
import {
  EnvironmentService,
  Environment,
} from "@bitwarden/common/platform/abstractions/environment.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { ThemeType } from "@bitwarden/common/platform/enums";
import { ThemeStateService } from "@bitwarden/common/platform/theming/theme-state.service";
import { ButtonModule } from "@bitwarden/components";

import { PreloadedEnglishI18nModule } from "../../../../../apps/web/src/app/core/tests";
import { LockIcon } from "../icons";
import { RegistrationCheckEmailIcon } from "../icons/registration-check-email.icon";

import { AnonLayoutWrapperDataService } from "./anon-layout-wrapper-data.service";
import { AnonLayoutWrapperComponent, AnonLayoutWrapperData } from "./anon-layout-wrapper.component";
import { DefaultAnonLayoutWrapperDataService } from "./default-anon-layout-wrapper-data.service";

export default {
  title: "Auth/Anon Layout Wrapper",
  component: AnonLayoutWrapperComponent,
} as Meta;

const decorators = (options: {
  components: any[];
  routes: Routes;
  applicationVersion?: string;
  clientType?: ClientType;
  hostName?: string;
  themeType?: ThemeType;
}) => {
  return [
    moduleMetadata({
      declarations: options.components,
      imports: [RouterModule, ButtonModule],
      providers: [
        {
          provide: AnonLayoutWrapperDataService,
          useClass: DefaultAnonLayoutWrapperDataService,
        },
        {
          provide: EnvironmentService,
          useValue: {
            environment$: of({
              getHostname: () => options.hostName || "storybook.bitwarden.com",
            } as Partial<Environment>),
          } as Partial<EnvironmentService>,
        },
        {
          provide: PlatformUtilsService,
          useValue: {
            getApplicationVersion: () =>
              Promise.resolve(options.applicationVersion || "FAKE_APP_VERSION"),
            getClientType: () => options.clientType || ClientType.Web,
          } as Partial<PlatformUtilsService>,
        },
        {
          provide: ThemeStateService,
          useValue: {
            selectedTheme$: of(options.themeType || ThemeType.Light),
          } as Partial<ThemeStateService>,
        },
      ],
    }),
    applicationConfig({
      providers: [
        importProvidersFrom(RouterModule.forRoot(options.routes)),
        importProvidersFrom(PreloadedEnglishI18nModule),
      ],
    }),
  ];
};

type Story = StoryObj<AnonLayoutWrapperComponent>;

// Default Example

@Component({
  selector: "bit-default-primary-outlet-example-component",
  template: "<p>Primary Outlet Example: <br> your primary component goes here</p>",
})
export class DefaultPrimaryOutletExampleComponent {}

@Component({
  selector: "bit-default-secondary-outlet-example-component",
  template: "<p>Secondary Outlet Example: <br> your secondary component goes here</p>",
})
export class DefaultSecondaryOutletExampleComponent {}

@Component({
  selector: "bit-default-env-selector-outlet-example-component",
  template: "<p>Env Selector Outlet Example: <br> your env selector component goes here</p>",
})
export class DefaultEnvSelectorOutletExampleComponent {}

export const DefaultContentExample: Story = {
  render: (args) => ({
    props: args,
    template: "<router-outlet></router-outlet>",
  }),
  decorators: decorators({
    components: [
      DefaultPrimaryOutletExampleComponent,
      DefaultSecondaryOutletExampleComponent,
      DefaultEnvSelectorOutletExampleComponent,
    ],
    routes: [
      {
        path: "**",
        redirectTo: "default-example",
        pathMatch: "full",
      },
      {
        path: "",
        component: AnonLayoutWrapperComponent,
        children: [
          {
            path: "default-example",
            data: {},
            children: [
              {
                path: "",
                component: DefaultPrimaryOutletExampleComponent,
              },
              {
                path: "",
                component: DefaultSecondaryOutletExampleComponent,
                outlet: "secondary",
              },
              {
                path: "",
                component: DefaultEnvSelectorOutletExampleComponent,
                outlet: "environment-selector",
              },
            ],
          },
        ],
      },
    ],
  }),
};

// Dynamic Content Example
const initialData: AnonLayoutWrapperData = {
  pageTitle: "setAStrongPassword",
  pageSubtitle: "finishCreatingYourAccountBySettingAPassword",
  pageIcon: LockIcon,
};

const changedData: AnonLayoutWrapperData = {
  pageTitle: "enterpriseSingleSignOn",
  pageSubtitle: "checkYourEmail",
  pageIcon: RegistrationCheckEmailIcon,
};

@Component({
  selector: "bit-dynamic-content-example-component",
  template: `
    <button type="button" bitButton buttonType="primary" (click)="toggleData()">Toggle Data</button>
  `,
})
export class DynamicContentExampleComponent {
  initialData = true;

  constructor(private anonLayoutWrapperDataService: AnonLayoutWrapperDataService) {}

  toggleData() {
    if (this.initialData) {
      this.anonLayoutWrapperDataService.setAnonLayoutWrapperData(changedData);
    } else {
      this.anonLayoutWrapperDataService.setAnonLayoutWrapperData(initialData);
    }

    this.initialData = !this.initialData;
  }
}

export const DynamicContentExample: Story = {
  render: (args) => ({
    props: args,
    template: "<router-outlet></router-outlet>",
  }),
  decorators: decorators({
    components: [DynamicContentExampleComponent],
    routes: [
      {
        path: "**",
        redirectTo: "dynamic-content-example",
        pathMatch: "full",
      },
      {
        path: "",
        component: AnonLayoutWrapperComponent,
        children: [
          {
            path: "dynamic-content-example",
            data: initialData,
            children: [
              {
                path: "",
                component: DynamicContentExampleComponent,
              },
            ],
          },
        ],
      },
    ],
  }),
};
