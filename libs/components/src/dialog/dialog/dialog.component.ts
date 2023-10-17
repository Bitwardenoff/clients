import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { NgClass, NgIf } from "@angular/common";
import { Component, HostBinding, Input } from "@angular/core";

import { JslibModule } from "../../../../angular/src/jslib.module";
import { BitIconButtonComponent } from "../../icon-button/icon-button.component";
import { I18nPipe } from "../../shared/i18n.pipe";
import { fadeIn } from "../animations";
import { DialogCloseDirective } from "../directives/dialog-close.directive";
import { DialogTitleContainerDirective } from "../directives/dialog-title-container.directive";

@Component({
  selector: "bit-dialog",
  templateUrl: "./dialog.component.html",
  animations: [fadeIn],
  standalone: true,
  imports: [
    NgClass,
    DialogTitleContainerDirective,
    BitIconButtonComponent,
    DialogCloseDirective,
    NgIf,
    I18nPipe,
    JslibModule,
  ],
})
export class DialogComponent {
  /**
   * Dialog size, more complex dialogs should use large, otherwise default is fine.
   */
  @Input() dialogSize: "small" | "default" | "large" = "default";

  private _disablePadding = false;
  /**
   * Disable the built-in padding on the dialog, for use with tabbed dialogs.
   */
  @Input() set disablePadding(value: boolean | "") {
    this._disablePadding = coerceBooleanProperty(value);
  }
  get disablePadding() {
    return this._disablePadding;
  }

  /**
   * Mark the dialog as loading which replaces the content with a spinner.
   */
  @Input() loading = false;

  @HostBinding("class") get classes() {
    return ["tw-flex", "tw-flex-col", "tw-max-h-screen", "tw-w-screen", "tw-p-4"].concat(
      this.width
    );
  }

  get width() {
    switch (this.dialogSize) {
      case "small": {
        return "tw-max-w-sm";
      }
      case "large": {
        return "tw-max-w-3xl";
      }
      default: {
        return "tw-max-w-xl";
      }
    }
  }
}
