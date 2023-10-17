import { NgFor, NgIf, NgTemplateOutlet } from "@angular/common";
import { Component, ContentChildren, Input, QueryList } from "@angular/core";
import { RouterLink } from "@angular/router";

import { BitIconButtonComponent } from "../icon-button/icon-button.component";
import { AnchorLinkDirective, ButtonLinkDirective } from "../link/link.directive";
import { MenuItemDirective } from "../menu/menu-item.directive";
import { MenuTriggerForDirective } from "../menu/menu-trigger-for.directive";
import { MenuComponent } from "../menu/menu.component";

import { BreadcrumbComponent } from "./breadcrumb.component";

@Component({
  selector: "bit-breadcrumbs",
  templateUrl: "./breadcrumbs.component.html",
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    AnchorLinkDirective,
    RouterLink,
    NgTemplateOutlet,
    ButtonLinkDirective,
    BitIconButtonComponent,
    MenuTriggerForDirective,
    MenuComponent,
    MenuItemDirective,
  ],
})
export class BreadcrumbsComponent {
  @Input()
  show = 3;

  private breadcrumbs: BreadcrumbComponent[] = [];

  @ContentChildren(BreadcrumbComponent)
  protected set breadcrumbList(value: QueryList<BreadcrumbComponent>) {
    this.breadcrumbs = value.toArray();
  }

  protected get beforeOverflow() {
    if (this.hasOverflow) {
      return this.breadcrumbs.slice(0, this.show - 1);
    }

    return this.breadcrumbs;
  }

  protected get overflow() {
    return this.breadcrumbs.slice(this.show - 1, -1);
  }

  protected get afterOverflow() {
    return this.breadcrumbs.slice(-1);
  }

  protected get hasOverflow() {
    return this.breadcrumbs.length > this.show;
  }
}
