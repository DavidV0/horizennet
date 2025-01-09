import { Component, OnInit, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Event } from '../../shared/interfaces/event.interface';
import { EventService } from '../../shared/services/event.service';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    RouterModule
  ],
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent implements OnInit {
  @ViewChildren('animatedElement') animatedElements!: QueryList<ElementRef>;
  events: Event[] = [];
  loading = true;

  constructor(private eventService: EventService) {}

  ngOnInit(): void {
    this.loadEvents();
    this.setupScrollAnimation();
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

  private setupScrollAnimation(): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1
    });

    setTimeout(() => {
      this.animatedElements.forEach(element => {
        observer.observe(element.nativeElement);
      });
    });
  }
}
