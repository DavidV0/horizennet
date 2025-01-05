import { Component, ViewEncapsulation, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { register } from 'swiper/element/bundle';
import { RouterModule } from '@angular/router';

register();

interface Testimonial {
  name: string;
  position: string;
  rating: number;
  title: string;
  content: string;
  image: string;
  verified: boolean;
}

@Component({
  selector: 'app-testimonials-section',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './testimonials-section.component.html',
  styleUrls: ['./testimonials-section.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TestimonialsSectionComponent {
  testimonials: Testimonial[] = [
    {
      name: 'Peter Ladwig',
      position: 'Früher KFZ Ausbildung',
      rating: 5.0,
      title: 'Früher KFZ Ausbildung, heute verdient Peter 7.215 € monatlich mit Kryptonet!',
      content: 'Peter war skeptisch gegenüber Online-Plattformen und kämpfte mit einem geringen Einkommen. Doch nach dem ersten Monat mit der VIP-Mentoring-Strategie von Kryptonet verdiente er 1.200 € und sein Vertrauen wuchs. Heute ist er einer unserer Top-Verdiener mit über 7.000 € monatlich. "Kryptonet hat mich vom Skeptiker zum erfolgreichen Unternehmer gemacht und meine finanziellen Probleme gelöst"',
      image: 'assets/images/testimonials/peter.jpg',
      verified: true
    },
    {
      name: 'Max Limberger',
      position: 'Erfolgreicher Trader',
      rating: 5.0,
      title: '4000.00€ pro Monat zusätzlich, nach 6 Monaten',
      content: 'Lukas kämpfte ständig mit finanziellen Engpässen und träumte von Unabhängigkeit. Mit der Hyper-KI-Bots-Strategie von Kryptonet lernte er Schritt für Schritt, wie er mit Krypto-Trading und Dropshipping erfolgreich wird. Nach sechs Monaten verdient er 4.000 € monatlich. "Dank Kryptonet habe ich mir meine finanzielle Situation komplett verändert und lebe jetzt meinen Traum."',
      image: 'assets/images/testimonials/max.jpg',
      verified: true
    }
  ];

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  }

  getRandomColor(name: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  }
} 