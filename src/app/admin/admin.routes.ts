import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { adminGuard } from './guards/admin.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminDashboardComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsComponent)
      },
      {
        path: 'events',
        loadComponent: () => import('./pages/events/events.component').then(m => m.AdminEventsComponent)
      },
      {
        path: 'faqs',
        loadComponent: () => import('./pages/faqs/faqs.component').then(m => m.FaqsComponent)
      },
      {
        path: 'courses',
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/courses/courses.component').then(m => m.CoursesComponent)
          },
          {
            path: 'new',
            loadComponent: () => import('./pages/courses/course-form/course-form.component').then(m => m.CourseFormComponent),
            data: { mode: 'create' }
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./pages/courses/course-form/course-form.component').then(m => m.CourseFormComponent),
            data: { mode: 'edit' }
          },
          {
            path: ':id/modules',
            loadComponent: () => import('./pages/courses/course-modules/course-modules.component').then(m => m.CourseModulesComponent)
          }
        ]
      }
    ]
  }
]; 