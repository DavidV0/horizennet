import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 20;
  }

  navItems = [
    { path: '/', label: 'Home' },
    { path: '/projekte', label: 'Projekte' },
    { path: '/ueber-uns', label: 'Über uns' },
    { path: '/blog', label: 'Blog' },
    { path: '/events', label: 'Events' },
    { path: '/shop', label: 'Shop' }
  ];
} 