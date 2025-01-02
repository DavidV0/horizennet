import { Component, HostListener, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  isScrolled = false;
  isMobileMenuOpen = false;
  private isBrowser: boolean;

  readonly navItems = [
    { path: '/', label: 'Home' },
    { path: '/produkte', label: 'Produkte' },
    { path: '/ueber-uns', label: 'Über uns' },
    { path: '/blog', label: 'Blog' },
    { path: '/events', label: 'Events' }
  ];

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (this.isBrowser) {
      this.isScrolled = window.scrollY > 20;
    }
  }

  @HostListener('window:resize', [])
  onResize() {
    if (this.isBrowser && window.innerWidth > 1024) {
      this.isMobileMenuOpen = false;
    }
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  get showLoginInMenu(): boolean {
    return this.isBrowser && window.innerWidth <= 400;
  }
} 