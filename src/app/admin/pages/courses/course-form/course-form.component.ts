import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { CourseService } from '../../../../shared/services/course.service';
import { Course, Module, Lesson } from '../../../../shared/models/course.model';
import { ModuleDialogComponent } from '../course-modules/module-dialog/module-dialog.component';
import { LessonDialogComponent } from '../course-modules/lesson-dialog/lesson-dialog.component';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-course-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDialogModule,
    MatExpansionModule,
    MatListModule
  ],
  templateUrl: './course-form.component.html',
  styleUrls: ['./course-form.component.scss']
})
export class CourseFormComponent implements OnInit {
  courseForm: FormGroup;
  isEditMode = false;
  imagePreview: string | null = null;
  uploadProgress = 0;
  modules: Module[] = [];
  selectedImageFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private courseService: CourseService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<CourseFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit', course?: Course },
    private router: Router
  ) {
    this.isEditMode = data.mode === 'edit';
    this.courseForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      subtitle: [''],
      description: ['', [Validators.required, Validators.minLength(10)]],
      image: ['', [Validators.required]]
    });
    
    if (this.isEditMode && data.course) {
      this.modules = [...data.course.modules];
      this.courseForm.patchValue({
        title: data.course.title,
        subtitle: data.course.subtitle,
        description: data.course.description,
        image: data.course.image
      });
      if (data.course.image) {
        this.imagePreview = data.course.image;
      }
    }
  }

  ngOnInit() {
    if (this.isEditMode && this.data.course) {
      this.loadCourseData();
    }
  }

  private loadCourseData() {
    if (this.data.course) {
      this.modules = [...this.data.course.modules];
    }
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedImageFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
        this.courseForm.patchValue({ image: this.imagePreview });
      };
      reader.readAsDataURL(file);
    }
  }

  openModuleDialog(module?: Module) {
    const dialogRef = this.dialog.open(ModuleDialogComponent, {
      width: '600px',
      data: { module }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (module) {
          const index = this.modules.findIndex(m => m.id === module.id);
          if (index !== -1) {
            this.modules[index] = { ...result };
          }
        } else {
          result.order = this.modules.length;
          this.modules.push(result);
        }
      }
    });
  }

  openLessonDialog(moduleId: string, lesson?: Lesson): void {
    const dialogRef = this.dialog.open(LessonDialogComponent, {
      width: '800px',
      data: { lesson }
    });

    dialogRef.afterClosed().subscribe((result: Lesson) => {
      if (result) {
        const moduleIndex = this.modules.findIndex(m => m.id === moduleId);
        if (moduleIndex !== -1) {
          if (lesson) {
            // Update existing lesson
            const lessonIndex = this.modules[moduleIndex].lessons.findIndex(l => l.id === lesson.id);
            if (lessonIndex !== -1) {
              this.modules[moduleIndex].lessons[lessonIndex] = {
                ...lesson,
                ...result,
                type: result.videoUrl ? 'video' : 'article',
                quiz: result.quiz ? {
                  title: result.quiz.title || 'Quiz',
                  questions: result.quiz.questions.map(q => ({
                    text: q.text,
                    options: q.options.filter(opt => opt.trim() !== ''),
                    correctAnswers: q.correctAnswers || []
                  }))
                } : undefined
              };
            }
          } else {
            // Add new lesson
            const newLesson: Lesson = {
              ...result,
              id: result.id || crypto.randomUUID(),
              type: result.videoUrl ? 'video' : 'article',
              order: this.modules[moduleIndex].lessons.length,
              quiz: result.quiz ? {
                title: result.quiz.title || 'Quiz',
                questions: result.quiz.questions.map(q => ({
                  text: q.text,
                  options: q.options.filter(opt => opt.trim() !== ''),
                  correctAnswers: q.correctAnswers || []
                }))
              } : undefined
            };
            this.modules[moduleIndex].lessons.push(newLesson);
          }
          this.reorderLessons(moduleIndex);
        }
      }
    });
  }

  deleteModule(moduleId: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { title: 'Delete Module', message: 'Are you sure you want to delete this module?' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.modules = this.modules.filter(m => m.id !== moduleId);
        this.reorderModules();
      }
    });
  }

  deleteLesson(moduleId: string, lessonId: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { title: 'Delete Lesson', message: 'Are you sure you want to delete this lesson?' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const moduleIndex = this.modules.findIndex(m => m.id === moduleId);
        if (moduleIndex !== -1) {
          this.modules[moduleIndex].lessons = this.modules[moduleIndex].lessons.filter(l => l.id !== lessonId);
          this.reorderLessons(moduleIndex);
        }
      }
    });
  }

  private reorderModules() {
    this.modules = this.modules.map((module, index) => ({
      ...module,
      order: index
    }));
  }

  private reorderLessons(moduleIndex: number) {
    this.modules[moduleIndex].lessons = this.modules[moduleIndex].lessons.map((lesson, index) => ({
      ...lesson,
      order: index
    }));
  }

  async onSubmit() {
    if (this.courseForm.valid) {
      try {
        const formValue = this.courseForm.value;
        
        // Basis-Daten vorbereiten
        const courseData: Partial<Course> = {
          title: formValue.title,
          subtitle: formValue.subtitle || '',
          description: formValue.description,
          image: formValue.image,
          modules: this.modules.map(module => ({
            id: module.id,
            title: module.title,
            description: module.description,
            order: module.order,
            lessons: module.lessons?.map(lesson => {
              // Basis-Lektion mit Pflichtfeldern
              const mappedLesson: Partial<Lesson> = {
                id: lesson.id,
                title: lesson.title || '',
                type: lesson.type || 'video',
                description: lesson.description || ''
              };

              // Optionale Felder nur hinzufügen, wenn sie existieren
              if (lesson.videoUrl) {
                mappedLesson.videoUrl = lesson.videoUrl;
              }

              if (lesson.duration) {
                mappedLesson.duration = lesson.duration;
              }

              if (lesson.content) {
                mappedLesson.content = lesson.content;
              }

              if (lesson.completed !== undefined) {
                mappedLesson.completed = lesson.completed;
              }

              if (Array.isArray(lesson.files) && lesson.files.length > 0) {
                mappedLesson.files = lesson.files;
              }

              // Quiz nur hinzufügen wenn es gültige Fragen enthält
              if (lesson.quiz?.questions && Array.isArray(lesson.quiz.questions) && lesson.quiz.questions.length > 0) {
                mappedLesson.quiz = {
                  title: lesson.quiz.title || 'Quiz',
                  questions: lesson.quiz.questions.map(q => ({
                    text: q.text || '',
                    options: Array.isArray(q.options) ? q.options : [],
                    correctAnswers: Array.isArray(q.correctAnswers) ? q.correctAnswers : []
                  }))
                };
              }

              return mappedLesson as Lesson;
            }) || []
          })),
          isActive: this.isEditMode ? (this.data.course?.isActive || false) : false,
          updatedAt: new Date()
        };

        if (this.isEditMode && this.data.course) {
          await this.courseService.updateCourse(
            this.data.course.id,
            courseData,
            this.selectedImageFile || undefined
          );
          this.dialogRef.close({ ...this.data.course, ...courseData });
        } else {
          courseData.createdAt = new Date();
          await this.courseService.createCourse(courseData, this.selectedImageFile || undefined);
          this.dialogRef.close(courseData);
        }
      } catch (error) {
        console.error('Error saving course:', error);
      }
    }
  }

  async saveCourse() {
    if (this.courseForm.valid) {
      const courseData = this.courseForm.value;

      try {
        const transformedCourse = {
          ...courseData,
          modules: this.modules,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await this.courseService.createCourse(transformedCourse);
        this.router.navigate(['/admin/courses']);
      } catch (error) {
        console.error('Error saving course:', error);
      }
    }
  }
} 