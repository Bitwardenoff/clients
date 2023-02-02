import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { SMExportComponent } from "./porting/sm-export.component";
import { SMImportComponent } from "./porting/sm-import.component";

const routes: Routes = [
  {
    path: "import",
    component: SMImportComponent,
    data: {
      titleId: "importData",
    },
  },
  {
    path: "export",
    component: SMExportComponent,
    data: {
      titleId: "exportData",
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
