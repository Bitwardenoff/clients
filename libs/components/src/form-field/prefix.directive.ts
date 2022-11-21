import { Directive, HostBinding, Input, Optional } from "@angular/core";
import { ButtonLikeAbstraction } from "../shared/button-like.abstraction";

export const PrefixClasses = [
  "tw-bg-background-alt",
  "tw-border",
  "tw-border-solid",
  "tw-border-secondary-500",
  "tw-text-muted",
  "tw-rounded-none",
];

export const PrefixStaticContentClasses = ["tw-block", "tw-px-3", "tw-py-1.5"];

@Directive({
  selector: "[bitPrefix]",
})
export class BitPrefixDirective {
  constructor(@Optional() private buttonComponent: ButtonLikeAbstraction) {}

  @HostBinding("class") @Input() get classList() {
    return PrefixClasses.concat(
      ["tw-border-r-0", "first:tw-rounded-l"],
      this.buttonComponent == undefined ? PrefixStaticContentClasses : []
    );
  }
}
