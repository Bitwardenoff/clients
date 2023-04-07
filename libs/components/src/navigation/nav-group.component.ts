import {
  AfterContentInit,
  Component,
  ContentChildren,
  EventEmitter,
  forwardRef,
  Input,
  OnDestroy,
  Output,
  QueryList,
} from "@angular/core";
import { Subject, takeUntil } from "rxjs";

import { NavBaseComponent } from "./nav-base.component";
import { NavItemComponent } from "./nav-item.component";
import { SideNavService } from "./side-nav.service";

@Component({
  selector: "bit-nav-group",
  templateUrl: "./nav-group.component.html",
})
export class NavGroupComponent extends NavBaseComponent implements AfterContentInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ContentChildren(forwardRef(() => NavGroupComponent), {
    descendants: true,
  })
  nestedGroups!: QueryList<NavGroupComponent>;

  @ContentChildren(NavItemComponent, {
    descendants: true,
  })
  nestedItems!: QueryList<NavItemComponent>;

  /**
   * UID for `[attr.aria-controls]`
   */
  protected contentId = Math.random().toString(36).substring(2);

  /**
   * Is `true` if the expanded content is visible
   */
  @Input()
  open = false;

  /**
   * if `true`, use `exact` match for path instead of `subset`.
   */
  @Input() exactMatch: boolean;

  @Output()
  openChange = new EventEmitter<boolean>();

  constructor(private sideNavService: SideNavService) {
    super();
  }

  protected toggle(event?: MouseEvent) {
    event?.stopPropagation();
    this.open = !this.open;
    this.openChange.emit(this.open);
  }

  /**
   * - For any nested NavGroupComponents or NavItemComponents, increment the `treeDepth` by 1.
   */
  private initNestedStyles() {
    if (this.variant !== "tree") {
      return;
    }
    [...this.nestedGroups, ...this.nestedItems].forEach((navGroupOrItem) => {
      navGroupOrItem.treeDepth += 1;
    });
  }

  ngAfterContentInit(): void {
    this.initNestedStyles();

    this.sideNavService.expanded$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isExpanded) => !isExpanded && this.open && this.toggle());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
