import { NgModule } from "@angular/core";

import { SharedModule } from "@bitwarden/web-vault/app/shared";

import { FilterComponent } from "../layout/filter.component";
import { HeaderComponent } from "../layout/header.component";
import { NewMenuComponent } from "../layout/new-menu.component";

@NgModule({
  imports: [SharedModule],
  exports: [HeaderComponent, FilterComponent, NewMenuComponent, SharedModule],
  declarations: [HeaderComponent, FilterComponent, NewMenuComponent],
  providers: [],
  bootstrap: [],
})
export class SecretsSharedModule {}
