import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Events</h1>
      <p>Kommende Veranstaltungen und Events.</p>
    </div>
  `
})
export class EventsComponent {}
