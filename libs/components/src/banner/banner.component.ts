import { NgClass, NgIf } from "@angular/common";
import { Component, Input, OnInit, Output, EventEmitter } from "@angular/core";

import { JslibModule } from "../../../angular/src/jslib.module";
import { BitIconButtonComponent } from "../icon-button/icon-button.component";
import { I18nPipe } from "../shared/i18n.pipe";

type BannerTypes = "premium" | "info" | "warning" | "danger";

const defaultIcon: Record<BannerTypes, string> = {
  premium: "bwi-star",
  info: "bwi-info-circle",
  warning: "bwi-exclamation-triangle",
  danger: "bwi-error",
};

@Component({
  selector: "bit-banner",
  templateUrl: "./banner.component.html",
  standalone: true,
  imports: [NgClass, NgIf, BitIconButtonComponent, I18nPipe, JslibModule],
})
export class BannerComponent implements OnInit {
  @Input("bannerType") bannerType: BannerTypes = "info";
  @Input() icon: string;
  @Input() useAlertRole = true;

  @Output() onClose = new EventEmitter<void>();

  ngOnInit(): void {
    this.icon ??= defaultIcon[this.bannerType];
  }

  get bannerClass() {
    switch (this.bannerType) {
      case "danger":
        return "tw-bg-danger-500";
      case "info":
        return "tw-bg-info-500";
      case "premium":
        return "tw-bg-success-500";
      case "warning":
        return "tw-bg-warning-500";
    }
  }
}
