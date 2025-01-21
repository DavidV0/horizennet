import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CourseService } from '../../shared/services/course.service';
import { Course, Module } from '../../shared/models/course.model';
import { Observable, switchMap, map, catchError, EMPTY } from 'rxjs';
import { ProgressService } from '../../shared/services/progress.service';
import { CourseProgress } from '../../shared/models/progress.model';

interface ModuleWithProgress extends Module {
  image?: string;
  isUnlocked: boolean;
}

interface CourseWithModules extends Course {
  modules: ModuleWithProgress[];
}

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    RouterModule
  ],
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.scss']
})
export class CourseDetailComponent implements OnInit {
  course$!: Observable<CourseWithModules>;
  courseProgress$!: Observable<CourseProgress>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private progressService: ProgressService
  ) {}

  ngOnInit() {
    const courseId = this.route.snapshot.params['courseId'];
    if (!courseId) return;

    this.courseProgress$ = this.progressService.getCourseProgress(courseId);

    this.course$ = this.courseService.getCourse(courseId).pipe(
      map(course => {
        if (!course) throw new Error('Course not found');
        
        return {
          ...course,
          modules: course.modules?.map((module, index) => ({
            ...module,
            image: `assets/images/module-${index + 1}.jpg`,
            isUnlocked: index === 0
          })) || []
        };
      }),
      catchError(error => {
        console.error('Error loading course:', error);
        this.router.navigate(['/dashboard/courses']);
        return EMPTY;
      })
    );
  }

  calculateModuleProgress(moduleId: string): Observable<number> {
    return this.courseProgress$.pipe(
      map(progress => progress?.modules[moduleId]?.progress || 0)
    );
  }

  startModule(module: ModuleWithProgress) {
    if (!module.isUnlocked) return;
    
    const courseId = this.route.snapshot.params['courseId'];
    if (courseId) {
      if (module.lessons && module.lessons.length > 0) {
        this.router.navigate([
          '/dashboard',
          'courses', 
          courseId, 
          'modules', 
          module.id,
          'lessons',
          module.lessons[0].id
        ]);
      } else {
        this.router.navigate([
          '/dashboard',
          'courses', 
          courseId, 
          'modules', 
          module.id
        ]);
      }
    }
  }

  getLessonCount(module: any): number {
    return module.lessons?.length || 0;
  }
} 