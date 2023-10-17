import { Component, Input } from "@angular/core";
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  FormsModule,
} from "@angular/forms";

import { JslibModule } from "../../../angular/src/jslib.module";
import { BitInputDirective } from "../input/input.directive";
import { I18nPipe } from "../shared/i18n.pipe";

let nextId = 0;

@Component({
  selector: "bit-search",
  templateUrl: "./search.component.html",
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: SearchComponent,
    },
  ],
  standalone: true,
  imports: [BitInputDirective, ReactiveFormsModule, FormsModule, I18nPipe, JslibModule],
})
export class SearchComponent implements ControlValueAccessor {
  private notifyOnChange: (v: string) => void;
  private notifyOnTouch: () => void;

  protected id = `search-id-${nextId++}`;
  protected searchText: string;

  @Input() disabled: boolean;
  @Input() placeholder: string;

  onChange(searchText: string) {
    if (this.notifyOnChange != undefined) {
      this.notifyOnChange(searchText);
    }
  }

  onTouch() {
    if (this.notifyOnTouch != undefined) {
      this.notifyOnTouch();
    }
  }

  registerOnChange(fn: (v: string) => void): void {
    this.notifyOnChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.notifyOnTouch = fn;
  }

  writeValue(searchText: string): void {
    this.searchText = searchText;
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled;
  }
}
