import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Shop</h1>
      <p>Entdecken Sie unsere Produkte.</p>
    </div>
  `
})
export class ShopComponent {}
