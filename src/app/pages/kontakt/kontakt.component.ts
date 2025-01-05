import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactSectionComponent } from '../../core/components/contact-section/contact-section.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-kontakt',
  standalone: true,
  imports: [
    CommonModule,
    ContactSectionComponent,
    MatIconModule
  ],
  templateUrl: './kontakt.component.html',
  styleUrls: ['./kontakt.component.scss']
})
export class KontaktComponent {
  phoneNumber = '+43 681 81572379 '; // Replace with actual phone number
  whatsappNumber = '+4368181572379'; // Replace with actual WhatsApp number

  callPhone() {
    window.location.href = `tel:${this.phoneNumber}`;
  }

  openWhatsApp() {
    // WhatsApp API URL with predefined message
    const message = 'Hallo, ich interessiere mich für Ihre Dienstleistungen.';
    const whatsappUrl = `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }
} 