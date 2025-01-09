import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AdminService } from '../../../shared/services/admin.service';

@Component({
  selector: 'app-create-first-admin',
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
        <h2>Ersten Administrator erstellen</h2>
        <p class="info-text">
          Da noch kein Administrator existiert, können Sie hier den ersten Administrator-Account erstellen.
          Dieser Account wird volle Administratorrechte haben.
        </p>
        
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
            {{ isLoading ? 'Wird erstellt...' : 'Administrator erstellen' }}
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
      min-height: 100vh;
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
      margin-bottom: 1rem;
      text-align: center;
    }

    .info-text {
      color: var(--color-white);
      margin-bottom: 2rem;
      text-align: center;
      opacity: 0.8;
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
export class CreateFirstAdminComponent {
  adminForm: FormGroup;
  hidePassword = true;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private router: Router
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
        await this.adminService.createFirstAdmin(email, password);
        
        this.successMessage = 'Administrator wurde erfolgreich erstellt. Sie werden zur Login-Seite weitergeleitet...';
        setTimeout(() => {
          this.router.navigate(['/admin/login']);
        }, 2000);
      } catch (error: any) {
        this.errorMessage = error.message || 'Ein Fehler ist aufgetreten';
      } finally {
        this.isLoading = false;
      }
    }
  }
} 