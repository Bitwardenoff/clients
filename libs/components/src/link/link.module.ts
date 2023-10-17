import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

import { AnchorLinkDirective, ButtonLinkDirective } from "./link.directive";

@NgModule({
  imports: [CommonModule, AnchorLinkDirective, ButtonLinkDirective],
  exports: [AnchorLinkDirective, ButtonLinkDirective],
})
export class LinkModule {}
