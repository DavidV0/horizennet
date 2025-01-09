import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { BlogComponent } from './pages/blog/blog.component';
import { AdminEventsComponent } from './pages/events/events.component';
import { AdminShopComponent } from './pages/shop/shop.component';

const routes: Routes = [
  {
    path: '',
    component: AdminDashboardComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'blog', component: BlogComponent },
      { path: 'events', component: AdminEventsComponent },
      { path: 'shop', component: AdminShopComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
