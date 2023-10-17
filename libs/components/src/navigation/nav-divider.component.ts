import { NgIf, AsyncPipe } from "@angular/common";
import { Component } from "@angular/core";

@Component({
  selector: "bit-nav-divider",
  templateUrl: "./nav-divider.component.html",
  standalone: true,
  imports: [NgIf, AsyncPipe],
})
export class NavDividerComponent {}
