import { Component, HostListener, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs/operators';
import { CartService } from '../../../shared/services/cart.service';
import { CartSidebarService } from '../../../shared/services/cart-sidebar.service';
import { CartSidebarComponent } from '../cart-sidebar/cart-sidebar.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, CartSidebarComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  isScrolled = false;
  isMobileMenuOpen = false;
  isShopPage = false;
  private isBrowser: boolean;

  readonly navItems = [
    { path: '/', label: 'Home' },
    { path: '/produkte', label: 'Produkte' },
    { path: '/ueber-uns', label: 'Über uns' },
    { path: '/blog', label: 'Blog' },
    { path: '/events', label: 'Events' },
    { path: '/kontakt', label: 'Kontakt' }
  ];

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private router: Router,
    public cartService: CartService,
    private cartSidebarService: CartSidebarService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isShopPage = event.url === '/shop';
    });
  }

  openCart() {
    this.cartSidebarService.open();
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