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

          <div class="checkbox-row">
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
      max-width: 600px;
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

    form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .checkbox-row {
      margin: 0.5rem 0;
      color: var(--color-white);
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
      productKey: ['', [Validators.required, Validators.pattern('^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$')]],
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
        const acceptTerms = this.activateForm.get('acceptTerms')?.value;

        // Attempt to activate the product key
        const result = await this.userService.activateProductKey(productKey, acceptTerms);
        
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