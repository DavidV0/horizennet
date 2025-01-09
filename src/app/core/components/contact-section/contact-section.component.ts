import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ContactService } from '../../../shared/services/contact.service';

@Component({
  selector: 'app-contact-section',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './contact-section.component.html',
  styleUrls: ['./contact-section.component.scss'],
  styles: [`
    ::ng-deep {
      .mat-mdc-form-field {
        --mdc-filled-text-field-container-color: transparent;
        --mdc-filled-text-field-focus-active-indicator-color: var(--color-accent);
        --mdc-filled-text-field-hover-active-indicator-color: var(--color-accent);
        --mdc-filled-text-field-focus-label-text-color: var(--color-accent);
        --mdc-filled-text-field-label-text-color: var(--color-white);
        --mdc-filled-text-field-input-text-color: var(--color-white);
      }

      .mdc-text-field--outlined {
        --mdc-outlined-text-field-outline-color: rgba(255, 255, 255, 0.7);
        --mdc-outlined-text-field-focus-outline-color: var(--color-accent);
        --mdc-outlined-text-field-hover-outline-color: var(--color-accent);
        --mdc-outlined-text-field-label-text-color: var(--color-white);
        --mdc-outlined-text-field-focus-label-text-color: var(--color-accent);
        --mdc-outlined-text-field-input-text-color: var(--color-white);
        --mdc-outlined-text-field-caret-color: var(--color-accent);
        
        .mdc-text-field__input {
          padding-left: 16px !important;
          padding-right: 16px !important;
        }
      }

      .mat-mdc-form-field-subscript-wrapper {
        padding-left: 16px !important;
      }

      .mat-mdc-form-field {
        width: 100%;
      }

      textarea.mat-mdc-input-element {
        resize: vertical;
        min-height: 100px;
      }
    }
  `]
})
export class ContactSectionComponent {
  contactForm: FormGroup;
  submitSuccess: boolean = false;
  isSubmitting: boolean = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private contactService: ContactService
  ) {
    this.contactForm = this.fb.group({
      firstName: ['', [
        Validators.required, 
        Validators.minLength(2),
        Validators.pattern(/^[a-zA-ZäöüßÄÖÜ\s-]*$/)
      ]],
      lastName: ['', [
        Validators.required, 
        Validators.minLength(2),
        Validators.pattern(/^[a-zA-ZäöüßÄÖÜ\s-]*$/)
      ]],
      email: ['', [Validators.required, Validators.email]],
      message: ['', [Validators.required, Validators.minLength(10)]],
      privacyPolicy: [false, Validators.requiredTrue]
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.contactForm.get(fieldName);
    if (control?.errors) {
      if (control.errors['required']) {
        return 'Dieses Feld ist erforderlich';
      }
      if (control.errors['email']) {
        return 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
      }
      if (control.errors['minlength']) {
        return `Mindestens ${control.errors['minlength'].requiredLength} Zeichen erforderlich`;
      }
      if (control.errors['pattern']) {
        return 'Bitte verwenden Sie nur Buchstaben';
      }
    }
    return '';
  }

  onSubmit() {
    if (this.contactForm.valid) {
      this.isSubmitting = true;
      this.errorMessage = null;

      this.contactService.sendContactForm(this.contactForm.value).subscribe({
        next: () => {
          this.submitSuccess = true;
          this.contactForm.reset();
          this.isSubmitting = false;
          
          // Hide success message after 5 seconds
          setTimeout(() => {
            this.submitSuccess = false;
          }, 5000);
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.errorMessage = 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.';
          this.isSubmitting = false;
        }
      });
    } else {
      Object.keys(this.contactForm.controls).forEach(key => {
        const control = this.contactForm.get(key);
        control?.markAsTouched();
      });
    }
  }
} 