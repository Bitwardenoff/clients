import { NgModule } from "@angular/core";

import { ProgressModule } from "@bitwarden/components";
import { SharedModule } from "@bitwarden/web-vault/app/shared";

import { OnboardingTaskComponent } from "./onboarding-task.component";
import { OnboardingComponent } from "./onboarding.component";

@NgModule({
  imports: [SharedModule, ProgressModule],
  exports: [OnboardingComponent, OnboardingTaskComponent],
  declarations: [OnboardingComponent, OnboardingTaskComponent],
})
export class OnboardingModule {}
