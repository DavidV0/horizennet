import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CourseService } from '../../shared/services/course.service';
import { CourseAccessService } from '../../shared/services/course-access.service';
import { Course } from '../../shared/models/course.model';
import { Observable, combineLatest, map, tap, catchError, of } from 'rxjs';
import { Router } from '@angular/router';

interface CourseWithAccess extends Course {
  hasAccess: boolean;
}

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
    MatProgressBarModule,
    MatTooltipModule
  ],
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.scss']
})
export class CoursesComponent implements OnInit {
  courses$!: Observable<CourseWithAccess[]>;
  isLoading = true;

  constructor(
    private courseService: CourseService, 
    private courseAccessService: CourseAccessService,
    private router: Router
  ) {}

  ngOnInit() {
    const courses$ = this.courseService.getCourses('USER');
    const userCourses$ = this.courseAccessService.getUserCourses();

    this.courses$ = combineLatest([courses$, userCourses$]).pipe(
      map(([courses, userCourses]) => {
        return courses.map(course => ({
          ...course,
          hasAccess: userCourses.includes(course.id)
        }));
      }),
      tap(() => {
        this.isLoading = false;
      }),
      catchError(error => {
        console.error('Error loading courses:', error);
        this.isLoading = false;
        return of([]);
      })
    );
  }

  startCourse(course: CourseWithAccess) {
    if (!course.hasAccess) {
      this.router.navigate(['/shop']);
      return;
    }
    this.router.navigate(['/dashboard/courses', course.id]);
  }
} 