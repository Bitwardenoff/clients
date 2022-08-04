import { NgModule } from "@angular/core";

import { ReportsSharedModule } from "../../../reports";
import { LooseComponentsModule } from "../../loose-components.module";
import { SharedModule } from "../../shared.module";

import { OrganizationReportingRoutingModule } from "./organization-reporting-routing.module";
import { ReportListComponent } from "./report-list.component";
import { ReportingComponent } from "./reporting.component";

@NgModule({
  imports: [
    SharedModule,
    LooseComponentsModule,
    ReportsSharedModule,
    OrganizationReportingRoutingModule,
  ],
  declarations: [ReportListComponent, ReportingComponent],
})
export class OrganizationReportingModule {}
