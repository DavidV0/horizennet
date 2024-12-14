import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Blog</h1>
      <p>Aktuelle News und Artikel.</p>
    </div>
  `
})
export class BlogComponent {}
