import { Router } from '@angular/router';
import { CourseService } from '../../../shared/services/course.service';
import { Course } from '../../../shared/models/course.model';

export class CourseComponent {
  course: Course | null = null;
  currentModuleIndex: number = 0;
  currentLessonIndex: number = 0;

  constructor(
    private courseService: CourseService,
    private router: Router
  ) {}

  navigateToNextLesson() {
    if (!this.course) return;
    
    const currentModule = this.course.modules[this.currentModuleIndex];
    
    if (this.currentLessonIndex < currentModule.lessons.length - 1) {
      this.currentLessonIndex++;
      const nextLesson = currentModule.lessons[this.currentLessonIndex];
      this.router.navigate(['/dashboard/courses', this.course.id, 'lesson', nextLesson.id]);
    } 
    else if (this.currentModuleIndex < this.course.modules.length - 1) {
      this.currentModuleIndex++;
      this.currentLessonIndex = 0;
      const nextModule = this.course.modules[this.currentModuleIndex];
      const nextLesson = nextModule.lessons[0];
      this.router.navigate(['/dashboard/courses', this.course.id, 'lesson', nextLesson.id]);
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