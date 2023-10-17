import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

import { BitInputDirective } from "./input.directive";

@NgModule({
  imports: [CommonModule, BitInputDirective],
  exports: [BitInputDirective],
})
export class InputModule {}
