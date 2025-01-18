import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CourseService } from '../../shared/services/course.service';
import { Course } from '../../shared/models/course.model';
import { Observable, tap, catchError, of } from 'rxjs';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatListModule,
    MatProgressBarModule
  ],
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.scss']
})
export class CoursesComponent implements OnInit {
  courses$!: Observable<Course[]>;
  isLoading = true;

  constructor(private courseService: CourseService) {}

  ngOnInit() {
    this.courses$ = this.courseService.getCourses('USER').pipe(
      tap(courses => {
        console.log('Loaded courses:', courses);
        this.isLoading = false;
      }),
      catchError(error => {
        console.error('Error loading courses:', error);
        this.isLoading = false;
        return of([]);
      })
    );
  }
} 