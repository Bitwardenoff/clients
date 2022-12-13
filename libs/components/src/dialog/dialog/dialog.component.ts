import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { Component, HostBinding, Input } from "@angular/core";

@Component({
  selector: "bit-dialog",
  templateUrl: "./dialog.component.html",
})
export class DialogComponent {
  @Input() dialogSize: "small" | "default" | "large" = "default";

  private _disablePadding: boolean;
  @Input() set disablePadding(value: boolean | string) {
    this._disablePadding = coerceBooleanProperty(value);
  }
  get disablePadding() {
    return this._disablePadding;
  }

  @HostBinding("class") classes = ["tw-flex", "tw-flex-col", "tw-py-4", "tw-max-h-screen"];

  get width() {
    switch (this.dialogSize) {
      case "small": {
        return "tw-w-96";
      }
      case "large": {
        return "tw-w-75vw";
      }
      default: {
        return "tw-w-50vw";
      }
    }
  }
}
