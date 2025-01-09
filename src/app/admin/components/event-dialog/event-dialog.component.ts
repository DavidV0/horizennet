import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Event } from '../../../shared/interfaces/event.interface';

@Component({
  selector: 'app-event-dialog',
  templateUrl: './event-dialog.component.html',
  styleUrls: ['./event-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressBarModule
  ]
})
export class EventDialogComponent {
  eventForm: FormGroup;
  imagePreview: string | undefined;
  uploadProgress: number = 0;
  isUploading: boolean = false;
  selectedFile: File | undefined;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { event?: Event }
  ) {
    this.dialogRef.updateSize('600px', '80vh');
    this.dialogRef.addPanelClass('scrollable-dialog');

    this.eventForm = this.fb.group({
      title: ['', [Validators.required]],
      description: ['', [Validators.required]],
      day: ['', [Validators.required]],
      month: ['', [Validators.required]],
      time: ['', [Validators.required]],
      location: ['', [Validators.required]],
      status: ['upcoming', [Validators.required]]
    });

    if (data?.event) {
      this.eventForm.patchValue({
        title: data.event.title || '',
        description: data.event.description || '',
        day: data.event.day || '',
        month: data.event.month || '',
        time: data.event.time || '',
        location: data.event.location || '',
        status: data.event.status || 'upcoming'
      });

      if (data.event.image) {
        this.imagePreview = data.event.image;
      }
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.eventForm.valid) {
      const formValue = this.eventForm.getRawValue();
      
      // Konvertiere und validiere die Daten
      const eventData = {
        title: String(formValue.title || '').trim(),
        description: String(formValue.description || '').trim(),
        day: String(formValue.day || '').trim(),
        month: String(formValue.month || '').trim(),
        time: String(formValue.time || '').trim(),
        location: String(formValue.location || '').trim(),
        status: formValue.status
      };

      console.log('Submitting event data:', eventData); // Debug-Log

      this.dialogRef.close({
        event: eventData,
        file: this.selectedFile
      });
    } else {
      console.log('Form validation errors:', this.eventForm.errors); // Debug-Log
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  removeImage(): void {
    this.imagePreview = undefined;
    this.selectedFile = undefined;
  }
} 