import { Component, Input } from "@angular/core";

import { AddEditCustomFieldsComponent as BaseAddEditCustomFieldsComponent } from "@bitwarden/angular/components/add-edit-custom-fields.component";
import { EventCollectionService } from "@bitwarden/common/abstractions/event/event-collection.service";
import { I18nService } from "@bitwarden/common/abstractions/i18n.service";

@Component({
  selector: "app-vault-add-edit-custom-fields",
  templateUrl: "add-edit-custom-fields.component.html",
})
export class AddEditCustomFieldsComponent extends BaseAddEditCustomFieldsComponent {
  @Input() viewOnly: boolean;
  @Input() copy: (value: string, typeI18nKey: string, aType: string) => void;

  constructor(i18nService: I18nService, eventCollectionService: EventCollectionService) {
    super(i18nService, eventCollectionService);
  }
}
