import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FaqItem } from '../../../shared/interfaces/faq.interface';

@Component({
  selector: 'app-faq-dialog',
  templateUrl: './faq-dialog.component.html',
  styleUrls: ['./faq-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class FaqDialogComponent {
  faqForm: FormGroup;
  mode: 'add' | 'edit';

  constructor(
    private dialogRef: MatDialogRef<FaqDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: { mode: 'add' | 'edit', faq?: FaqItem },
    private fb: FormBuilder
  ) {
    this.mode = data.mode;
    this.faqForm = this.fb.group({
      question: ['', [Validators.required]],
      answer: ['', [Validators.required]]
    });

    if (this.mode === 'edit' && data.faq) {
      this.faqForm.patchValue({
        question: data.faq.question,
        answer: data.faq.answer
      });
    }
  }

  onSubmit(): void {
    if (this.faqForm.valid) {
      const faqData = this.faqForm.value;
      if (this.mode === 'edit' && this.data.faq) {
        faqData.id = this.data.faq.id;
      }
      this.dialogRef.close(faqData);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
} 