import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-activate-success',
  standalone: true,
  imports: [CommonModule, MatButtonModule, RouterModule, MatIconModule],
  template: `
    <div class="success-container">
      <div class="success-content">
        <div class="success-icon">
          <mat-icon>check_circle</mat-icon>
        </div>
        
        <h1>Aktivierung erfolgreich!</h1>
        
        <div class="success-message">
          <p>Ihr Produktschlüssel wurde erfolgreich aktiviert.</p>
          <p>Sie erhalten in Kürze eine E-Mail mit Ihren Zugangsdaten.</p>
        </div>

        <div class="actions">
          <a mat-raised-button color="accent" routerLink="/login">
            Zum Login
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .success-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background-color: var(--color-primary);
      margin-top: 8vh;
    }

    .success-content {
      background-color: var(--color-secondary);
      padding: 3rem;
      border-radius: 8px;
      text-align: center;
      max-width: 600px;
      width: 100%;
    }

    .success-icon {
      margin-bottom: 2rem;

      mat-icon {
        font-size: 64px;
        height: 64px;
        width: 64px;
        color: var(--color-accent);
      }
    }

    h1 {
      color: var(--color-white);
      font-size: 2rem;
      margin-bottom: 1.5rem;
      font-weight: 500;
    }

    .success-message {
      margin: 2rem 0;
      color: var(--color-white);
      font-size: 1.1rem;
      line-height: 1.6;

      p {
        margin: 0.5rem 0;
      }
    }

    .actions {
      margin-top: 2rem;

      a {
        padding: 0.8rem 2rem;
        font-size: 1.1rem;
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
      }
    }

    ::ng-deep {
      .mat-mdc-raised-button.mat-accent {
        --mdc-protected-button-container-color: var(--color-accent);
        --mdc-protected-button-label-text-color: var(--color-white);
      }
    }
  `]
})
export class ActivateSuccessComponent {} 