import { Component, OnInit, ViewChildren, QueryList, ElementRef, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BlogService } from '../../../shared/services/blog.service';
import { Blog } from '../../../shared/interfaces/blog.interface';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

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
export class BlogDetailComponent implements OnInit, AfterViewInit {
  @ViewChildren('animatedElement') animatedElements!: QueryList<ElementRef>;
  blog?: Blog;
  isLoading = true;
  error = false;
  private observer: IntersectionObserver | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private blogService: BlogService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    const blogId = this.route.snapshot.paramMap.get('id');
    if (blogId) {
      this.loadBlog(blogId);
    } else {
      this.router.navigate(['/blog']);
    }
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

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private async loadBlog(id: string) {
    try {
      this.isLoading = true;
      this.error = false;
      const blog = await this.blogService.getBlog(id);
      
      if (blog) {
        this.blog = blog;
      } else {
        this.error = true;
        this.router.navigate(['/blog']);
      }
    } catch (error) {
      this.error = true;
    } finally {
      this.isLoading = false;
    }
  }

  getContentClass(type: string): string {
    switch (type) {
      case 'paragraph':
        return 'blog-paragraph';
      case 'subheading':
        return 'blog-subheading';
      case 'quote':
        return 'blog-quote';
      case 'list':
        return 'blog-list';
      default:
        return '';
    }
  }
} 