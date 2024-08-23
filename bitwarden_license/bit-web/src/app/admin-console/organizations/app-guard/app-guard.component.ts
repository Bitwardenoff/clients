import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  combineLatest,
  concatMap,
  distinctUntilChanged,
  map,
  Observable,
  Subject,
  switchMap,
  take,
  takeUntil,
} from "rxjs";

import { ApplicationService } from "./applications/application.service";
import { ApplicationView } from "./models/view/application.view";

@Component({
  selector: "app-org-app-guard",
  templateUrl: "./app-guard.component.html",
})
export class AppGuardComponent implements OnInit, OnDestroy {
  private destroy$: Subject<void> = new Subject<void>();
  protected loading = true;

  protected view$: Observable<{
    applications: ApplicationView[];
  }>;

  constructor(
    private route: ActivatedRoute,
    private applicationService: ApplicationService,
  ) {}

  ngOnInit(): void {
    const orgId$ = this.route.params.pipe(
      map((p) => p.organizationId),
      distinctUntilChanged(),
    );

    const applications$ = orgId$.pipe(
      concatMap(async (orgId) => await this.applicationService.getApplications(orgId)),
      takeUntil(this.destroy$),
    );

    this.view$ = combineLatest([applications$]).pipe(
      switchMap(async ([applications]) => ({
        applications,
      })),
    );

    orgId$
      .pipe(
        switchMap(() => this.view$.pipe(take(1))),
        takeUntil(this.destroy$),
      )
      .subscribe((_) => {
        this.loading = false;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
