import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatToolbarModule,
    MatButtonModule
  ]
})
export class AdminDashboardComponent {
  currentSection = 'Dashboard';
  navItems = [
    { path: 'products', icon: 'inventory_2', label: 'Products' },
    { path: 'events', icon: 'event', label: 'Events' },
    { path: 'blog', icon: 'article', label: 'Blog' },
    { path: 'faqs', icon: 'help', label: 'FAQs' },
    { path: 'shop', icon: 'shopping_cart', label: 'Shop' },
    { path: 'inquiries', icon: 'mail', label: 'Inquiries' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Update current section based on route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const currentPath = this.router.url.split('/').pop() || '';
      const currentNav = this.navItems.find(item => item.path === currentPath);
      this.currentSection = currentNav ? currentNav.label : 'Dashboard';
    });
  }

  async logout() {
    await this.authService.logout();
  }
}