import { Component, ViewChildren, QueryList, ElementRef, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

interface TeamMember {
  name: string;
  position: string;
  image: string;
}

@Component({
  selector: 'app-ueber-uns',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  templateUrl: './ueber-uns.component.html',
  styleUrls: ['./ueber-uns.component.scss']
})
export class UeberUnsComponent implements AfterViewInit {
  @ViewChildren('animatedElement') animatedElements!: QueryList<ElementRef>;
  
  private observer: IntersectionObserver | null = null;
  
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

  features = [
    {
      icon: 'rocket',
      title: 'Möglich Macher',
      description: 'Wir verwirklichen Visionen und schaffen greifbare Ergebnisse.'
    },
    {
      icon: 'school',
      title: 'Wissensvermittler',
      description: 'Wir teilen wertvolles Wissen, das Leben nachhaltig verändert.'
    },
    {
      icon: 'handshake',
      title: 'Zuverlässlicher Partner',
      description: 'Auf uns können Sie sich jederzeit verlassen – Ihr Erfolg ist unser Ziel.'
    },
    {
      icon: 'groups',
      title: 'Ambitioniertes Team',
      description: 'Gemeinsam streben wir nach Exzellenz und grenzenlosem Wachstum.'
    }
  ];

  teamMembers: TeamMember[] = [
    {
      name: 'Erdem Yildirim',
      position: 'CEO',
      image: 'assets/HorizonNet_tHwL.png'
    },
    {
      name: 'Patryk Mazur',
      position: 'COO',
      image: 'assets/HorizonNet_tHwL.png'
    },
    {
      name: 'Tim Otterle',
      position: 'CMO',
      image: 'assets/HorizonNet_tHwL.png'
    },
    {
      name: 'Adrian Haker',
      position: 'WebDev & externer CTO',
      image: 'assets/HorizonNet_tHwL.png'
    },
    {
      name: 'Manuel Rosenberger',
      position: 'Sales Manager',
      image: 'assets/HorizonNet_tHwL.png'
    },
    {
      name: 'Simon Enzmüller',
      position: 'Sales Manager',
      image: 'assets/HorizonNet_tHwL.png'
    },
    {
      name: 'Robin Berger',
      position: 'Vertriebspartner',
      image: 'assets/HorizonNet_tHwL.png'
    },
    {
      name: 'Sarah Krzevac',
      position: 'Vertriebspartner',
      image: 'assets/HorizonNet_tHwL.png'
    },
    {
      name: 'John Bamoura',
      position: 'Vertriebspartner',
      image: 'assets/HorizonNet_tHwL.png'
    },
    {
      name: 'Roman Horozov',
      position: 'Vertriebspartner',
      image: 'assets/HorizonNet_tHwL.png'
    }
  ];
}
