import { Component, OnInit, ElementRef, ViewChildren, QueryList, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

interface TickerItem {
  icon: string;
  name: string;
  symbol: string;
  price: number;
  change: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatButtonModule, RouterModule, MatIconModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterViewInit {
  @ViewChildren('animatedElement') animatedElements!: QueryList<ElementRef>;

  private observer: IntersectionObserver | null = null;
  private isBrowser: boolean;

  tickerItems: TickerItem[] = [
    { icon: 'eth', name: 'Ethereum', symbol: 'ETH', price: 3670.88, change: -1.54 },
    { icon: 'usdt', name: 'Tether', symbol: 'USDT', price: 0.95, change: 0.01 },
    { icon: 'xrp', name: 'XRP', symbol: 'XRP', price: 2.28, change: -1.00 },
    { icon: 'sol', name: 'Solana', symbol: 'SOL', price: 207.59, change: -2.18 },
    { icon: 'bnb', name: 'BNB', symbol: 'BNB', price: 675.22, change: -1.81 },
    { icon: 'doge', name: 'Dogecoin', symbol: 'DOGE', price: 0.372807, change: -2.54 },
    { icon: 'usdc', name: 'USDC', symbol: 'USDC', price: 0.95, change: 0.02 },
    { icon: 'ada', name: 'Cardano', symbol: 'ADA', price: 1.28, change: -1.92 }
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.setupIntersectionObserver();
    }
  }

  private setupIntersectionObserver() {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          element.classList.add('animate');
          console.log('Element animated:', element); // Debug-Log
          this.observer?.unobserve(element);
        }
      });
    }, options);
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      // Warte einen Moment, bis die View vollständig geladen ist
      setTimeout(() => {
        this.animatedElements?.forEach(({ nativeElement }) => {
          if (nativeElement) {
            console.log('Observing element:', nativeElement); // Debug-Log
            this.observer?.observe(nativeElement);
          }
        });
      }, 100);
    }
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
