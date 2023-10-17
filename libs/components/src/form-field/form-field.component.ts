import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { NgIf, NgSwitch, NgSwitchCase } from "@angular/common";
import {
  AfterContentChecked,
  Component,
  ContentChild,
  ContentChildren,
  HostBinding,
  Input,
  QueryList,
  ViewChild,
} from "@angular/core";

import { JslibModule } from "../../../angular/src/jslib.module";
import { BitHintComponent } from "../form-control/hint.component";
import { I18nPipe } from "../shared/i18n.pipe";

import { BitErrorComponent } from "./error.component";
import { BitFormFieldControl } from "./form-field-control";
import { BitPrefixDirective } from "./prefix.directive";
import { BitSuffixDirective } from "./suffix.directive";

@Component({
  selector: "bit-form-field",
  templateUrl: "./form-field.component.html",
  standalone: true,
  imports: [NgIf, NgSwitch, NgSwitchCase, BitErrorComponent, I18nPipe, JslibModule],
})
export class BitFormFieldComponent implements AfterContentChecked {
  @ContentChild(BitFormFieldControl) input: BitFormFieldControl;
  @ContentChild(BitHintComponent) hint: BitHintComponent;

  @ViewChild(BitErrorComponent) error: BitErrorComponent;

  @ContentChildren(BitPrefixDirective) prefixChildren: QueryList<BitPrefixDirective>;
  @ContentChildren(BitSuffixDirective) suffixChildren: QueryList<BitSuffixDirective>;

  private _disableMargin = false;
  @Input() set disableMargin(value: boolean | "") {
    this._disableMargin = coerceBooleanProperty(value);
  }
  get disableMargin() {
    return this._disableMargin;
  }

  @HostBinding("class")
  get classList() {
    return ["tw-block"].concat(this.disableMargin ? [] : ["tw-mb-6"]);
  }

  ngAfterContentChecked(): void {
    if (this.error) {
      this.input.ariaDescribedBy = this.error.id;
    } else if (this.hint) {
      this.input.ariaDescribedBy = this.hint.id;
    } else {
      this.input.ariaDescribedBy = undefined;
    }
  }
}
