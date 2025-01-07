import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactSectionComponent } from '../../core/components/contact-section/contact-section.component';

@Component({
  selector: 'app-kontakt',
  standalone: true,
  imports: [
    CommonModule,
    ContactSectionComponent,
  ],
  templateUrl: './kontakt.component.html',
  styleUrls: ['./kontakt.component.scss']
})
export class KontaktComponent {

} 