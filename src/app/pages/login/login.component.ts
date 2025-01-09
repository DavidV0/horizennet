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

          <button mat-raised-button color="primary" type="submit" [disabled]="loginForm.invalid || isLoading">
            {{ isLoading ? 'Wird eingeloggt...' : 'Login' }}
          </button>
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

    button[type="submit"] {
      margin-top: 1rem;
      padding: 0.8rem;
      font-size: 1.1rem;
    }

    ::ng-deep {
      .mat-mdc-form-field {
        --mdc-filled-text-field-container-color: transparent;
        --mdc-filled-text-field-focus-active-indicator-color: var(--color-accent);
        --mdc-filled-text-field-hover-active-indicator-color: var(--color-accent);
        --mdc-filled-text-field-focus-label-text-color: var(--color-accent);
        --mdc-filled-text-field-label-text-color: var(--color-white);
        --mdc-filled-text-field-input-text-color: var(--color-white);
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
  errorMessage = '';

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
} 