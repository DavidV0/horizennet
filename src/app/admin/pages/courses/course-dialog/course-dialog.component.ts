import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Course } from '../../../../shared/models/course.model';

@Component({
  selector: 'app-course-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isEditMode ? 'Kurs bearbeiten' : 'Neuer Kurs' }}</h2>
    <form [formGroup]="courseForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content>
        <mat-form-field appearance="outline">
          <mat-label>Titel</mat-label>
          <input matInput formControlName="title" required>
          <mat-error *ngIf="courseForm.get('title')?.hasError('required')">
            Titel ist erforderlich
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Beschreibung</mat-label>
          <textarea matInput formControlName="description" required rows="4"></textarea>
          <mat-error *ngIf="courseForm.get('description')?.hasError('required')">
            Beschreibung ist erforderlich
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Bild URL</mat-label>
          <input matInput formControlName="image" required>
          <mat-error *ngIf="courseForm.get('image')?.hasError('required')">
            Bild URL ist erforderlich
          </mat-error>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Abbrechen</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="!courseForm.valid">
          {{ isEditMode ? 'Speichern' : 'Erstellen' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    mat-form-field {
      width: 100%;
      margin-bottom: 1rem;
    }
    
    mat-dialog-content {
      min-width: 400px;
    }
    
    mat-dialog-actions {
      padding: 1rem 0;
    }
  `]
})
export class CourseDialogComponent {
  courseForm: FormGroup;
  isEditMode: boolean;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CourseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { course?: Course }
  ) {
    this.isEditMode = !!data.course;
    this.courseForm = this.fb.group({
      title: [data.course?.title || '', [Validators.required]],
      description: [data.course?.description || '', [Validators.required]],
      image: [data.course?.image || '', [Validators.required]]
    });
  }

  onSubmit() {
    if (this.courseForm.valid) {
      const courseData = {
        ...this.courseForm.value,
        id: this.data.course?.id || crypto.randomUUID(),
        isActive: this.data.course?.isActive ?? true,
        modules: this.data.course?.modules || []
      };
      this.dialogRef.close(courseData);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
} 