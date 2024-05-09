import { CommonModule } from "@angular/common";
import { Component, Input, OnInit } from "@angular/core";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";

import BrowserPopupUtils from "../browser-popup-utils";

@Component({
  selector: "app-pop-out",
  templateUrl: "pop-out.component.html",
  standalone: true,
  imports: [CommonModule, JslibModule],
})
export class PopOutComponent implements OnInit {
  @Input() show = true;

  constructor(private platformUtilsService: PlatformUtilsService) {}

  ngOnInit() {
    if (this.show) {
      if (
        (BrowserPopupUtils.inSidebar(window) && this.platformUtilsService.isFirefox()) ||
        BrowserPopupUtils.inPopout(window)
      ) {
        this.show = false;
      }
    }
  }

  expand() {
    // FIXME: Verify that this floating promise is intentional. If it is, add an explanatory comment and ensure there is proper error handling.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    BrowserPopupUtils.openCurrentPagePopout(window);
  }
}
