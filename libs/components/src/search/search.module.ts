import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { InputModule } from "../input/input.module";
import { SharedModule } from "../shared";

import { SearchComponent } from "./search.component";

@NgModule({
  imports: [SharedModule, InputModule, FormsModule, SearchComponent],
  exports: [SearchComponent],
})
export class SearchModule {}
