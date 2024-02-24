import { animate, state, style, transition, trigger } from "@angular/animations";
import { Component } from "@angular/core";
import { Toast as BaseToastrComponent } from "ngx-toastr";

@Component({
  selector: "[toast-component2]",
  template: `
    <bit-toast
      [title]="options.payload.type"
      [variant]="options.payload.type"
      [message]="options.payload.message"
      [progressWidth]="width"
      (onClose)="remove()"
    ></bit-toast>
  `,
  animations: [
    trigger("flyInOut", [
      state("inactive", style({ opacity: 0 })),
      state("active", style({ opacity: 1 })),
      state("removed", style({ opacity: 0 })),
      transition("inactive => active", animate("{{ easeTime }}ms {{ easing }}")),
      transition("active => removed", animate("{{ easeTime }}ms {{ easing }}")),
    ]),
  ],
  preserveWhitespaces: false,
})
export class BitwardenToastrComponent extends BaseToastrComponent {}
