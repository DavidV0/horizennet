import { Component, ViewChildren, QueryList, ElementRef, AfterViewInit, PLATFORM_ID, Inject, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDateRangePicker } from '@angular/material/datepicker';

interface Event {
  date: {
    day: string;
    month: string;
  };
  title: string;
  description: string;
  time: string;
  location: string;
  image: string;
}

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule, 
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent implements AfterViewInit {
  @ViewChildren('animatedElement') animatedElements!: QueryList<ElementRef>;
  @ViewChild('picker') datePicker!: MatDateRangePicker<Date>;
  
  private observer: IntersectionObserver | null = null;

  locations = [
    'Wien',
    'Linz',
    'Salzburg',
    'Graz',
    'Innsbruck',
    'Klagenfurt',
    'Bregenz',
    'St. Pölten',
    'Eisenstadt'
  ];

  categories = [
    'Networking',
    'Workshop',
    'Seminar',
    'Konferenz',
    'Team Event',
    'Academy',
    'Mentoring'
  ];

  eventTypes = [
    'Inner Circle',
    'Public Event',
    'VIP Event',
    'Business Meeting',
    'Training',
    'Celebration'
  ];

  filterForm = new FormGroup({
    location: new FormControl(''),
    dateRange: new FormGroup({
      start: new FormControl<Date | null>(null),
      end: new FormControl<Date | null>(null),
    }),
    category: new FormControl(''),
    eventType: new FormControl('')
  });

  events: Event[] = [
    {
      date: { day: '08', month: 'DEZ' },
      title: 'Inner Circle MEETUP',
      description: 'Exklusives Networking-Event für Inner Circle Mitglieder',
      time: '2024-12-08 @ 05:00 PM - 2024-12-08 @ 10:00 PM',
      location: 'Kontaktieren Sie uns per Mail für detaillierte Informationen',
      image: 'assets/HorizonNet_tHwL.png'
    },
    {
      date: { day: '20', month: 'DEZ' },
      title: 'Inner Circle Weihnachtsfeier',
      description: 'Festliche Jahresabschlussfeier mit dem gesamten Team',
      time: '2024-12-20 @ 07:00 PM - 2024-12-20 @ 11:30 PM',
      location: 'Kontaktieren Sie uns per Mail für detaillierte Informationen',
      image: 'assets/images/events/christmas-party.jpg'
    },
    {
      date: { day: '29', month: 'NOV' },
      title: 'Inner Cricle Networking – Team Event',
      description: 'Strategisches Networking und Teamentwicklung',
      time: '2024-11-29 - 2024-12-01',
      location: 'Kontaktieren Sie uns per Mail für detaillierte Informationen',
      image: 'assets/images/events/networking.jpg'
    }
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.setupIntersectionObserver();
    }
  }

  private setupIntersectionObserver() {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate');
        }
      });
    }, options);

    setTimeout(() => {
      this.animatedElements?.forEach(({ nativeElement }) => {
        if (this.observer) {
          this.observer.observe(nativeElement);
        }
      });
    }, 100);
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  openDatePicker(datePicker: MatDateRangePicker<Date>) {
    datePicker.open();
  }
}
