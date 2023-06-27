import { NgModule } from "@angular/core";

import { LooseComponentsModule, SharedModule } from "../../shared";
import { UserVerificationModule } from "../../shared/components/user-verification";

import { AdjustSubscription } from "./adjust-subscription.component";
import { BillingSyncApiKeyComponent } from "./billing-sync-api-key.component";
import { ChangePlanComponent } from "./change-plan.component";
import { DownloadLicenseComponent } from "./download-license.component";
import { OrgBillingHistoryViewComponent } from "./organization-billing-history-view.component";
import { OrganizationBillingRoutingModule } from "./organization-billing-routing.module";
import { OrganizationBillingTabComponent } from "./organization-billing-tab.component";
import { OrganizationSubscriptionCloudComponent } from "./organization-subscription-cloud.component";
import { OrganizationSubscriptionSelfhostComponent } from "./organization-subscription-selfhost.component";
import { SecretsManagerAdjustSubscriptionComponent } from "./secrets-manager/sm-adjust-subscription.component";
import { SecretsManagerBillingModule } from "./secrets-manager/sm-billing.module";
import { SubscriptionHiddenComponent } from "./subscription-hidden.component";

@NgModule({
  imports: [
    SharedModule,
    LooseComponentsModule,
    OrganizationBillingRoutingModule,
    UserVerificationModule,
    SecretsManagerBillingModule,
  ],
  declarations: [
    AdjustSubscription,
    BillingSyncApiKeyComponent,
    ChangePlanComponent,
    DownloadLicenseComponent,
    OrganizationBillingTabComponent,
    OrgBillingHistoryViewComponent,
    OrganizationSubscriptionSelfhostComponent,
    OrganizationSubscriptionCloudComponent,
    SubscriptionHiddenComponent,
    SecretsManagerAdjustSubscriptionComponent,
  ],
})
export class OrganizationBillingModule {}
