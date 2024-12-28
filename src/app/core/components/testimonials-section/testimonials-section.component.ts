import { Component, ViewEncapsulation, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { register } from 'swiper/element/bundle';

register();

interface Testimonial {
  name: string;
  position: string;
  company: string;
  content: string;
  image?: string;
}

@Component({
  selector: 'app-testimonials-section',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './testimonials-section.component.html',
  styleUrls: ['./testimonials-section.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TestimonialsSectionComponent {
  testimonials: Testimonial[] = [
    {
      name: 'Sarah Meyer',
      position: 'CEO',
      company: 'TechVision GmbH',
      content: 'HorizonNet hat unsere Erwartungen übertroffen. Die Plattform ist intuitiv und die Unterstützung ist erstklassig.'
    },
    {
      name: 'Michael Schmidt',
      position: 'CTO',
      company: 'Digital Solutions AG',
      content: 'Die Sicherheit und Zuverlässigkeit der Dienste ist beeindruckend. Absolut empfehlenswert!'
    },
    {
      name: 'Laura Weber',
      position: 'Projektmanagerin',
      company: 'Innovation Labs',
      content: 'Seit wir HorizonNet nutzen, hat sich unsere Effizienz deutlich verbessert. Ein Game-Changer für unser Unternehmen.'
    },
    {
      name: 'Thomas Bauer',
      position: 'Finanzvorstand',
      company: 'Global Finance AG',
      content: 'Die Investition in HorizonNet war eine der besten Entscheidungen für unser Unternehmen. Der ROI spricht für sich.'
    },
    {
      name: 'Julia Hoffmann',
      position: 'Marketing Direktorin',
      company: 'Creative Mind GmbH',
      content: 'Innovative Lösungen, die unsere Marketing-Strategien auf ein neues Level gehoben haben. Hervorragender Support!'
    },
    {
      name: 'Markus Winter',
      position: 'Geschäftsführer',
      company: 'Winter & Partner',
      content: 'Als langjähriger Kunde schätzen wir besonders die kontinuierliche Weiterentwicklung und den persönlichen Service.'
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