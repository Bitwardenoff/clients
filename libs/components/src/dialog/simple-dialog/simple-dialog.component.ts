import { NgIf } from "@angular/common";
import { Component, ContentChild, Directive } from "@angular/core";

import { fadeIn } from "../animations";
import { DialogTitleContainerDirective } from "../directives/dialog-title-container.directive";

@Directive({
  selector: "[bitDialogIcon]",
  standalone: true,
})
export class IconDirective {}

@Component({
  selector: "bit-simple-dialog",
  templateUrl: "./simple-dialog.component.html",
  animations: [fadeIn],
  standalone: true,
  imports: [NgIf, DialogTitleContainerDirective],
})
export class SimpleDialogComponent {
  @ContentChild(IconDirective) icon!: IconDirective;

  get hasIcon() {
    return this.icon != null;
  }
}
