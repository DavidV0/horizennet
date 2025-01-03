import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { LoginComponent } from './pages/login/login.component';
import { ProductsComponent } from './pages/products/products.component';
import { EventsComponent } from './pages/events/events.component';
import { BlogComponent } from './pages/blog/blog.component';
import { FaqsComponent } from './pages/faqs/faqs.component';
import { ShopComponent } from './pages/shop/shop.component';
import { InquiriesComponent } from './pages/inquiries/inquiries.component';
import { authGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: AdminDashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: 'products', component: ProductsComponent },
      { path: 'events', component: EventsComponent },
      { path: 'blog', component: BlogComponent },
      { path: 'faqs', component: FaqsComponent },
      { path: 'shop', component: ShopComponent },
      { path: 'inquiries', component: InquiriesComponent },
      { path: '', redirectTo: 'products', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
