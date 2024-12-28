import { Component, ViewEncapsulation, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { register } from 'swiper/element/bundle';

register();

interface Event {
  date: {
    day: string;
    month: string;
  };
  title: string;
  time: string;
  location: string;
  image: string;
}

@Component({
  selector: 'app-events-section',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './events-section.component.html',
  styleUrls: ['./events-section.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class EventsSectionComponent {
  events: Event[] = [
    {
      date: { day: '20', month: 'DEZ' },
      title: 'Inner Circle Weihnachtsfeier',
      time: '19:00 - 23:30',
      location: 'Kontaktieren Sie uns per Mail für detaillierte Informationen',
      image: 'assets/images/events/christmas-event.jpg'
    },
    {
      date: { day: '15', month: 'DEZ' },
      title: 'Jahresabschluss Mastermind',
      time: '14:00 - 18:00',
      location: 'Kontaktieren Sie uns per Mail für detaillierte Informationen',
      image: 'assets/images/events/mastermind.jpg'
    },
    {
      date: { day: '08', month: 'DEZ' },
      title: 'Inner Circle MEETUP',
      time: '17:00 - 22:00',
      location: 'Kontaktieren Sie uns per Mail für detaillierte Informationen',
      image: 'assets/images/events/meetup.jpg'
    },
    {
      date: { day: '05', month: 'DEZ' },
      title: 'Business Strategy Workshop',
      time: '10:00 - 16:00',
      location: 'Kontaktieren Sie uns per Mail für detaillierte Informationen',
      image: 'assets/images/events/workshop.jpg'
    },
    {
      date: { day: '29', month: 'NOV' },
      title: 'Inner Circle Networking – Team Event',
      time: 'Ganztägig',
      location: 'Kontaktieren Sie uns per Mail für detaillierte Informationen',
      image: 'assets/images/events/networking.jpg'
    },
    {
      date: { day: '25', month: 'NOV' },
      title: 'Investment Strategien 2024',
      time: '18:00 - 21:00',
      location: 'Kontaktieren Sie uns per Mail für detaillierte Informationen',
      image: 'assets/images/events/investment.jpg'
    }
  ];
} 