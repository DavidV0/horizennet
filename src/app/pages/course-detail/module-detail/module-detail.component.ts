import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { CourseService } from '../../../shared/services/course.service';
import { UserService } from '../../../shared/services/user.service';
import { Observable, switchMap, map, BehaviorSubject, filter, Subscription, combineLatest } from 'rxjs';
import { Course, Module, Lesson } from '../../../shared/models/course.model';

@Component({
  selector: 'app-module-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './module-detail.component.html',
  styleUrls: ['./module-detail.component.scss']
})
export class ModuleDetailComponent implements OnInit, OnDestroy {
  module$!: Observable<Module>;
  moduleIndex: number = 0;
  allLessonsCompleted: boolean = false;
  moduleProgress$!: Observable<number>;
  private currentModule = new BehaviorSubject<Module | null>(null);
  private routerSubscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private userService: UserService
  ) {}

  ngOnInit() {
    const courseId = this.route.parent!.parent!.snapshot.params['id'];
    const moduleId = this.route.snapshot.params['moduleId'];

    // Fortschritt laden
    this.moduleProgress$ = this.userService.getModuleProgress(courseId, moduleId);

    // Initial load
    this.loadModule(courseId, moduleId);

    // Subscribe to router events to refresh on navigation
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.loadModule(courseId, moduleId);
    });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private loadModule(courseId: string, moduleId: string) {
    this.module$ = combineLatest([
      this.courseService.getCourse(courseId),
      this.moduleProgress$
    ]).pipe(
      switchMap(([course, progress]) => {
        const module = course.modules.find(m => m.id === moduleId);
        if (!module) throw new Error('Module not found');
        this.moduleIndex = course.modules.findIndex(m => m.id === moduleId);
        this.allLessonsCompleted = progress === 100;

        // Für jede Lektion den Fortschritt laden
        const lessonProgressObservables = module.lessons.map(lesson =>
          this.userService.getLessonProgress(courseId, moduleId, lesson.id)
        );

        return combineLatest([...lessonProgressObservables]).pipe(
          map(lessonProgresses => {
            // Lesson completed Status aktualisieren
            module.lessons = module.lessons.map((lesson, index) => ({
              ...lesson,
              completed: lessonProgresses[index]
            }));
            this.currentModule.next(module);
            return module;
          })
        );
      })
    );
  }

  nextLesson(): Lesson | undefined {
    const module = this.currentModule.getValue();
    return module?.lessons.find(lesson => !lesson.completed);
  }

  canAccessLesson(index: number): boolean {
    return true; // All lessons are freely accessible
  }

  startLesson(lesson: Lesson) {
    const courseId = this.route.parent!.parent!.snapshot.params['id'];
    const moduleId = this.route.snapshot.params['moduleId'];
    this.router.navigate(['dashboard', 'courses', courseId, 'modules', moduleId, 'lessons', lesson.id]);
  }

  startNextLesson() {
    const nextLesson = this.nextLesson();
    if (nextLesson) this.startLesson(nextLesson);
  }

  backToCourse() {
    const courseId = this.route.parent!.parent!.snapshot.params['id'];
    this.router.navigate(['dashboard', 'courses', courseId]);
  }
} 