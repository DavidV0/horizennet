import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Dashboard</h1>
      <p>Willkommen in Ihrem persönlichen Bereich.</p>
    </div>
  `
})
export class DashboardComponent {}
