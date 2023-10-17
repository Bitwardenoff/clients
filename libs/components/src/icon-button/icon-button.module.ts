import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

import { BitIconButtonComponent } from "./icon-button.component";

@NgModule({
  imports: [CommonModule, BitIconButtonComponent],
  exports: [BitIconButtonComponent],
})
export class IconButtonModule {}
