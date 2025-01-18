import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Module } from '../../../../../shared/models/course.model';

@Component({
  selector: 'app-module-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './module-dialog.component.html',
  styleUrls: ['./module-dialog.component.scss']
})
export class ModuleDialogComponent {
  moduleForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ModuleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { module?: Module }
  ) {
    this.moduleForm = this.fb.group({
      title: [data?.module?.title || '', [Validators.required, Validators.minLength(3)]],
      description: [data?.module?.description || '', [Validators.required, Validators.minLength(10)]]
    });
  }

  onSubmit(): void {
    if (this.moduleForm.valid) {
      const moduleData: Partial<Module> = {
        ...this.moduleForm.value,
        id: this.data.module?.id || crypto.randomUUID(),
        order: this.data.module?.order || 0,
        lessons: this.data.module?.lessons || []
      };
      this.dialogRef.close(moduleData);
    }
  }
} 