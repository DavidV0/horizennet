import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ueber-uns',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Über uns</h1>
      <p>Erfahren Sie mehr über HORIZENNET.</p>
    </div>
  `
})
export class UeberUnsComponent {}
