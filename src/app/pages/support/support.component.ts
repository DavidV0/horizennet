import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h1>Support</h1>
      <p>Hier finden Sie Hilfe und Support für Ihre Fragen.</p>
    </div>
  `,
  styles: [`
    .container {
      padding: var(--spacing-xl);
      max-width: 1200px;
      margin: 0 auto;
    }
  `]
})
export class SupportComponent {} 