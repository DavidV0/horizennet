import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService } from '../../../shared/services/course.service';
import { Observable, switchMap, map, BehaviorSubject, combineLatest } from 'rxjs';
import { Course, Module, Lesson } from '../../../shared/models/course.model';
import { ProgressService } from '../../../shared/services/progress.service';
import { CourseProgress } from '../../../shared/models/progress.model';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-module-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    RouterModule
  ],
  templateUrl: './module-detail.component.html',
  styleUrls: ['./module-detail.component.scss']
})
export class ModuleDetailComponent implements OnInit {
  module$!: Observable<Module>;
  moduleProgress$!: Observable<CourseProgress>;
  moduleIndex: number = 0;
  allLessonsCompleted: boolean = false;
  private currentModule = new BehaviorSubject<Module | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private progressService: ProgressService
  ) {}

  ngOnInit() {
    const courseId = this.route.parent!.parent!.snapshot.params['courseId'];
    const moduleId = this.route.snapshot.params['moduleId'];

    if (courseId && moduleId) {
      this.moduleProgress$ = this.progressService.getCourseProgress(courseId);

      this.module$ = this.courseService.getCourse(courseId).pipe(
        map(course => {
          if (!course) throw new Error('Course not found');
          
          const module = course.modules.find(m => m.id === moduleId);
          if (!module) throw new Error('Module not found');
          
          this.moduleIndex = course.modules.findIndex(m => m.id === moduleId);
          this.allLessonsCompleted = module.lessons.every(lesson => lesson.completed);
          this.currentModule.next(module);
          
          return module;
        })
      );

      // Subscribe to handle errors
      this.module$.subscribe({
        error: (error) => {
          console.error('Error loading module:', error);
          // Optional: Navigate back to course detail
          this.router.navigate(['../../'], { relativeTo: this.route });
        }
      });
    } else {
      // Navigate back if no IDs
      this.router.navigate(['/dashboard/courses']);
    }
  }

  nextLesson(): Lesson | undefined {
    const module = this.currentModule.getValue();
    if (!module) return undefined;
    return module.lessons.find(lesson => !lesson.completed);
  }

  canAccessLesson(moduleId: string, lessonIndex: number): Observable<boolean> {
    return combineLatest([
      this.module$,
      this.moduleProgress$
    ]).pipe(
      map(([module, progress]) => {
        // Erste Lektion ist immer zugänglich
        if (lessonIndex === 0) return true;
        
        // Prüfe ob vorherige Lektion abgeschlossen
        const moduleProgress = progress.modules[moduleId];
        const previousLessonId = module.lessons[lessonIndex - 1].id;
        return moduleProgress?.lessons[previousLessonId]?.completed || false;
      })
    );
  }

  getLessonProgress(moduleId: string, lessonId: string): Observable<boolean> {
    return this.moduleProgress$.pipe(
      map(progress => progress.modules[moduleId]?.lessons[lessonId]?.completed || false)
    );
  }

  startModule(module: Module) {
    const courseId = this.route.parent!.parent!.snapshot.params['courseId'];
    if (courseId && module.id) {
      // Wenn es Lektionen gibt, zur ersten Lektion navigieren
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
      }
    }
  }

  startLesson(lesson: Lesson) {
    const courseId = this.route.snapshot.paramMap.get('courseId');
    const moduleId = this.route.snapshot.paramMap.get('moduleId');
    
    console.log('Starting lesson with params:', { courseId, moduleId, lessonId: lesson.id });
    
    if (courseId && moduleId) {
      this.router.navigate([
        '/dashboard',
        'courses',
        courseId,
        'modules',
        moduleId,
        'lessons',
        lesson.id
      ]);
    }
  }

  startNextLesson() {
    const nextLesson = this.nextLesson();
    if (nextLesson) this.startLesson(nextLesson);
  }

  backToCourse() {
    const courseId = this.route.parent!.parent!.snapshot.params['courseId'];
    if (courseId) {
      this.router.navigate(['/dashboard', 'courses', courseId]);
    }
  }
} 