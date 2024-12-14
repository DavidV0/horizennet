import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Willkommen bei HORIZENNET</h1>
      <p>Ihre digitale Zukunft beginnt hier.</p>
    </div>
  `,
  styles: [`
    .page-container {
      padding: var(--spacing-xl);
      max-width: 1440px;
      margin: 0 auto;
    }
  `]
})
export class HomeComponent {} 