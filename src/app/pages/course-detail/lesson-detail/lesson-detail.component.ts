import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService } from '../../../shared/services/course.service';
import { Observable, switchMap, map, BehaviorSubject, take, combineLatest, catchError, EMPTY } from 'rxjs';
import { Course, Module, Lesson, Question } from '../../../shared/models/course.model';
import { SafePipe } from '../../../shared/pipes/safe.pipe';
import { ProgressService } from '../../../shared/services/progress.service';

interface QuizResult {
  totalQuestions: number;
  correctCount: number;  // Anzahl der richtigen Antworten
  correctIndices: number[];  // Indizes der richtigen Antworten
  wrongIndices: number[];    // Indizes der falschen Antworten
}

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
  templateUrl: './lesson-detail.component.html',
  styleUrls: ['./lesson-detail.component.scss']
})
export class LessonDetailComponent implements OnInit {
  lesson$!: Observable<Lesson>;
  lessonProgress$!: Observable<boolean>;
  selectedAnswers: { [key: number]: number[] } = {};
  quizSubmitted = false;
  quizResult: QuizResult | null = null;
  private currentModule$ = new BehaviorSubject<Module | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private progressService: ProgressService
  ) {}

  ngOnInit() {
    // Parameter direkt aus der Route holen
    const courseId = this.route.snapshot.paramMap.get('courseId');
    const moduleId = this.route.snapshot.paramMap.get('moduleId');
    const lessonId = this.route.snapshot.paramMap.get('lessonId');

    console.log('Route parameters:', { courseId, moduleId, lessonId });

    if (courseId && moduleId && lessonId) {
      // Fortschritt laden
      this.lessonProgress$ = this.progressService.getCourseProgress(courseId).pipe(
        map(progress => {
          if (!progress?.modules || !progress.modules[moduleId]?.lessons) return false;
          return progress.modules[moduleId].lessons[lessonId]?.completed || false;
        })
      );

      // Lektion laden
      this.lesson$ = this.courseService.getCourse(courseId).pipe(
        map(course => {
          if (!course) throw new Error('Course not found');
          
          const module = course.modules.find(m => m.id === moduleId);
          if (!module) throw new Error('Module not found');
          
          this.currentModule$.next(module);
          
          const lesson = module.lessons.find(l => l.id === lessonId);
          if (!lesson) throw new Error('Lesson not found');
          
          return lesson;
        })
      );
    } else {
      console.error('Missing required parameters:', { courseId, moduleId, lessonId });
      this.router.navigate(['/dashboard/courses']);
    }
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
    if (!this.selectedAnswers[questionIndex]) {
      this.selectedAnswers[questionIndex] = [];
    }

    const answers = this.selectedAnswers[questionIndex];
    const index = answers.indexOf(answerIndex);

    if (index === -1) {
      answers.push(answerIndex);
    } else {
      answers.splice(index, 1);
    }

    console.log('Selected answers after update:', this.selectedAnswers);
  }

  isAnswerSelected(questionIndex: number, answerIndex: number): boolean {
    return this.selectedAnswers[questionIndex]?.includes(answerIndex) || false;
  }

  canSubmitQuiz(): boolean {
    return Object.keys(this.selectedAnswers).length > 0;
  }

  getCorrectAnswersText(question: Question): string {
    if (!question.correctAnswers || question.correctAnswers.length === 0) return 'Falsch';
    return question.correctAnswers.length === 1 ? 'Falsch' : 'Falsch';
  }

  private getRouteParams(): { courseId: string, moduleId: string, lessonId: string } | null {
    const courseId = this.route.snapshot.paramMap.get('courseId');
    const moduleId = this.route.snapshot.paramMap.get('moduleId');
    const lessonId = this.route.snapshot.paramMap.get('lessonId');

    if (!courseId || !moduleId || !lessonId) {
      return null;
    }

    return { courseId, moduleId, lessonId };
  }

  submitQuiz() {
    this.lesson$.pipe(take(1)).subscribe(lesson => {
      if (!lesson.quiz) return;

      const result: QuizResult = {
        totalQuestions: lesson.quiz.questions.length,
        correctCount: 0,
        correctIndices: [],
        wrongIndices: []
      };

      let allCorrect = true;

      lesson.quiz.questions.forEach((question, index) => {
        const selected = this.selectedAnswers[index] || [];
        const correct = question.correctAnswers || [];
        
        const isCorrect = 
          selected.length === correct.length &&
          selected.every(answer => correct.includes(answer));

        if (isCorrect) {
          result.correctCount++;
          result.correctIndices.push(index);
        } else {
          result.wrongIndices.push(index);
          allCorrect = false;
        }
      });

      if (allCorrect) {
        const params = this.getRouteParams();
        if (params) {
          this.progressService.saveLessonProgress(params.courseId, params.moduleId, params.lessonId, true)
            .subscribe(() => {
              this.quizResult = result;
              this.quizSubmitted = true;
            });
        }
      } else {
        this.quizResult = result;
        this.quizSubmitted = true;
      }
    });
  }

  resetQuiz() {
    this.selectedAnswers = {};
    this.quizSubmitted = false;
    this.quizResult = null;
  }

  nextLesson() {
    const params = this.getRouteParams();
    if (!params) {
      console.error('Missing required route parameters');
      return;
    }

    this.lesson$.pipe(take(1)).subscribe({
      next: currentLesson => {
        const module = this.currentModule$.getValue();
        if (!module) {
          console.error('No current module found');
          return;
        }
        
        const currentIndex = module.lessons.findIndex(lesson => lesson.id === currentLesson.id);
        if (currentIndex < module.lessons.length - 1) {
          this.resetQuiz();
          
          const nextLesson = module.lessons[currentIndex + 1];
          this.router.navigate([
            '/dashboard',
            'courses',
            params.courseId,
            'modules',
            params.moduleId,
            'lessons',
            nextLesson.id
          ]);
        }
      },
      error: (error) => {
        console.error('Error navigating to next lesson:', error);
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

  hasNextLesson(): boolean {
    const module = this.currentModule$.getValue();
    if (!module) return false;
    
    const lessonId = this.route.snapshot.paramMap.get('lessonId');
    if (!lessonId) return false;
    
    const currentIndex = module.lessons.findIndex(lesson => lesson.id === lessonId);
    return currentIndex < module.lessons.length - 1;
  }

  backToModule() {
    const courseId = this.route.snapshot.paramMap.get('courseId');
    const moduleId = this.route.snapshot.paramMap.get('moduleId');
    
    if (courseId && moduleId) {
      this.router.navigate([
        '/dashboard',
        'courses',
        courseId,
        'modules',
        moduleId
      ]);
    }
  }

  downloadFile(file: { url: string, name: string }) {
    // Fetch the file and create a blob
    fetch(file.url)
      .then(response => response.blob())
      .then(blob => {
        // Create a blob URL
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Create link and trigger download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      });
  }

  completeLesson() {
    const params = this.getRouteParams();
    if (!params) {
      console.error('Missing required route parameters');
      return;
    }

    console.log('Marking lesson as complete:', params);
    this.progressService.saveLessonProgress(params.courseId, params.moduleId, params.lessonId, true)
      .subscribe({
        next: () => {
          console.log('Lesson marked as complete');
          if (this.hasNextLesson()) {
            this.nextLesson();
          }
        },
        error: (error) => {
          console.error('Error marking lesson as complete:', error);
        }
      });
  }
} 