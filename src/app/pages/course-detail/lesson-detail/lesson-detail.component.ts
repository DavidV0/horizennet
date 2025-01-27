import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService } from '../../../shared/services/course.service';
import { Observable, switchMap, map, BehaviorSubject, take, combineLatest } from 'rxjs';
import { Course, Module, Lesson, Question } from '../../../shared/models/course.model';
import { SafePipe } from '../../../shared/pipes/safe.pipe';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from '../../../shared/services/auth.service';
import { UserService } from '../../../shared/services/user.service';

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
  selectedAnswers: { [key: number]: number[] } = {};
  quizSubmitted = false;
  quizResult: QuizResult | null = null;
  private currentModule$ = new BehaviorSubject<Module | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private firestore: AngularFirestore,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.lesson$ = combineLatest([
      this.route.parent!.parent!.params,
      this.route.params
    ]).pipe(
      switchMap(([parentParams, routeParams]) => {
        return this.courseService.getCourse(parentParams['id']).pipe(
          map(course => {
            const moduleId = routeParams['moduleId'];
            const lessonId = routeParams['lessonId'];
            
            const module = course.modules.find(m => m.id === moduleId);
            if (!module) throw new Error('Module not found');
            
            this.currentModule$.next(module);
            const lesson = module.lessons.find(l => l.id === lessonId);
            if (!lesson) throw new Error('Lesson not found');
            
            return lesson;
          })
        );
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

  submitQuiz() {
    this.lesson$.pipe(take(1)).subscribe(lesson => {
      if (!lesson.quiz) return;

      const result: QuizResult = {
        totalQuestions: lesson.quiz.questions.length,
        correctCount: 0,
        correctIndices: [],
        wrongIndices: []
      };

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
        }
      });

      this.quizResult = result;
      this.quizSubmitted = true;

      if (this.quizResult.correctCount === this.quizResult.totalQuestions) {
        this.onQuizCompleted();
      }
    });
  }

  resetQuiz() {
    this.selectedAnswers = {};
    this.quizSubmitted = false;
    this.quizResult = null;
  }

  nextLesson() {
    const courseId = this.route.parent!.parent!.snapshot.params['id'];
    const moduleId = this.route.snapshot.params['moduleId'];
    
    this.lesson$.pipe(take(1)).subscribe(currentLesson => {
      const module = this.currentModule$.getValue();
      if (!module) return;
      
      const currentIndex = module.lessons.findIndex(lesson => lesson.id === currentLesson.id);
      if (currentIndex < module.lessons.length - 1) {
        this.resetQuiz();
        
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

  hasNextLesson(): boolean {
    const module = this.currentModule$.getValue();
    if (!module) return false;
    
    const currentLessonId = this.route.snapshot.params['lessonId'];
    const currentIndex = module.lessons.findIndex(lesson => lesson.id === currentLessonId);
    
    return currentIndex < module.lessons.length - 1;
  }

  backToModule() {
    const courseId = this.route.parent!.parent!.snapshot.params['id'];
    const moduleId = this.route.snapshot.params['moduleId'];
    this.router.navigate(['dashboard', 'courses', courseId, 'modules', moduleId]);
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

  async onVideoCompleted() {
    try {
      await this.completeLesson();
    } catch (error) {
      console.error('Error completing lesson:', error);
    }
  }

  async completeLesson() {
    const courseId = this.route.parent!.parent!.snapshot.params['id'];
    const moduleId = this.route.parent!.snapshot.params['moduleId'];
    const lessonId = this.route.snapshot.params['lessonId'];

    this.userService.markLessonAsCompleted(courseId, moduleId, lessonId, 'video')
      .subscribe({
        error: (error) => console.error('Error completing lesson:', error)
      });
  }

  async onQuizCompleted() {
    const courseId = this.route.parent!.parent!.snapshot.params['id'];
    const moduleId = this.route.parent!.snapshot.params['moduleId'];
    const lessonId = this.route.snapshot.params['lessonId'];

    this.userService.markLessonAsCompleted(courseId, moduleId, lessonId, 'quiz')
      .subscribe({
        error: (error) => console.error('Error completing quiz:', error)
      });
  }
} 