import {
  AfterContentChecked,
  Component,
  ElementRef,
  HostBinding,
  Input,
  signal,
  ViewChild,
} from "@angular/core";

import { ToggleGroupComponent } from "./toggle-group.component";

let nextId = 0;

@Component({
  selector: "bit-toggle",
  templateUrl: "./toggle.component.html",
  preserveWhitespaces: false,
})
export class ToggleComponent<TValue> implements AfterContentChecked {
  id = nextId++;

  @Input() value?: TValue;
  @ViewChild("labelContent") labelContent: ElementRef<HTMLSpanElement>;
  @ViewChild("bitBadgeContainer") bitBadgeContainer: ElementRef<HTMLSpanElement>;

  constructor(private groupComponent: ToggleGroupComponent<TValue>) {}

  @HostBinding("tabIndex") tabIndex = "-1";
  @HostBinding("class") classList = ["tw-group/toggle", "tw-flex"];

  protected bitBadgeContainerHasChidlren = signal(false);

  get name() {
    return this.groupComponent.name;
  }

  get selected() {
    return this.groupComponent.selected === this.value;
  }

  get inputClasses() {
    return ["tw-peer/toggle-input", "tw-appearance-none", "tw-outline-none"];
  }

  get labelTextContent() {
    return this.labelContent?.nativeElement.innerText ?? null;
  }

  get labelClasses() {
    return [
      "tw-h-full",
      "tw-w-full",
      "tw-flex",
      "tw-items-center",
      "tw-justify-center",
      "tw-gap-1.5",
      "!tw-font-semibold",
      "tw-leading-5",
      "tw-inline-block",
      "tw-transition",
      "tw-text-center",
      "tw-border-primary-600",
      "!tw-text-primary-600",
      "tw-border-solid",
      "tw-border-y",
      "tw-border-r",
      "tw-border-l-0",
      "tw-cursor-pointer",
      "group-first-of-type/toggle:tw-border-l",
      "group-first-of-type/toggle:tw-rounded-l-full",
      "group-last-of-type/toggle:tw-rounded-r-full",

      "peer-focus-visible/toggle-input:tw-outline-none",
      "peer-focus-visible/toggle-input:tw-ring",
      "peer-focus-visible/toggle-input:tw-ring-offset-2",
      "peer-focus-visible/toggle-input:tw-ring-primary-600",
      "peer-focus-visible/toggle-input:tw-z-10",
      "peer-focus-visible/toggle-input:tw-bg-primary-600",
      "peer-focus-visible/toggle-input:tw-border-primary-600",
      "peer-focus-visible/toggle-input:!tw-text-contrast",

      "peer-checked/toggle-input:tw-bg-primary-600",
      "peer-checked/toggle-input:tw-border-primary-600",
      "peer-checked/toggle-input:!tw-text-contrast",
      "tw-py-1.5",
      "tw-px-4",

      // Fix for bootstrap styles that add bottom margin
      "!tw-mb-0",
    ];
  }

  onInputInteraction() {
    this.groupComponent.onInputInteraction(this.value);
  }

  ngAfterContentChecked() {
    this.bitBadgeContainerHasChidlren.set(
      this.bitBadgeContainer?.nativeElement.childElementCount > 0,
    );
  }
}
