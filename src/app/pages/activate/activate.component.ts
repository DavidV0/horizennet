import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../shared/services/user.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-activate',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule
  ],
  template: `
    <div class="activate-container">
      <div class="activate-content">
        <div class="header-icon">
          <mat-icon>vpn_key</mat-icon>
        </div>
        
        <h1>Produktschlüssel einlösen</h1>
        
        <form [formGroup]="activateForm" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline">
            <mat-label>Produktschlüssel</mat-label>
            <input matInput formControlName="productKey" placeholder="XXXX-XXXX-XXXX-XXXX">
            <mat-error *ngIf="activateForm.get('productKey')?.invalid">
              Bitte geben Sie einen gültigen Produktschlüssel ein
            </mat-error>
          </mat-form-field>

          <div class="legal-notice">
            <h3>Wichtige Hinweise zum Widerrufsrecht für digitale Inhalte</h3>
            <p>
              Mit Ihrem Kauf eines Online-Videokurses erwerben Sie Zugang zu digitalen Inhalten. Bitte beachten Sie:
            </p>
            <ul>
              <li>
                Mit der Einlösung des Produktschlüssels und dem Beginn des Zugriffs auf die Inhalte stimmen Sie ausdrücklich zu, 
                dass die Bereitstellung vor Ablauf der gesetzlichen Widerrufsfrist beginnt.
              </li>
              <li>
                Sie bestätigen, dass Sie durch diese Zustimmung Ihr Widerrufsrecht unwiderruflich verlieren, da die Inhalte vollständig bereitgestellt werden.
              </li>
              <li>
                Nach Einlösung des Produktschlüssels ist eine Rückgabe oder Rückerstattung ausgeschlossen.
              </li>
            </ul>
            <p>
              Diese Regelung basiert auf § 18 Abs. 1 Z 11 FAGG und betrifft ausschließlich digitale Inhalte, die nicht auf physischen Datenträgern bereitgestellt werden.
            </p>
          </div>

          <div class="consent-checkboxes">
            <mat-checkbox formControlName="consent1" required color="accent">
              Ich stimme zu, dass die Bereitstellung der Inhalte vor Ablauf der Widerrufsfrist beginnt.
            </mat-checkbox>

            <mat-checkbox formControlName="consent2" required color="accent">
              Mir ist bekannt, dass ich mein Widerrufsrecht mit Beginn der Bereitstellung der Inhalte verliere.
            </mat-checkbox>

            <mat-checkbox formControlName="acceptTerms" required color="accent">
              Ich akzeptiere das Rücktrittsrecht
            </mat-checkbox>
          </div>

          <button mat-raised-button color="accent" type="submit" 
                  [disabled]="!activateForm.valid || isProcessing"
                  class="submit-button">
            <span *ngIf="!isProcessing" class="button-text">PRODUKTSCHLÜSSEL EINLÖSEN</span>
            <span *ngIf="isProcessing" class="button-text">WIRD VERARBEITET...</span>
          </button>

          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .activate-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background-color: var(--color-primary);
      margin-top: 8vh;
    }

    .activate-content {
      background-color: var(--color-secondary);
      padding: 3rem;
      border-radius: 8px;
      text-align: center;
      max-width: 800px;
      width: 100%;
    }

    .header-icon {
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
      margin-bottom: 2rem;
      font-weight: 500;
    }

    .legal-notice {
      text-align: left;
      color: var(--color-white);
      background: rgba(255, 255, 255, 0.1);
      padding: 2rem;
      border-radius: 8px;
      margin: 2rem 0;

      h3 {
        color: var(--color-accent);
        margin-bottom: 1rem;
        font-size: 1.2rem;
      }

      p {
        margin-bottom: 1rem;
        line-height: 1.5;
      }

      ul {
        margin: 1rem 0;
        padding-left: 1.5rem;

        li {
          margin-bottom: 0.8rem;
          line-height: 1.5;
        }
      }
    }

    .consent-checkboxes {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin: 2rem 0;
      text-align: left;
      color: var(--color-white);
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .error-message {
      color: #f44336;
      margin-top: 1rem;
      text-align: center;
    }

    button {
      margin-top: 1rem;
      padding: 1.2rem 3rem;
      font-size: 1.1rem;
      font-weight: 500;
      letter-spacing: 0.5px;
      border: 2px solid var(--color-accent);
      transition: all 0.3s ease;
      width: 100%;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;

      .button-text {
        letter-spacing: 2px;
        font-weight: 600;
        font-size: 1rem;
        text-transform: uppercase;
      }

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        background-color: transparent;
        color: var(--color-accent);
      }

      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
    }

    ::ng-deep {
      .mat-mdc-form-field {
        width: 100%;
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

      .mat-mdc-checkbox {
        --mdc-checkbox-selected-checkmark-color: var(--color-white);
        --mdc-checkbox-selected-focus-icon-color: var(--color-accent);
        --mdc-checkbox-selected-hover-icon-color: var(--color-accent);
        --mdc-checkbox-selected-icon-color: var(--color-accent);
        --mdc-checkbox-selected-pressed-icon-color: var(--color-accent);
      }

      .mat-mdc-raised-button.mat-accent {
        --mdc-protected-button-container-color: var(--color-accent);
        --mdc-protected-button-label-text-color: var(--color-white);
      }
    }
  `]
})
export class ActivateComponent implements OnInit {
  activateForm: FormGroup;
  isProcessing = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    this.activateForm = this.fb.group({
      productKey: ['', [Validators.required]],
      consent1: [false, Validators.requiredTrue],
      consent2: [false, Validators.requiredTrue],
      acceptTerms: [false, Validators.requiredTrue]
    });
  }

  ngOnInit() {
    // Get product key from URL if present
    this.route.queryParams.subscribe(params => {
      if (params['key']) {
        this.activateForm.patchValue({ productKey: params['key'] });
      }
    });
  }

  async onSubmit() {
    if (this.activateForm.valid) {
      this.isProcessing = true;
      this.errorMessage = null;

      try {
        const productKey = this.activateForm.get('productKey')?.value;
        const consent = {
          acceptTerms: this.activateForm.get('acceptTerms')?.value,
          consent1: this.activateForm.get('consent1')?.value,
          consent2: this.activateForm.get('consent2')?.value,
          timestamp: new Date().toISOString()
        };

        // Attempt to activate the product key with consent data
        const result = await this.userService.activateProductKey(productKey, consent);
        
        if (result) {
          // Redirect to success page
          this.router.navigate(['/activate/success']);
        } else {
          this.errorMessage = 'Die Aktivierung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.';
        }
      } catch (error: any) {
        if (error.message.includes('bereits registriert')) {
          this.errorMessage = 'Diese E-Mail-Adresse wurde bereits aktiviert. Bitte verwenden Sie die Anmeldedaten aus Ihrer Aktivierungs-E-Mail.';
        } else {
          this.errorMessage = error.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
        }
      } finally {
        this.isProcessing = false;
      }
    }
  }
} 