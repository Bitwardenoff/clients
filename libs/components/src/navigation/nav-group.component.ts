import { NgIf, NgTemplateOutlet, AsyncPipe } from "@angular/common";
import {
  AfterContentInit,
  Component,
  ContentChildren,
  EventEmitter,
  forwardRef,
  Input,
  Output,
  QueryList,
} from "@angular/core";

import { JslibModule } from "../../../angular/src/jslib.module";
import { BitIconButtonComponent } from "../icon-button/icon-button.component";
import { I18nPipe } from "../shared/i18n.pipe";

import { NavBaseComponent } from "./nav-base.component";
import { NavItemComponent } from "./nav-item.component";

@Component({
  selector: "bit-nav-group",
  templateUrl: "./nav-group.component.html",
  standalone: true,
  imports: [
    NavItemComponent,
    BitIconButtonComponent,
    NgIf,
    NgTemplateOutlet,
    AsyncPipe,
    I18nPipe,
    JslibModule,
  ],
})
export class NavGroupComponent extends NavBaseComponent implements AfterContentInit {
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
  }
}
