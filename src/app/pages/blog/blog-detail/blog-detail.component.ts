import { Component, ViewChildren, QueryList, ElementRef, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    RouterModule
  ],
  templateUrl: './blog-detail.component.html',
  styleUrls: ['./blog-detail.component.scss']
})
export class BlogDetailComponent implements AfterViewInit {
  @ViewChildren('animatedElement') animatedElements!: QueryList<ElementRef>;
  
  private observer: IntersectionObserver | null = null;

  blogPost = {
    category: 'Krypto',
    title: 'Von 0 auf 100k€: Eine Krypto Erfolgsgeschichte',
    date: '15. März 2024',
    readTime: '5 min read',
    image: 'assets/images/blog/crypto-success.jpg',
    content: [
      {
        type: 'paragraph',
        text: 'Der Weg zum Erfolg im Krypto-Trading ist oft von Herausforderungen geprägt. In dieser inspirierenden Geschichte teilt eines unserer Mitglieder seine Reise vom Anfänger zum erfolgreichen Trader.'
      },
      {
        type: 'subheading',
        text: 'Die Anfänge'
      },
      {
        type: 'paragraph',
        text: 'Wie viele andere begann auch Michael (Name geändert) seine Krypto-Reise mit minimalen Kenntnissen über digitale Währungen. "Ich hatte von Bitcoin gehört und wusste, dass viele damit Geld verdienen, aber mir fehlte das grundlegende Verständnis für die Technologie und die Märkte", erinnert er sich.'
      },
      {
        type: 'quote',
        text: 'Der wichtigste Schritt war zu erkennen, dass ich professionelle Unterstützung und eine strukturierte Ausbildung brauchte.'
      },
      {
        type: 'subheading',
        text: 'Der Wendepunkt'
      },
      {
        type: 'paragraph',
        text: 'Nach mehreren Fehlversuchen und Verlusten entschied sich Michael für eine professionelle Ausbildung bei HorizonNet. "Die Kombination aus theoretischem Wissen und praktischer Anwendung war genau das, was ich brauchte. Besonders wertvoll waren die Live-Trading-Sessions und der direkte Austausch mit erfahrenen Tradern."'
      },
      {
        type: 'subheading',
        text: 'Strategien und Techniken'
      },
      {
        type: 'paragraph',
        text: 'Im Laufe seiner Ausbildung lernte Michael die wichtigsten Prinzipien des erfolgreichen Tradings:'
      },
      {
        type: 'list',
        items: [
          'Risikomanagement als oberste Priorität',
          'Technische Analyse und Chart-Patterns',
          'Psychologische Aspekte des Tradings',
          'Timing und Marktzyklen'
        ]
      }
    ]
  };

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
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
        }
      });
    }, options);

    setTimeout(() => {
      this.animatedElements?.forEach(({ nativeElement }) => {
        if (this.observer) {
          this.observer.observe(nativeElement);
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