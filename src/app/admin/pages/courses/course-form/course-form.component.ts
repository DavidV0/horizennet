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

  constructor(
    private fb: FormBuilder,
    private courseService: CourseService,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<CourseFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit', course?: Course }
  ) {
    this.isEditMode = data.mode === 'edit';
    this.courseForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      subtitle: [''],
      description: ['', [Validators.required, Validators.minLength(10)]],
      image: [null]
    });
    
    if (this.isEditMode && data.course) {
      this.modules = [...data.course.modules];
      this.courseForm.patchValue({
        title: data.course.title,
        subtitle: data.course.subtitle,
        description: data.course.description
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
      this.courseForm.patchValue({ image: file });
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
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

  openLessonDialog(moduleId: string, lesson?: Lesson) {
    const dialogRef = this.dialog.open(LessonDialogComponent, {
      width: '600px',
      data: { lesson }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const moduleIndex = this.modules.findIndex(m => m.id === moduleId);
        if (moduleIndex !== -1) {
          if (lesson) {
            const lessonIndex = this.modules[moduleIndex].lessons.findIndex(l => l.id === lesson.id);
            if (lessonIndex !== -1) {
              this.modules[moduleIndex].lessons[lessonIndex] = { ...result };
            }
          } else {
            result.order = this.modules[moduleIndex].lessons.length;
            this.modules[moduleIndex].lessons.push(result);
          }
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
        const formValues = this.courseForm.value;
        const imageFile = this.courseForm.get('image')?.value;
        
        // Basis-Daten ohne Image
        const baseData: Partial<Course> = {
          title: formValues.title,
          subtitle: formValues.subtitle || '',
          description: formValues.description,
          modules: this.modules,
          isActive: this.data.course?.isActive ?? false,
          updatedAt: new Date()
        };

        if (!this.isEditMode) {
          baseData.createdAt = new Date();
        }
        
        if (this.isEditMode && this.data.course) {
          if (imageFile) {
            // Update mit neuem Bild
            await this.courseService.updateCourse(
              this.data.course.id,
              baseData,
              imageFile
            );
          } else {
            // Update ohne Bild-Änderung
            if (this.data.course.image) {
              baseData.image = this.data.course.image;
            }
            await this.courseService.updateCourse(
              this.data.course.id,
              baseData
            );
          }
        } else {
          // Neuer Kurs
          await this.courseService.createCourse(baseData, imageFile);
        }
        
        this.dialogRef.close(true);
      } catch (error) {
        console.error('Error saving course:', error);
      }
    }
  }
} 