import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { combineLatestWith, Observable, startWith, switchMap } from "rxjs";

import { DialogService } from "@bitwarden/components";

import { AccessTokenView } from "../models/view/access-token.view";
import { ServiceAccountService } from "../service-account.service";

import { AccessService } from "./access.service";
import {
  AccessTokenOperation,
  AccessTokenCreateDialogComponent,
} from "./dialogs/access-token-create-dialog.component";

@Component({
  selector: "sm-access-tokens",
  templateUrl: "./access-tokens.component.html",
})
export class AccessTokenComponent implements OnInit {
  accessTokens$: Observable<AccessTokenView[]>;

  private serviceAccountId: string;
  private organizationId: string;

  constructor(
    private route: ActivatedRoute,
    private accessService: AccessService,
    private serviceAccountService: ServiceAccountService,
    private dialogService: DialogService
  ) {}

  ngOnInit() {
    this.accessTokens$ = this.accessService.accessToken$.pipe(
      startWith(null),
      combineLatestWith(this.route.params),
      switchMap(async ([_, params]) => {
        this.organizationId = params.organizationId;
        this.serviceAccountId = params.serviceAccountId;
        return await this.getAccessTokens();
      })
    );
  }

  private async getAccessTokens(): Promise<AccessTokenView[]> {
    return await this.accessService.getAccessTokens(this.organizationId, this.serviceAccountId);
  }

  async openNewAccessTokenDialog() {
    this.dialogService.open<unknown, AccessTokenOperation>(AccessTokenCreateDialogComponent, {
      data: {
        organizationId: this.organizationId,
        serviceAccountView: await this.serviceAccountService.getByServiceAccountId(
          this.serviceAccountId
        ),
      },
    });
  }
}
