import { Injectable } from "@angular/core";

import { ApplicationView } from "../models/view/application.view";

@Injectable({
  providedIn: "root",
})
export class ApplicationService {
  async getApplications(organizationId: string): Promise<ApplicationView[]> {
    return [];
  }
}
