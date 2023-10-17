import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

import { TypographyDirective } from "./typography.directive";

@NgModule({
  imports: [CommonModule, TypographyDirective],
  exports: [TypographyDirective],
})
export class TypographyModule {}
