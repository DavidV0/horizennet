import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService } from '../../../shared/services/course.service';
import { Observable, switchMap, map, BehaviorSubject } from 'rxjs';
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
export class ModuleDetailComponent implements OnInit {
  module$!: Observable<Module>;
  moduleIndex: number = 0;
  allLessonsCompleted: boolean = false;
  private currentModule = new BehaviorSubject<Module | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService
  ) {}

  ngOnInit() {
    this.module$ = this.route.parent!.params.pipe(
      switchMap(params => this.courseService.getCourse(params['id'])),
      map(course => {
        const moduleId = this.route.snapshot.params['moduleId'];
        const module = course.modules.find(m => m.id === moduleId);
        this.moduleIndex = course.modules.findIndex(m => m.id === moduleId);
        if (!module) throw new Error('Module not found');
        this.allLessonsCompleted = module.lessons.every(lesson => lesson.completed);
        this.currentModule.next(module);
        return module;
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