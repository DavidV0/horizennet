import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../../shared/services/admin.service';

@Component({
  selector: 'app-create-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="create-admin-container">
      <div class="create-admin-card">
        <h2>Admin erstellen</h2>
        
        <form [formGroup]="adminForm" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline">
            <mat-label>E-Mail</mat-label>
            <input matInput type="email" formControlName="email" required>
            <mat-error *ngIf="adminForm.get('email')?.hasError('required')">
              E-Mail ist erforderlich
            </mat-error>
            <mat-error *ngIf="adminForm.get('email')?.hasError('email')">
              Bitte geben Sie eine gültige E-Mail-Adresse ein
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Passwort</mat-label>
            <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="password" required>
            <button mat-icon-button matSuffix (click)="hidePassword = !hidePassword" type="button">
              <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
            </button>
            <mat-error *ngIf="adminForm.get('password')?.hasError('required')">
              Passwort ist erforderlich
            </mat-error>
            <mat-error *ngIf="adminForm.get('password')?.hasError('minlength')">
              Passwort muss mindestens 6 Zeichen lang sein
            </mat-error>
          </mat-form-field>

          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>

          <div class="success-message" *ngIf="successMessage">
            {{ successMessage }}
          </div>

          <button mat-raised-button color="primary" type="submit" [disabled]="!adminForm.valid || isLoading">
            {{ isLoading ? 'Wird erstellt...' : 'Admin erstellen' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .create-admin-container {
      padding: 2rem;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: calc(100vh - 64px);
      background-color: var(--color-primary);
    }

    .create-admin-card {
      background-color: var(--color-secondary);
      padding: 2rem;
      border-radius: 8px;
      width: 100%;
      max-width: 400px;
      margin-top: 2rem;
    }

    h2 {
      color: var(--color-white);
      margin-bottom: 2rem;
      text-align: center;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    mat-form-field {
      width: 100%;
    }

    .error-message {
      color: #f44336;
      text-align: center;
      margin: 1rem 0;
    }

    .success-message {
      color: #4caf50;
      text-align: center;
      margin: 1rem 0;
    }

    button[type="submit"] {
      margin-top: 1rem;
    }
  `]
})
export class CreateAdminComponent {
  adminForm: FormGroup;
  hidePassword = true;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService
  ) {
    this.adminForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onSubmit() {
    if (this.adminForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        const { email, password } = this.adminForm.value;
        await this.adminService.createAdmin(email, password);
        
        this.successMessage = 'Admin wurde erfolgreich erstellt';
        this.adminForm.reset();
      } catch (error: any) {
        this.errorMessage = error.message || 'Ein Fehler ist aufgetreten';
      } finally {
        this.isLoading = false;
      }
    }
  }
} 