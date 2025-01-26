import { Component, OnInit, OnDestroy, ViewChildren, ViewChild, QueryList, ElementRef, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { BlogService } from '../../shared/services/blog.service';
import { Blog } from '../../shared/interfaces/blog.interface';
import { Subscription } from 'rxjs';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    RouterModule
  ]
})
export class BlogComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('headerElement') headerElement?: ElementRef;
  @ViewChildren('blogElement') blogElements!: QueryList<ElementRef>;
  @ViewChild('blogElement') blogElement?: ElementRef;
  blogs: Blog[] = [];
  private subscription?: Subscription;
  private observer: IntersectionObserver | null = null;

  constructor(
    private blogService: BlogService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.loadBlogs();
  }

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
          requestAnimationFrame(() => {
            entry.target.classList.add('animate');
          });
        }
      });
    }, options);

    // Header Animation
    if (this.headerElement?.nativeElement) {
      this.observer.observe(this.headerElement.nativeElement);
    }

    // Blog Cards Animation
    setTimeout(() => {
      this.blogElements?.forEach(({ nativeElement }) => {
        if (this.observer) {
          this.observer.observe(nativeElement);
        }
      });
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private loadBlogs(): void {
    this.subscription = this.blogService.getAllBlogs().subscribe({
      next: (blogs) => {
        if (!blogs) {
          this.blogs = [];
          return;
        }
        
        try {
          this.blogs = blogs.sort((a, b) => {
            if (!a.date || !b.date) {
              return 0;
            }
            const dateA = new Date(this.convertGermanDate(a.date));
            const dateB = new Date(this.convertGermanDate(b.date));
            return dateB.getTime() - dateA.getTime();
          });
        } catch (error) {
          this.blogs = blogs;
        }
      },
      error: () => {
        this.blogs = [];
      }
    });
  }

  private convertGermanDate(germanDate: string): string {
    const [day, month, year] = germanDate.split('.');
    return `${year}-${month}-${day}`;
  }

  getExcerpt(text: string, maxLength: number = 150): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  formatDate(dateStr: string): string {
    try {
      if (!dateStr) return '';
      
      if (dateStr.includes('März') || dateStr.includes('Mai') || 
          dateStr.includes('Juni') || dateStr.includes('Juli') || 
          dateStr.includes('Januar') || dateStr.includes('Februar') || 
          dateStr.includes('April') || dateStr.includes('August') || 
          dateStr.includes('September') || dateStr.includes('Oktober') || 
          dateStr.includes('November') || dateStr.includes('Dezember')) {
        return dateStr;
      }

      const [day, month, year] = dateStr.split('.');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      return new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return dateStr;
    }
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'assets/images/placeholder-blog.jpg';
    }
  }

  navigateToBlogDetail(blog: Blog): void {
    if (blog && blog.id) {
      this.router.navigate(['/blog', blog.id]).then(() => {
        window.scrollTo(0, 0);
      });
    }
  }
}
