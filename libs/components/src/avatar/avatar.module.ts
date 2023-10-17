import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

import { AvatarComponent } from "./avatar.component";

@NgModule({
  imports: [CommonModule, AvatarComponent],
  exports: [AvatarComponent],
})
export class AvatarModule {}
