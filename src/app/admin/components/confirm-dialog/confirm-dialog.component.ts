import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

interface DialogData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{data.title}}</h2>
    <mat-dialog-content>
      <p>{{data.message}}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">{{data.cancelText}}</button>
      <button mat-flat-button color="warn" (click)="onConfirm()">{{data.confirmText}}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
      padding: var(--spacing-lg);
    }

    h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    p {
      margin: var(--spacing-lg) 0;
      color: var(--color-text-secondary);
    }

    mat-dialog-actions {
      padding: 0;
      margin: 0;
      min-height: unset;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
} 