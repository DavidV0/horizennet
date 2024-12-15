import { Component, ElementRef, ViewChildren, QueryList, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-stats-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-section.component.html',
  styleUrls: ['./stats-section.component.scss']
})
export class StatsSectionComponent implements AfterViewInit {
  @ViewChildren('animatedElement') animatedElements!: QueryList<ElementRef>;
  
  private observer: IntersectionObserver | null = null;
  private isBrowser: boolean;

  readonly stats = [
    {
      number: 'No. 1',
      label: 'CONSULTING PARTNER'
    },
    {
      number: 'alle 60 Min.',
      label: 'EIN NEUER ZUFRIEDENER KUNDE'
    },
    {
      number: '100 Gründe',
      label: 'FÜR DIE KOOPERATION MIT UNS'
    },
    {
      number: '9',
      label: 'WEGE ZU DEN ERSTEN MIO. €'
    }
  ];

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit() {
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
          entry.target.classList.add('animate');
          this.observer?.unobserve(entry.target);
        }
      });
    }, options);

    setTimeout(() => {
      this.animatedElements?.forEach(({ nativeElement }) => {
        if (nativeElement) {
          this.observer?.observe(nativeElement);
        }
      });
    }, 100);
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
} 