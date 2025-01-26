import { Component, OnInit, OnDestroy, ViewChildren, QueryList, ElementRef, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BlogService } from '../../../shared/services/blog.service';
import { Blog } from '../../../shared/interfaces/blog.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-blog-detail',
  templateUrl: './blog-detail.component.html',
  styleUrls: ['./blog-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    RouterModule
  ]
})
export class BlogDetailComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChildren('animatedElement') animatedElements!: QueryList<ElementRef>;
  blog?: Blog;
  isLoading = true;
  error = false;
  private subscription?: Subscription;
  private observer: IntersectionObserver | null = null;

  constructor(
    private blogService: BlogService,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.loadBlog();
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

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private loadBlog(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.handleError();
      return;
    }

    this.subscription = this.blogService.getBlog(id).subscribe({
      next: (blog) => {
        if (blog) {
          this.blog = blog;
          if (!blog.content || !Array.isArray(blog.content)) {
            this.handleError();
            return;
          }
          this.isLoading = false;
        } else {
          this.handleError();
        }
      },
      error: () => {
        this.handleError();
      }
    });
  }

  private handleError(): void {
    this.error = true;
    this.isLoading = false;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    
    try {
      if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
        return dateStr;
      }

      const [day, month, year] = dateStr.split('.');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      if (isNaN(date.getTime())) {
        return dateStr;
      }

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

  navigateBack(): void {
    this.router.navigate(['/blog'], {
      preserveFragment: true,
      state: { scrollToTop: false }
    });
  }
} 