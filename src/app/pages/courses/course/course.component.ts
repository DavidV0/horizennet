import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CourseService } from '../../../shared/services/course.service';
import { Course } from '../../../shared/models/course.model';
import { ProgressService } from '../../../shared/services/progress.service';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-course',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
  ],
  templateUrl: './course.component.html',
  styleUrls: ['./course.component.scss']
})
export class CourseComponent implements OnInit {
  course: Course | null = null;
  currentModuleIndex: number = 0;
  currentLessonIndex: number = 0;
  hasProgress$: Observable<boolean>;
  private lastLesson$ = new BehaviorSubject<{moduleId: string, lessonId: string} | null>(null);

  constructor(
    private courseService: CourseService,
    private router: Router,
    private route: ActivatedRoute,
    private progressService: ProgressService
  ) {
    // Verschiebe die Initialisierung in ngOnInit
  }

  ngOnInit() {
    const courseId = this.route.snapshot.params['id'];
    if (courseId) {
      // Initialisiere den Fortschritt
      this.hasProgress$ = this.progressService.getLastAccessedLesson(courseId).pipe(
        map(lastLesson => {
          if (lastLesson) {
            this.lastLesson$.next(lastLesson);
            return true;
          }
          return false;
        })
      );

      // Initialisiere das Kursobjekt
      this.courseService.getCourse(courseId).subscribe(course => {
        this.course = course;
        this.currentModuleIndex = 0;
        this.currentLessonIndex = 0;
      });
    }
  }

  startModule() {
    console.log('startModule called', this.course); // Debug log
    if (this.course && this.course.modules.length > 0) {
      const firstModule = this.course.modules[0];
      // Angepasste Navigation entsprechend der neuen Route-Struktur
      this.router.navigate([
        '/dashboard',
        'courses', 
        this.course.id, 
        'modules', 
        firstModule.id
      ]);
    }
  }

  continueLearning() {
    const courseId = this.route.snapshot.params['courseId']; // Geändert von 'id' zu 'courseId'
    const lastLesson = this.lastLesson$.getValue();
    
    if (lastLesson) {
      this.router.navigate([
        '/dashboard',
        'courses', 
        courseId, 
        'modules', 
        lastLesson.moduleId,
        'lessons',
        lastLesson.lessonId
      ]);
    }
  }

  navigateToNextLesson() {
    if (!this.course) return;
    
    const currentModule = this.course.modules[this.currentModuleIndex];
    
    if (this.currentLessonIndex < currentModule.lessons.length - 1) {
      this.currentLessonIndex++;
      const nextLesson = currentModule.lessons[this.currentLessonIndex];
      this.router.navigate([
        '/dashboard',
        'courses', 
        this.course.id, 
        'modules',
        currentModule.id,
        'lessons', 
        nextLesson.id
      ]);
    } 
    else if (this.currentModuleIndex < this.course.modules.length - 1) {
      this.currentModuleIndex++;
      this.currentLessonIndex = 0;
      const nextModule = this.course.modules[this.currentModuleIndex];
      const nextLesson = nextModule.lessons[0];
      this.router.navigate([
        '/dashboard',
        'courses', 
        this.course.id, 
        'modules',
        nextModule.id,
        'lessons', 
        nextLesson.id
      ]);
    }
  }

  updateCurrentIndices(lessonId: string) {
    if (!this.course) return;
    
    this.course.modules.forEach((module, moduleIndex) => {
      const lessonIndex = module.lessons.findIndex(lesson => lesson.id === lessonId);
      if (lessonIndex !== -1) {
        this.currentModuleIndex = moduleIndex;
        this.currentLessonIndex = lessonIndex;
      }
    });
  }

  hasNextLesson(): boolean {
    if (!this.course) return false;
    
    const currentModule = this.course.modules[this.currentModuleIndex];
    return this.currentLessonIndex < currentModule.lessons.length - 1 || 
           this.currentModuleIndex < this.course.modules.length - 1;
  }
} 