import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-login',
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
    <div class="login-container">
      <div class="login-card">
        <h1>Login</h1>
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline">
            <mat-label>E-Mail</mat-label>
            <input matInput type="email" formControlName="email" required>
            <mat-error *ngIf="loginForm.get('email')?.hasError('required')">
              E-Mail ist erforderlich
            </mat-error>
            <mat-error *ngIf="loginForm.get('email')?.hasError('email')">
              Bitte geben Sie eine gültige E-Mail-Adresse ein
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Passwort</mat-label>
            <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="password" required>
            <button mat-icon-button matSuffix (click)="hidePassword = !hidePassword" type="button">
              <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
            </button>
            <mat-error *ngIf="loginForm.get('password')?.hasError('required')">
              Passwort ist erforderlich
            </mat-error>
          </mat-form-field>

          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>

          <div class="success-message" *ngIf="successMessage">
            {{ successMessage }}
          </div>

          <button mat-raised-button color="primary" type="submit" [disabled]="loginForm.invalid || isLoading">
            {{ isLoading ? 'Wird eingeloggt...' : 'Login' }}
          </button>

          <div class="forgot-password">
            <button mat-button type="button" (click)="resetPassword()" [disabled]="isResetting">
              {{ isResetting ? 'E-Mail wird gesendet...' : 'Passwort vergessen?' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background-color: var(--color-primary);
      margin-top: 8vh;
    }

    .login-card {
      background-color: var(--color-secondary);
      padding: 2rem;
      border-radius: 8px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    h1 {
      color: var(--color-white);
      text-align: center;
      margin-bottom: 2rem;
      font-size: 2rem;
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
      color: var(--color-error);
      text-align: center;
      margin: 1rem 0;
    }

    .success-message {
      color: var(--color-accent);
      text-align: center;
      margin: 1rem 0;
    }

    button[type="submit"] {
      margin-top: 1rem;
      padding: 0.8rem;
      font-size: 1.1rem;
    }

    .forgot-password {
      text-align: center;
      margin-top: 1rem;

      button {
        color: var(--color-accent);
        font-size: 0.9rem;
        text-decoration: none;
        transition: all 0.3s ease;

        &:hover {
          text-decoration: underline;
        }

        &:disabled {
          opacity: 0.7;
        }
      }
    }

    ::ng-deep {
      .mat-mdc-form-field {
        --mdc-outlined-text-field-outline-color: var(--color-accent);
        --mdc-outlined-text-field-focus-outline-color: var(--color-accent);
        --mdc-outlined-text-field-hover-outline-color: var(--color-accent);
        --mdc-outlined-text-field-focus-label-text-color: var(--color-accent);
        --mdc-outlined-text-field-label-text-color: var(--color-white);
        --mdc-outlined-text-field-input-text-color: var(--color-white);
        --mat-form-field-focus-color: var(--color-accent);

        .mdc-text-field--focused .mdc-floating-label {
          color: var(--color-accent) !important;
        }

        .mdc-text-field--focused .mdc-notched-outline__leading,
        .mdc-text-field--focused .mdc-notched-outline__notch,
        .mdc-text-field--focused .mdc-notched-outline__trailing {
          border-color: var(--color-accent) !important;
        }

        .mat-mdc-form-field-focus-overlay {
          background-color: var(--color-accent);
        }

        input {
          caret-color: var(--color-accent) !important;
        }

        .mat-mdc-text-field-wrapper {
          &:hover .mdc-notched-outline__leading,
          &:hover .mdc-notched-outline__notch,
          &:hover .mdc-notched-outline__trailing {
            border-color: var(--color-accent) !important;
          }
        }
      }

      .mat-mdc-raised-button.mat-primary {
        --mdc-protected-button-container-color: var(--color-accent);
        --mdc-protected-button-label-text-color: var(--color-white);
      }
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;
  isResetting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        const { email, password } = this.loginForm.value;
        await this.authService.login(email, password);
        this.router.navigate(['/dashboard']);
      } catch (error: any) {
        this.errorMessage = 'Ungültige E-Mail oder Passwort';
        console.error('Login error:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }

  async resetPassword() {
    const email = this.loginForm.get('email')?.value;
    
    if (!email) {
      this.errorMessage = 'Bitte geben Sie Ihre E-Mail-Adresse ein';
      return;
    }

    if (!this.loginForm.get('email')?.valid) {
      this.errorMessage = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
      return;
    }

    this.isResetting = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      await this.authService.resetPassword(email);
      this.successMessage = 'Eine E-Mail zum Zurücksetzen des Passworts wurde gesendet';
      this.loginForm.get('password')?.reset();
    } catch (error: any) {
      if (error.message === 'Diese E-Mail-Adresse ist nicht registriert.') {
        this.errorMessage = error.message;
      } else {
        this.errorMessage = 'Fehler beim Senden der Zurücksetz-E-Mail. Bitte versuchen Sie es später erneut.';
      }
      console.error('Password reset error:', error);
    } finally {
      this.isResetting = false;
    }
  }
} 