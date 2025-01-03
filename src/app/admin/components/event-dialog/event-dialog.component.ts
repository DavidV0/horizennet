import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { Event } from '../../../shared/interfaces/event.interface';

@Component({
  selector: 'app-event-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>{{ isEdit ? 'Edit' : 'Add' }} Event</h2>
      <mat-dialog-content>
        <form [formGroup]="eventForm" class="event-form">
          <mat-form-field appearance="outline">
            <mat-label>ID</mat-label>
            <input matInput formControlName="id" [readonly]="isEdit">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Title</mat-label>
            <input matInput formControlName="title">
          </mat-form-field>

          <div class="date-group">
            <mat-form-field appearance="outline">
              <mat-label>Day</mat-label>
              <input matInput formControlName="day" maxlength="2">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Month</mat-label>
              <mat-select formControlName="month">
                <mat-option value="JAN">JAN</mat-option>
                <mat-option value="FEB">FEB</mat-option>
                <mat-option value="MÄR">MÄR</mat-option>
                <mat-option value="APR">APR</mat-option>
                <mat-option value="MAI">MAI</mat-option>
                <mat-option value="JUN">JUN</mat-option>
                <mat-option value="JUL">JUL</mat-option>
                <mat-option value="AUG">AUG</mat-option>
                <mat-option value="SEP">SEP</mat-option>
                <mat-option value="OKT">OKT</mat-option>
                <mat-option value="NOV">NOV</mat-option>
                <mat-option value="DEZ">DEZ</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Time</mat-label>
            <input matInput formControlName="time" placeholder="e.g., 2024-12-08 @ 05:00 PM - 2024-12-08 @ 10:00 PM">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Location</mat-label>
            <input matInput formControlName="location">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Image URL</mat-label>
            <input matInput formControlName="image">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option value="upcoming">Upcoming</mat-option>
              <mat-option value="ongoing">Ongoing</mat-option>
              <mat-option value="past">Past</mat-option>
            </mat-select>
          </mat-form-field>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button class="cancel-button" (click)="onCancel()">Cancel</button>
        <button mat-raised-button class="submit-button" (click)="onSubmit()" [disabled]="!eventForm.valid">
          {{ isEdit ? 'Update' : 'Create' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      background-color: #1a1a1a;
      color: #ffffff;
      padding: 24px;
      border-radius: 8px;
    }

    h2 {
      color: #ffffff;
      font-size: 24px;
      margin: 0 0 24px 0;
      font-weight: 600;
    }

    .event-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 0;
      max-height: 60vh;
      overflow-y: auto;
    }

    .date-group {
      display: flex;
      gap: 16px;

      mat-form-field {
        flex: 1;
      }
    }

    mat-form-field {
      width: 100%;
    }

    ::ng-deep {
      .mat-mdc-form-field {
        .mat-mdc-text-field-wrapper {
          background-color: #2a2a2a;
        }

        .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__leading,
        .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__notch,
        .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__trailing {
          border-color: #3a3a3a;
        }

        .mat-mdc-form-field-focus-overlay {
          background-color: #3a3a3a;
        }

        .mdc-text-field:not(.mdc-text-field--disabled) .mdc-floating-label,
        .mdc-text-field:not(.mdc-text-field--disabled) .mdc-text-field__input {
          color: #ffffff;
        }

        textarea.mat-mdc-input-element,
        input.mat-mdc-input-element {
          color: #ffffff;
        }

        .mat-mdc-select-value {
          color: #ffffff;
        }

        .mat-mdc-select-arrow {
          color: #ffffff;
        }
      }
    }

    .mat-mdc-dialog-actions {
      padding: 24px 0 0 0;
      gap: 16px;
    }

    .cancel-button {
      color: #ffffff;
      background-color: transparent;
      border: 1px solid #ffffff;
    }

    .submit-button {
      background: linear-gradient(45deg, #FFD700, #FFA500);
      color: #000000;
      font-weight: 600;
      padding: 0 32px;

      &:disabled {
        background: #3a3a3a;
        color: #666666;
      }
    }

    ::-webkit-scrollbar {
      width: 8px;
    }

    ::-webkit-scrollbar-track {
      background: #2a2a2a;
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb {
      background: #3a3a3a;
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #4a4a4a;
    }
  `]
})
export class EventDialogComponent {
  eventForm: FormGroup;
  isEdit: boolean;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: { event?: Event }
  ) {
    this.isEdit = !!data.event;
    this.eventForm = this.fb.group({
      id: [data.event?.id || '', [Validators.required, Validators.pattern('[a-z0-9-]+')]],
      title: [data.event?.title || '', Validators.required],
      day: [data.event?.date?.day || '', [Validators.required, Validators.pattern('^[0-9]{1,2}$')]],
      month: [data.event?.date?.month || '', Validators.required],
      time: [data.event?.time || '', Validators.required],
      location: [data.event?.location || '', Validators.required],
      description: [data.event?.description || '', Validators.required],
      image: [data.event?.image || '', Validators.required],
      status: [data.event?.status || 'upcoming']
    });
  }

  onSubmit(): void {
    if (this.eventForm.valid) {
      const formValue = this.eventForm.value;
      const event: Event = {
        id: formValue.id,
        title: formValue.title,
        date: {
          day: formValue.day.padStart(2, '0'),
          month: formValue.month
        },
        time: formValue.time,
        location: formValue.location,
        description: formValue.description,
        image: formValue.image,
        status: formValue.status
      };
      this.dialogRef.close(event);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
} 