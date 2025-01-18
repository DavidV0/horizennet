import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService } from '../../../shared/services/course.service';
import { Observable, switchMap, map, BehaviorSubject } from 'rxjs';
import { Course, Module, Lesson } from '../../../shared/models/course.model';
import { SafePipe } from '../../../shared/pipes/safe.pipe';

@Component({
  selector: 'app-lesson-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule,
    SafePipe
  ],
  template: `
    <div class="lesson-detail-container" *ngIf="lesson$ | async as lesson">
      <!-- Video Section -->
      <div class="video-section" *ngIf="lesson.videoUrl">
        <div class="video-container">
          <video 
            controls
            controlsList="nodownload" 
            preload="metadata"
            class="video-player"
            [src]="lesson.videoUrl | safe">
            <p>Ihr Browser unterstützt das Video-Tag nicht.</p>
          </video>
        </div>
      </div>

      <!-- Lesson Info -->
      <div class="lesson-info">
        <h1>{{lesson.title}}</h1>
        <p class="description">{{lesson.description}}</p>
      </div>

      <!-- Content Sections -->
      <div class="content-sections">
        <!-- Files Section -->
        <mat-expansion-panel *ngIf="lesson.files?.length">
          <mat-expansion-panel-header>
            <mat-panel-title>
              <mat-icon>attachment</mat-icon>
              Dateien
            </mat-panel-title>
          </mat-expansion-panel-header>
          
          <div class="files-list">
            <a *ngFor="let file of lesson.files" 
               [href]="file.url" 
               target="_blank" 
               class="file-item">
              <mat-icon>{{getFileIcon(file.type)}}</mat-icon>
              <span>{{file.name}}</span>
              <mat-icon class="download-icon">download</mat-icon>
            </a>
          </div>
        </mat-expansion-panel>

        <!-- Quiz Section -->
        <mat-expansion-panel *ngIf="lesson.quiz">
          <mat-expansion-panel-header>
            <mat-panel-title>
              <mat-icon>quiz</mat-icon>
              Quiz
            </mat-panel-title>
          </mat-expansion-panel-header>
          
          <div class="quiz-container">
            <h3>{{lesson.quiz.title}}</h3>
            <div class="questions">
              <div *ngFor="let question of lesson.quiz.questions; let i = index" class="question">
                <p class="question-text">{{i + 1}}. {{question.text}}</p>
                <div class="options">
                  <button mat-button 
                          *ngFor="let option of question.options; let j = index"
                          [class.selected]="selectedAnswers[i] === j"
                          (click)="selectAnswer(i, j)">
                    {{option}}
                  </button>
                </div>
              </div>
            </div>
            <button mat-flat-button 
                    color="primary" 
                    (click)="submitQuiz()"
                    [disabled]="!canSubmitQuiz()">
              Quiz abschließen
            </button>
          </div>
        </mat-expansion-panel>
      </div>

      <!-- Navigation -->
      <div class="lesson-navigation">
        <button mat-flat-button 
                color="accent" 
                (click)="nextLesson()"
                [disabled]="!hasNextLesson">
          <span>Nächste Lektion</span>
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./lesson-detail.component.scss']
})
export class LessonDetailComponent implements OnInit {
  lesson$!: Observable<Lesson>;
  selectedAnswers: number[] = [];
  hasNextLesson: boolean = false;
  private currentModule$ = new BehaviorSubject<Module | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService
  ) {}

  ngOnInit() {
    this.lesson$ = this.route.parent!.parent!.params.pipe(
      switchMap(params => this.courseService.getCourse(params['id'])),
      map(course => {
        const moduleId = this.route.snapshot.params['moduleId'];
        const lessonId = this.route.snapshot.params['lessonId'];
        const module = course.modules.find(m => m.id === moduleId);
        if (!module) throw new Error('Module not found');
        
        this.currentModule$.next(module);
        const lessonIndex = module.lessons.findIndex(l => l.id === lessonId);
        this.hasNextLesson = lessonIndex < module.lessons.length - 1;
        
        const lesson = module.lessons.find(l => l.id === lessonId);
        if (!lesson) throw new Error('Lesson not found');
        
        return lesson;
      })
    );
  }

  getFileIcon(type: string): string {
    switch (type) {
      case 'pdf': return 'picture_as_pdf';
      case 'doc':
      case 'docx': return 'description';
      case 'xls':
      case 'xlsx': return 'table_chart';
      case 'zip': return 'folder_zip';
      default: return 'insert_drive_file';
    }
  }

  selectAnswer(questionIndex: number, answerIndex: number) {
    this.selectedAnswers[questionIndex] = answerIndex;
  }

  canSubmitQuiz(): boolean {
    return this.selectedAnswers.length > 0 && this.selectedAnswers.every(answer => answer !== undefined);
  }

  submitQuiz() {
    // TODO: Implement quiz submission
    console.log('Quiz answers:', this.selectedAnswers);
  }

  nextLesson() {
    const courseId = this.route.parent!.parent!.snapshot.params['id'];
    const moduleId = this.route.snapshot.params['moduleId'];
    
    this.lesson$.subscribe(currentLesson => {
      const module = this.currentModule$.getValue();
      if (!module) return;
      
      const currentIndex = module.lessons.findIndex(lesson => lesson.id === currentLesson.id);
      if (currentIndex < module.lessons.length - 1) {
        const nextLesson = module.lessons[currentIndex + 1];
        this.router.navigate(['dashboard', 'courses', courseId, 'modules', moduleId, 'lessons', nextLesson.id]);
      }
    });
  }

  getEmbedUrl(url: string): string {
    return url;
  }

  isDirectVideoFile(url: string): boolean {
    return true;
  }

  getVideoMimeType(url: string): string {
    return 'video/mp4';
  }
} 