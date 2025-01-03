import { Component, ViewEncapsulation, CUSTOM_ELEMENTS_SCHEMA, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { register } from 'swiper/element/bundle';
import { EventService } from '../../../shared/services/event.service';
import { Event } from '../../../shared/interfaces/event.interface';
import { Subscription } from 'rxjs';

register();

@Component({
  selector: 'app-events-section',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './events-section.component.html',
  styleUrls: ['./events-section.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class EventsSectionComponent implements OnInit, OnDestroy {
  events: Event[] = [];
  private eventsSubscription?: Subscription;

  constructor(private eventService: EventService) {}

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

  ngOnDestroy() {
    if (this.eventsSubscription) {
      this.eventsSubscription.unsubscribe();
    }
  }
} 