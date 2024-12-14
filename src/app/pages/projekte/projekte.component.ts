import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-projekte',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Unsere Projekte</h1>
      <p>Hier finden Sie eine Übersicht unserer aktuellen Projekte.</p>
    </div>
  `
})
export class ProjekteComponent {}
