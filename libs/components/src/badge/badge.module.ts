import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

import { BadgeDirective } from "./badge.directive";

@NgModule({
  imports: [CommonModule, BadgeDirective],
  exports: [BadgeDirective],
})
export class BadgeModule {}
