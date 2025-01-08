import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-activate-success',
  standalone: true,
  imports: [CommonModule, MatButtonModule, RouterModule],
  template: `
    <div class="success-container">
      <h1>Aktivierung erfolgreich!</h1>
      
      <div class="success-message">
        <p>Ihr Produktschlüssel wurde erfolgreich aktiviert. Sie erhalten in Kürze eine E-Mail mit Ihren Zugangsdaten.</p>
        <p>Mit diesen Zugangsdaten können Sie sich in Ihrem Kundendashboard einloggen.</p>
      </div>

      <div class="actions">
        <a mat-raised-button color="primary" routerLink="/login">
          ZUM LOGIN
        </a>
      </div>
    </div>
  `,
  styles: [`
    .success-container {
      max-width: 600px;
      margin: 40px auto;
      padding: 20px;
      text-align: center;
    }

    .success-message {
      margin: 20px 0;
      line-height: 1.6;
    }

    .actions {
      margin-top: 30px;
    }
  `]
})
export class ActivateSuccessComponent {} 