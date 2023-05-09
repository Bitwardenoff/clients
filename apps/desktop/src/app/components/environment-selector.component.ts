import { animate, state, style, transition, trigger } from "@angular/animations";
import { ConnectedPosition } from "@angular/cdk/overlay";
import { Component, OnDestroy, OnInit, ViewChild, ViewContainerRef } from "@angular/core";
import { Subject, takeUntil } from "rxjs";

import { ModalService } from "@bitwarden/angular/services/modal.service";
import { ConfigServiceAbstraction } from "@bitwarden/common/abstractions/config/config.service.abstraction";
import { EnvironmentService } from "@bitwarden/common/abstractions/environment.service";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";

import { EnvironmentComponent } from "../../auth/environment.component";

@Component({
  selector: "environment-selector",
  templateUrl: "environment-selector.component.html",
  animations: [
    trigger("transformPanel", [
      state(
        "void",
        style({
          opacity: 0,
        })
      ),
      transition(
        "void => open",
        animate(
          "100ms linear",
          style({
            opacity: 1,
          })
        )
      ),
      transition("* => void", animate("100ms linear", style({ opacity: 0 }))),
    ]),
  ],
})
export class EnvironmentSelectorComponent implements OnInit, OnDestroy {
  @ViewChild("environment", { read: ViewContainerRef, static: true })
  environmentModal: ViewContainerRef;
  isOpen = false;
  showingModal = false;
  selectedEnvironment: ServerEnvironment;
  ServerEnvironmentType = ServerEnvironment;
  euServerFlagEnabled: boolean;
  overlayPostition: ConnectedPosition[] = [
    {
      originX: "start",
      originY: "bottom",
      overlayX: "start",
      overlayY: "top",
    },
  ];
  private componentDestroyed$: Subject<void> = new Subject();

  constructor(
    private modalService: ModalService,
    private environmentService: EnvironmentService,
    private configService: ConfigServiceAbstraction
  ) {}

  async ngOnInit() {
    this.euServerFlagEnabled = await this.configService.getFeatureFlagBool(
      FeatureFlag.DisplayEuEnvironmentFlag
    );
    this.updateEnvironmentInfo();
  }

  ngOnDestroy(): void {
    this.componentDestroyed$.next();
    this.componentDestroyed$.complete();
  }

  async toggle(option: ServerEnvironment) {
    this.isOpen = !this.isOpen;
    if (option === ServerEnvironment.EU) {
      await this.environmentService.setUrls({ base: "https://vault.bitwarden.eu" });
    } else if (option === ServerEnvironment.US) {
      await this.environmentService.setUrls({ base: "https://vault.bitwarden.com" });
    } else if (option === ServerEnvironment.SelfHosted) {
      this.openSelfHostedSettingsModal();
    }
    this.updateEnvironmentInfo();
  }

  async openSelfHostedSettingsModal() {
    const modal = this.modalService.open(EnvironmentComponent);
    modal.onShown.pipe(takeUntil(this.componentDestroyed$)).subscribe(() => {
      this.showingModal = true;
    });
    modal.onClosed.pipe(takeUntil(this.componentDestroyed$)).subscribe(() => {
      this.showingModal = false;
      this.updateEnvironmentInfo();
    });
  }

  updateEnvironmentInfo() {
    const webvaultUrl = this.environmentService.getWebVaultUrl();
    if (this.environmentService.isSelfHosted()) {
      this.selectedEnvironment = ServerEnvironment.SelfHosted;
    } else if (webvaultUrl != null && webvaultUrl.includes("bitwarden.eu")) {
      this.selectedEnvironment = ServerEnvironment.EU;
    } else {
      this.selectedEnvironment = ServerEnvironment.US;
    }
  }

  close() {
    this.isOpen = false;
    this.updateEnvironmentInfo();
  }
}

enum ServerEnvironment {
  US = "US",
  EU = "EU",
  SelfHosted = "Self-hosted",
}
