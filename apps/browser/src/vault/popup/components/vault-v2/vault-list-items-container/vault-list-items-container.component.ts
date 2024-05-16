import { CommonModule } from "@angular/common";
import { booleanAttribute, Component, Input, OnInit } from "@angular/core";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import {
  BadgeModule,
  ButtonModule,
  IconButtonModule,
  ItemModule,
  SectionComponent,
  TypographyModule,
} from "@bitwarden/components";

import { PopupSectionHeaderComponent } from "../../../../../platform/popup/popup-section-header/popup-section-header.component";
import { VaultListItemComponent } from "../vault-list-item/vault-list-item.component";

@Component({
  imports: [
    CommonModule,
    ItemModule,
    ButtonModule,
    BadgeModule,
    IconButtonModule,
    SectionComponent,
    TypographyModule,
    JslibModule,
    VaultListItemComponent,
    PopupSectionHeaderComponent,
  ],
  selector: "app-vault-list-items-container",
  templateUrl: "vault-list-items-container.component.html",
  standalone: true,
})
export class VaultListItemsContainerComponent implements OnInit {
  @Input()
  ciphers: CipherView[];

  @Input()
  title: string;

  @Input({ transform: booleanAttribute })
  showAutoFill: boolean;

  ngOnInit() {}
}
