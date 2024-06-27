import { Component, OnInit } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormControl } from "@angular/forms";
import { Subject, debounceTime } from "rxjs";

import { SearchModule, TableDataSource } from "@bitwarden/components";

import { HeaderModule } from "../../../../../../../apps/web/src/app/layouts/header/header.module";
import { SharedModule } from "../../../../../../../apps/web/src/app/shared";

import { MemberAccessReportService } from "./member-access-report.service";
import { MemberAccessReportView } from "./view/member-access-report.view";

@Component({
  selector: "member-access-report",
  templateUrl: "member-access-report.component.html",
  imports: [SharedModule, SearchModule, HeaderModule],
  standalone: true,
})
export class MemberAccessReportComponent implements OnInit {
  protected destroy$ = new Subject<void>();
  protected dataSource = new TableDataSource<MemberAccessReportView>();
  protected searchControl = new FormControl("", { nonNullable: true });

  constructor(protected reportService: MemberAccessReportService) {
    // Connect the search input to the table dataSource filter input
    this.searchControl.valueChanges
      .pipe(debounceTime(200), takeUntilDestroyed())
      .subscribe((v) => (this.dataSource.filter = v));
  }

  ngOnInit() {
    this.dataSource.data = this.reportService.getMemberAccessMockData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
