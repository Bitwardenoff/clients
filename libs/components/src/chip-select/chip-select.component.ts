import { Component, Input, OnInit, booleanAttribute } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";

import { ButtonModule } from "../button";
import { IconButtonModule } from "../icon-button";
import { MenuModule } from "../menu";
import { Option } from "../select/option";
import { SharedModule } from "../shared";
import { TypographyModule } from "../typography";

export type ChipSelectOption<T> = Option<T> & {
  /** The options that will be nested under this option */
  children?: ChipSelectOption<T>[];

  /** @internal populated by `ChipSelectComponent` */
  _parent?: ChipSelectOption<T>;
};

@Component({
  selector: "bit-chip-select",
  templateUrl: "chip-select.component.html",
  standalone: true,
  imports: [SharedModule, ButtonModule, IconButtonModule, MenuModule, TypographyModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: ChipSelectComponent,
      multi: true,
    },
  ],
})
export class ChipSelectComponent<T = unknown> implements OnInit, ControlValueAccessor {
  /** Text to show when there is no selected option */
  @Input({ required: true }) placeholderText: string;

  /** Icon to show when there is no selected option or the selected option does not have an icon */
  @Input() placeholderIcon: string;

  /** The select options to render */
  @Input({ required: true }) options: ChipSelectOption<T>[];

  /** Disables the entire chip */
  @Input({ transform: booleanAttribute }) disabled = false;

  /** Tree constructed from `this.options` */
  private rootTree: ChipSelectOption<T>;

  /** Options that are currently displayed in the menu */
  protected renderedOptions: ChipSelectOption<T>;

  /** The option that is currently selected by the user */
  protected selectedOption: ChipSelectOption<T>;

  /** The label to show in the chip button */
  protected get label(): string {
    return this.selectedOption?.label || this.placeholderText;
  }

  /** The icon to show in the chip button */
  protected get icon(): string {
    return this.selectedOption?.icon || this.placeholderIcon;
  }

  protected selectOption(option: ChipSelectOption<T>, _event: MouseEvent) {
    this.selectedOption = option;
    this.onChange(option);
  }

  protected viewOption(option: ChipSelectOption<T>, event: MouseEvent) {
    this.renderedOptions = option;

    /** We don't want to the menu to close */
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  /** Click handler for the X button */
  protected clear() {
    this.renderedOptions = this.rootTree;
    this.selectedOption = null;
    this.onChange(null);
  }

  protected debug() {
    // console.log(this.rootTree);
    // console.log(this.renderedOptions);
  }

  /**
   * Find a `ChipSelectOption` by its value
   * @param tree the root tree to search
   * @param value the option value to look for
   * @returns the `ChipSelectOption` associated with the provided value, or null if not found
   */
  private findOption(tree: ChipSelectOption<T>, value: T): ChipSelectOption<T> | null {
    let result = null;
    if (tree.value === value) {
      return tree;
    }

    if (Array.isArray(tree.children) && tree.children.length > 0) {
      tree.children.some((node) => {
        result = this.findOption(node, value);
        return result;
      });
    }
    return result;
  }

  /** For each descendant in the provided `tree`, update `_parent` to be a refrence to the parent node. This allows us to navigate back in the menu. */
  private markParents(tree: ChipSelectOption<T>) {
    tree.children?.forEach((child) => {
      child._parent = tree;
      this.markParents(child);
    });
  }

  ngOnInit(): void {
    /** Since the component is just initialized with an array of options, we need to construct the root tree. */
    const root: ChipSelectOption<T> = {
      children: this.options,
      value: null,
    };
    this.markParents(root);
    this.rootTree = root;
    this.renderedOptions = this.rootTree;
  }

  /** Control Value Accessor */

  private notifyOnChange?: (value: T) => void;
  private notifyOnTouched?: () => void;

  /** Implemented as part of NG_VALUE_ACCESSOR */
  writeValue(obj: T): void {
    this.selectedOption = this.findOption(this.rootTree, obj);

    /** Update the rendered options for next time the menu is opened */
    this.renderedOptions = this.selectedOption._parent || this.rootTree;
  }

  /** Implemented as part of NG_VALUE_ACCESSOR */
  registerOnChange(fn: (value: T) => void): void {
    this.notifyOnChange = fn;
  }

  /** Implemented as part of NG_VALUE_ACCESSOR */
  registerOnTouched(fn: any): void {
    this.notifyOnTouched = fn;
  }

  /** Implemented as part of NG_VALUE_ACCESSOR */
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  /** Implemented as part of NG_VALUE_ACCESSOR */
  protected onChange(option: Option<T> | null) {
    if (!this.notifyOnChange) {
      return;
    }

    this.notifyOnChange(option?.value);
  }

  /** Implemented as part of NG_VALUE_ACCESSOR */
  protected onBlur() {
    if (!this.notifyOnTouched) {
      return;
    }

    this.notifyOnTouched();
  }
}
