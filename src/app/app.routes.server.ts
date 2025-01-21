import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'blog/:slug',
  },
  {
    path: 'produkte/:id',
  },
  {
    path: '**',
  }
];
