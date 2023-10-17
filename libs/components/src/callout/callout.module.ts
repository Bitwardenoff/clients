import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

import { CalloutComponent } from "./callout.component";

@NgModule({
  imports: [CommonModule, CalloutComponent],
  exports: [CalloutComponent],
})
export class CalloutModule {}
