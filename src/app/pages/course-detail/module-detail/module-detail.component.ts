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
  template: `
    <div class="module-detail-container" *ngIf="module$ | async as module">
      <div class="module-header">
        <div class="module-image">
          <img [src]="module.image || 'assets/images/module-placeholder.jpg'" [alt]="module.title">
          <div class="module-overlay">
            <h2>Modul {{moduleIndex + 1}}</h2>
          </div>
        </div>
        <div class="module-info">
          <h1>{{module.title}}</h1>
          <p class="description">{{module.description}}</p>
        </div>
      </div>

      <div class="curriculum-section">
        <h2>Lehrplan</h2>
        
        <div class="next-lesson" *ngIf="!allLessonsCompleted">
          <button mat-flat-button color="warn" (click)="startNextLesson()">
            <span>Nächste Lektion beginnen</span>
            <mat-icon>chevron_right</mat-icon>
          </button>
          <span class="next-lesson-title">{{nextLesson()?.title}} ({{nextLesson()?.duration}})</span>
        </div>

        <div class="lessons-list">
          <div class="lesson-item" *ngFor="let lesson of module.lessons; let i = index">
            <div class="lesson-status">
              <mat-icon *ngIf="lesson.completed" class="completed">check_circle</mat-icon>
              <mat-icon *ngIf="!lesson.completed" class="pending">play_circle_outline</mat-icon>
            </div>
            <div class="lesson-content">
              <div class="lesson-info">
                <mat-icon>{{lesson.type === 'video' ? 'play_circle' : 'article'}}</mat-icon>
                <span class="lesson-title">{{lesson.title}} <span class="duration">({{lesson.duration}})</span></span>
              </div>
              <button mat-button color="primary" (click)="startLesson(lesson)" [disabled]="!canAccessLesson(i)">
                {{lesson.completed ? 'Wiederholen' : 'Starten'}}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
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
    // TODO: Implement proper lesson access logic
    return true; // For now, all lessons are accessible
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
} 