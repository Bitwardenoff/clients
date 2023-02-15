import { NgModule } from "@angular/core";

import { AccessSelectorModule } from "../../../admin-console/organizations/shared/components/access-selector/access-selector.module";
import { SharedModule } from "../../shared/shared.module";

import { CollectionDialogModule } from "./components/collection-dialog";
import { SearchInputComponent } from "./components/search-input/search-input.component";

@NgModule({
  imports: [SharedModule, CollectionDialogModule, AccessSelectorModule],
  declarations: [SearchInputComponent],
  exports: [SharedModule, CollectionDialogModule, AccessSelectorModule, SearchInputComponent],
})
export class SharedOrganizationModule {}
