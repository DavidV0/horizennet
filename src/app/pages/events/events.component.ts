import { Component, ViewChildren, QueryList, ElementRef, AfterViewInit, PLATFORM_ID, Inject, ViewChild, OnInit, OnDestroy } from '@angular/core';
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
import { EventService } from '../../shared/services/event.service';
import { Event } from '../../shared/interfaces/event.interface';
import { Subscription } from 'rxjs';

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
export class EventsComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChildren('animatedElement') animatedElements!: QueryList<ElementRef>;
  @ViewChild('picker') datePicker!: MatDateRangePicker<Date>;
  
  private observer: IntersectionObserver | null = null;
  private eventsSubscription?: Subscription;

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

  events: Event[] = [];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private eventService: EventService
  ) {}

  ngOnInit() {
    this.loadEvents();
  }

  private loadEvents() {
    this.eventsSubscription = this.eventService.getAllEvents().subscribe({
      next: (events) => {
        this.events = events;
      },
      error: (error) => {
        console.error('Error loading events:', error);
      }
    });
  }

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
    if (this.eventsSubscription) {
      this.eventsSubscription.unsubscribe();
    }
  }

  openDatePicker(datePicker: MatDateRangePicker<Date>) {
    datePicker.open();
  }
}
