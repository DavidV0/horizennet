import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationStart } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './core/components/navbar/navbar.component';
import { LoadingScreenComponent } from './core/components/loading-screen/loading-screen.component';
import { LoadingService } from './core/services/loading.service';
import { Observable } from 'rxjs';
import { FooterComponent } from '@core/components/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, LoadingScreenComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  loading$: Observable<boolean>;

  constructor(
    private router: Router,
    private loadingService: LoadingService
  ) {
    this.loading$ = this.loadingService.isLoading$;
  }

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.loadingService.show();
        setTimeout(() => {
          this.loadingService.hide();
        }, 1000);
      }
    });
  }
}
