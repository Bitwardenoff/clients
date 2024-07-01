import { Directive, HostBinding, Input, Optional } from "@angular/core";

import { BitIconButtonComponent } from "../icon-button/icon-button.component";

import { BitFormFieldComponent } from "./form-field.component";

@Directive({
  selector: "[bitPrefix]",
})
export class BitPrefixDirective {
  @HostBinding("class") @Input() get classList() {
    return ["last:tw-mr-1", "tw-text-muted"];
  }

  @HostBinding("attr.aria-describedby")
  get ariaDescribedBy() {
    return this.parentFormField?.label?.id || null;
  }

  constructor(
    @Optional() private parentFormField: BitFormFieldComponent,
    @Optional() private iconButtonComponent: BitIconButtonComponent,
  ) {}

  ngOnInit() {
    if (this.iconButtonComponent) {
      this.iconButtonComponent.size = "small";
    }
  }
}
