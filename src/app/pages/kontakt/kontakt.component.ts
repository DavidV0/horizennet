import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContactSectionComponent } from '../../core/components/contact-section/contact-section.component';

@Component({
  selector: 'app-kontakt',
  standalone: true,
  imports: [
    CommonModule,
    ContactSectionComponent,
  ],
  templateUrl: './kontakt.component.html',
  styleUrls: ['./kontakt.component.scss'],
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
    }
  `]
})
export class KontaktComponent {

} 