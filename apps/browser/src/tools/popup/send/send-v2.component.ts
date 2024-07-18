import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { RouterLink } from "@angular/router";
import { mergeMap, Subject, takeUntil } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { SendType } from "@bitwarden/common/tools/send/enums/send-type";
import { SendView } from "@bitwarden/common/tools/send/models/view/send.view";
import { SendService } from "@bitwarden/common/tools/send/services/send.service.abstraction";
import { ButtonModule, NoItemsModule } from "@bitwarden/components";
import {
  NoSendsIcon,
  NewSendDropdownComponent,
  SendListItemsContainerComponent,
} from "@bitwarden/send-ui";

import { CurrentAccountComponent } from "../../../auth/popup/account-switching/current-account.component";
import { PopOutComponent } from "../../../platform/popup/components/pop-out.component";
import { PopupHeaderComponent } from "../../../platform/popup/layout/popup-header.component";
import { PopupPageComponent } from "../../../platform/popup/layout/popup-page.component";

@Component({
  templateUrl: "send-v2.component.html",
  standalone: true,
  imports: [
    PopupPageComponent,
    PopupHeaderComponent,
    PopOutComponent,
    CurrentAccountComponent,
    NoItemsModule,
    JslibModule,
    CommonModule,
    ButtonModule,
    RouterLink,
    NewSendDropdownComponent,
    SendListItemsContainerComponent,
  ],
})
export class SendV2Component implements OnInit, OnDestroy {
  sendType = SendType;

  protected sends: SendView[] = [];

  private destroy$ = new Subject<void>();

  protected noItemIcon = NoSendsIcon;

  constructor(protected sendService: SendService) {}

  async ngOnInit() {
    this.sendService.sendViews$
      .pipe(
        mergeMap(async (sends) => {
          this.sends = sends;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  ngOnDestroy(): void {}
}
