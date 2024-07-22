import { NgIf } from "@angular/common";
import { Component, Input } from "@angular/core";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import {
  CardComponent,
  FormFieldModule,
  SectionComponent,
  SectionHeaderComponent,
  TypographyModule,
} from "@bitwarden/components";

@Component({
  standalone: true,
  selector: "app-view-identity-sections",
  templateUrl: "./view-identity-sections.component.html",
  imports: [
    NgIf,
    JslibModule,
    CardComponent,
    SectionComponent,
    SectionHeaderComponent,
    TypographyModule,
    FormFieldModule,
  ],
})
export class ViewIdentitySectionsComponent {
  @Input() cipher: CipherView;

  /** Returns true when any of the "personal detail" attributes are populated */
  hasPersonalDetails(): boolean {
    const { username, company, fullName } = this.cipher.identity;
    return Boolean(fullName || username || company);
  }

  /** Returns true when any of the "identification detail" attributes are populated */
  hasIdentificationDetails(): boolean {
    const { ssn, passportNumber, licenseNumber } = this.cipher.identity;
    return Boolean(ssn || passportNumber || licenseNumber);
  }

  /** Returns true when any of the "contact detail" attributes are populated */
  hasContactDetails(): boolean {
    const { email, phone } = this.cipher.identity;

    return Boolean(email || phone || this.addressFields);
  }

  /** Returns all populated address fields */
  get addressFields(): string {
    const { address1, address2, address3, fullAddressPart2, country } = this.cipher.identity;
    return [address1, address2, address3, fullAddressPart2, country].filter(Boolean).join("\n");
  }

  /** Returns the number of "rows" that should be assigned to the address textarea */
  get addressRows(): number {
    return this.addressFields.split("\n").length;
  }
}
