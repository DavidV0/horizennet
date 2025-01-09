import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Event } from '../../../shared/interfaces/event.interface';
import { EventService } from '../../../shared/services/event.service';

@Component({
  selector: 'app-events-section',
  templateUrl: './events-section.component.html',
  styleUrls: ['./events-section.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    RouterModule
  ]
})
export class EventsSectionComponent implements OnInit {
  events: Event[] = [];
  loading = true;

  constructor(private eventService: EventService) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  private loadEvents(): void {
    this.eventService.getAllEvents().subscribe({
      next: (events: Event[]) => {
        this.events = events.map((event: Event) => ({
          ...event,
          day: event.day || new Date().getDate().toString(),
          month: event.month || new Date().toLocaleString('default', { month: 'short' })
        }));
        this.loading = false;
      },
      error: (error: unknown) => {
        console.error('Error loading events:', error);
        this.loading = false;
      }
    });
  }

  getEventStatus(time: string): string {
    const eventTime = new Date(time);
    const now = new Date();
    
    if (eventTime < now) {
      return 'abgeschlossen';
    } else if (eventTime.toDateString() === now.toDateString()) {
      return 'laufend';
    } else {
      return 'bevorstehend';
    }
  }
} 