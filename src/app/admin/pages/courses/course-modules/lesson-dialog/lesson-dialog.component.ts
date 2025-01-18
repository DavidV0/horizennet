import { Component, ViewChild, ElementRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Lesson } from '../../../../../shared/models/course.model';

@Component({
  selector: 'app-lesson-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressBarModule
  ],
  templateUrl: './lesson-dialog.component.html',
  styleUrls: ['./lesson-dialog.component.scss']
})
export class LessonDialogComponent {
  @ViewChild('videoInput') videoInput!: ElementRef<HTMLInputElement>;
  lessonForm: FormGroup;
  isEditMode: boolean;
  videoPreview: string | null = null;
  videoName: string | null = null;
  uploadProgress = 0;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<LessonDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { lesson?: Lesson }
  ) {
    this.isEditMode = !!data.lesson;
    this.lessonForm = this.fb.group({
      title: [data.lesson?.title || '', [Validators.required]],
      description: [data.lesson?.description || '', [Validators.required]],
      duration: [data.lesson?.duration || '', [Validators.required, Validators.min(1)]],
      video: [null]
    });

    if (data.lesson?.videoUrl) {
      this.videoPreview = data.lesson.videoUrl;
      this.videoName = this.extractVideoName(data.lesson.videoUrl);
    }
  }

  triggerVideoInput() {
    this.videoInput.nativeElement.click();
  }

  onVideoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.lessonForm.patchValue({ video: file });
      this.videoName = file.name;
      this.videoPreview = URL.createObjectURL(file);
    }
  }

  removeVideo() {
    this.videoPreview = null;
    this.videoName = null;
    this.lessonForm.patchValue({ video: null });
    if (this.videoInput) {
      this.videoInput.nativeElement.value = '';
    }
  }

  private extractVideoName(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1];
  }

  onSubmit() {
    if (this.lessonForm.valid) {
      const formData = {
        ...this.lessonForm.value,
        id: this.data.lesson?.id || crypto.randomUUID(),
        videoUrl: this.videoPreview || '',
        completed: this.data.lesson?.completed || false
      };
      this.dialogRef.close(formData);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
} 