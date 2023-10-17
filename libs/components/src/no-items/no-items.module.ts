import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

import { IconModule } from "../icon";

import { NoItemsComponent } from "./no-items.component";

@NgModule({
  imports: [CommonModule, IconModule, NoItemsComponent],
  exports: [NoItemsComponent],
})
export class NoItemsModule {}
