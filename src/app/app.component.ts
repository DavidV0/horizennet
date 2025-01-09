import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd } from '@angular/router';
import { CommonModule, isPlatformBrowser, ViewportScroller } from '@angular/common';
import { NavbarComponent } from './core/components/navbar/navbar.component';
import { LoadingScreenComponent } from './core/components/loading-screen/loading-screen.component';
import { LoadingService } from './core/services/loading.service';
import { Observable } from 'rxjs';
import { FooterComponent } from '@core/components/footer/footer.component';
import { filter } from 'rxjs/operators';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, LoadingScreenComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  loading$: Observable<boolean>;
  isAdminRoute = false;

  constructor(
    private router: Router,
    private loadingService: LoadingService,
    private viewportScroller: ViewportScroller,
    @Inject(PLATFORM_ID) private platformId: Object,
    private titleService: Title
  ) {
    this.loading$ = this.loadingService.isLoading$;
  }

  ngOnInit() {
    // Loading-Screen-Logik
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        // Only show loading screen for non-admin routes
        const isAdminNavigation = event.url.startsWith('/admin');
        if (!isAdminNavigation) {
          this.loadingService.show();
          setTimeout(() => {
            this.loadingService.hide();
          }, 1000);
        }
      }
      
      // Check if we're in admin route
      if (event instanceof NavigationEnd) {
        this.isAdminRoute = this.router.url.startsWith('/admin');
      }
    });

    // Scroll-nach-oben-Logik
    if (isPlatformBrowser(this.platformId)) {
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe(() => {
        this.viewportScroller.scrollToPosition([0, 0]);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        
        // Title setzen basierend auf aktueller Route
        const currentRoute = this.router.url.split('/')[1];
        let pageTitle = 'Home';
        
        switch(currentRoute) {
          case '':
            pageTitle = 'Home';
            break;
          case 'produkte':
            pageTitle = 'Produkte';
            break;
          case 'ueber-uns':
            pageTitle = 'Über uns';
            break;
          case 'blog':
            pageTitle = 'Blog';
            break;
          case 'events':
            pageTitle = 'Events';
            break;
          case 'shop':
            pageTitle = 'Shop';
            break;
          case 'dashboard':
            pageTitle = 'Dashboard';
            break;
          case 'agb':
            pageTitle = 'AGB';
            break;
          case 'widerruf':
            pageTitle = 'Widerruf';
            break;
          case 'disclaimer':
            pageTitle = 'Disclaimer';
            break;
          case 'impressum':
            pageTitle = 'Impressum';
            break;
          case 'datenschutz':
            pageTitle = 'Datenschutz';
            break;
          case 'faq':
            pageTitle = 'FAQ';
            break;
          default:
            pageTitle = 'Home';
        }
        
        this.titleService.setTitle(`${pageTitle} | HORIZON NET Consulting`);
      });
    }
  }
}
