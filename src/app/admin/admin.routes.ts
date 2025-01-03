import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminDashboardComponent,
    children: [
      {
        path: '',
        redirectTo: 'products',
        pathMatch: 'full'
      },
      {
        path: 'products',
        loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsComponent)
      },
      {
        path: 'events',
        loadComponent: () => import('./pages/events/events.component').then(m => m.EventsComponent)
      },
      {
        path: 'faqs',
        loadComponent: () => import('./pages/faqs/faqs.component').then(m => m.FaqsComponent)
      }
    ]
  }
]; 