import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

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
  styleUrls: ['./contact-section.component.scss']
})
export class ContactSectionComponent {
  contactForm: FormGroup;
  submitSuccess: boolean = false;

  constructor(private fb: FormBuilder) {
    this.contactForm = this.fb.group({
      firstName: ['', [
        Validators.required, 
        Validators.minLength(2),
        Validators.pattern(/^[a-zA-ZäöüßÄÖÜ\s-]*$/) // Nur Buchstaben, Leerzeichen und Bindestrich
      ]],
      lastName: ['', [
        Validators.required, 
        Validators.minLength(2),
        Validators.pattern(/^[a-zA-ZäöüßÄÖÜ\s-]*$/) // Nur Buchstaben, Leerzeichen und Bindestrich
      ]],
      email: ['', [Validators.required, Validators.email]],
      message: ['', [Validators.required, Validators.minLength(10)]],
      privacyPolicy: [false, Validators.requiredTrue]
    });
  }

  // Hilfsmethoden für die Template-Validierung
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
      console.log(this.contactForm.value);
      // Hier kommt die Submit-Logik
      
      // Zeige Erfolgsmeldung
      this.submitSuccess = true;
      
      // Formular zurücksetzen
      this.contactForm.reset();
      
      // Erfolgsmeldung nach 5 Sekunden ausblenden
      setTimeout(() => {
        this.submitSuccess = false;
      }, 5000);
    } else {
      // Markiere alle Felder als berührt, um Fehler anzuzeigen
      Object.keys(this.contactForm.controls).forEach(key => {
        const control = this.contactForm.get(key);
        control?.markAsTouched();
      });
    }
  }
} 