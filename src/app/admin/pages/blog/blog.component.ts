import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { BlogService } from '../../../shared/services/blog.service';
import { Blog } from '../../../shared/interfaces/blog.interface';
import { Subscription } from 'rxjs';
import { BlogDialogComponent } from '../../components/blog-dialog/blog-dialog.component';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.scss']
})
export class BlogComponent implements OnInit, OnDestroy {
  dataSource = new MatTableDataSource<Blog>([]);
  displayedColumns: string[] = ['image', 'title', 'category', 'date', 'actions'];
  private subscription?: Subscription;

  constructor(
    private blogService: BlogService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadBlogs();
  }

  private loadBlogs(): void {
    this.subscription = this.blogService.getAllBlogs().subscribe({
      next: (blogs) => {
        this.dataSource.data = blogs;
      },
      error: (error) => {
        console.error('Error loading blogs:', error);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async onDelete(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this blog post?')) {
      try {
        await this.blogService.deleteBlog(id);
        this.loadBlogs();
      } catch (error) {
        console.error('Error deleting blog:', error);
      }
    }
  }

  onEdit(blog: Blog): void {
    const dialogRef = this.dialog.open(BlogDialogComponent, {
      width: '800px',
      data: { blog }
    });

    dialogRef.afterClosed().subscribe(async (result: Blog) => {
      if (result) {
        try {
          await this.blogService.updateBlog(result.id, result);
          this.loadBlogs();
        } catch (error) {
          console.error('Error updating blog:', error);
        }
      }
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(BlogDialogComponent, {
      width: '800px',
      data: { blog: null }
    });

    dialogRef.afterClosed().subscribe(async (result: Blog) => {
      if (result) {
        try {
          await this.blogService.createBlog(result);
          this.loadBlogs();
        } catch (error) {
          console.error('Error creating blog:', error);
        }
      }
    });
  }
}
