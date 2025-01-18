import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { BlogComponent } from './pages/blog/blog.component';
import { AdminEventsComponent } from './pages/events/events.component';
import { AdminShopComponent } from './pages/shop/shop.component';
import { ProductsComponent } from './pages/products/products.component';
import { CreateAdminComponent } from './pages/create-admin/create-admin.component';
import { adminGuard } from './guards/admin.guard';
import { LoginComponent } from './pages/login/login.component';
import { DashboardHomeComponent } from './components/dashboard-home/dashboard-home.component';
import { FaqsComponent } from './pages/faqs/faqs.component';
import { CoursesComponent } from './pages/courses/courses.component';

const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: AdminDashboardComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardHomeComponent },
      { path: 'blog', component: BlogComponent },
      { path: 'events', component: AdminEventsComponent },
      { path: 'shop', component: AdminShopComponent },
      { path: 'products', component: ProductsComponent },
      { path: 'faqs', component: FaqsComponent },
      { path: 'create-admin', component: CreateAdminComponent },
      { path: 'courses', component: CoursesComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
