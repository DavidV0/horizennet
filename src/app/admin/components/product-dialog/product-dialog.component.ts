import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Product } from '../../../shared/interfaces/product.interface';

@Component({
  selector: 'app-product-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>{{ isEdit ? 'Edit' : 'Add' }} Product</h2>
      <mat-dialog-content>
        <form [formGroup]="productForm" class="product-form">
          <mat-form-field appearance="outline">
            <mat-label>ID</mat-label>
            <input matInput formControlName="id" [readonly]="isEdit">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Title</mat-label>
            <input matInput formControlName="title">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Short Description</mat-label>
            <textarea matInput formControlName="shortDescription" rows="2"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Image URL</mat-label>
            <input matInput formControlName="image">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Features (comma-separated)</mat-label>
            <textarea matInput formControlName="features" rows="2"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Benefits (comma-separated)</mat-label>
            <textarea matInput formControlName="benefits" rows="2"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Long Description</mat-label>
            <textarea matInput formControlName="longDescription" rows="4"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>CTA Text</mat-label>
            <input matInput formControlName="ctaText">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>CTA Link</mat-label>
            <input matInput formControlName="ctaLink">
          </mat-form-field>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button class="cancel-button" (click)="onCancel()">Cancel</button>
        <button mat-raised-button class="submit-button" (click)="onSubmit()" [disabled]="!productForm.valid">
          {{ isEdit ? 'Update' : 'Create' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      background-color: #1a1a1a;
      color: #ffffff;
      padding: 24px;
      border-radius: 8px;
    }

    h2 {
      color: #ffffff;
      font-size: 24px;
      margin: 0 0 24px 0;
      font-weight: 600;
    }

    .product-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 0;
      max-height: 60vh;
      overflow-y: auto;
    }

    mat-form-field {
      width: 100%;
    }

    ::ng-deep {
      .mat-mdc-form-field {
        .mat-mdc-text-field-wrapper {
          background-color: #2a2a2a;
        }

        .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__leading,
        .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__notch,
        .mdc-text-field--outlined:not(.mdc-text-field--disabled) .mdc-notched-outline__trailing {
          border-color: #3a3a3a;
        }

        .mat-mdc-form-field-focus-overlay {
          background-color: #3a3a3a;
        }

        .mdc-text-field:not(.mdc-text-field--disabled) .mdc-floating-label,
        .mdc-text-field:not(.mdc-text-field--disabled) .mdc-text-field__input {
          color: #ffffff;
        }

        textarea.mat-mdc-input-element,
        input.mat-mdc-input-element {
          color: #ffffff;
        }
      }
    }

    .mat-mdc-dialog-actions {
      padding: 24px 0 0 0;
      gap: 16px;
    }

    .cancel-button {
      color: #ffffff;
      background-color: transparent;
      border: 1px solid #ffffff;
    }

    .submit-button {
      background: linear-gradient(45deg, #FFD700, #FFA500);
      color: #000000;
      font-weight: 600;
      padding: 0 32px;

      &:disabled {
        background: #3a3a3a;
        color: #666666;
      }
    }

    ::-webkit-scrollbar {
      width: 8px;
    }

    ::-webkit-scrollbar-track {
      background: #2a2a2a;
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb {
      background: #3a3a3a;
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #4a4a4a;
    }
  `]
})
export class ProductDialogComponent {
  productForm: FormGroup;
  isEdit: boolean;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProductDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: { product?: Product }
  ) {
    this.isEdit = !!data.product;
    this.productForm = this.fb.group({
      id: [data.product?.id || '', [Validators.required, Validators.pattern('[a-z0-9-]+')]],
      title: [data.product?.title || '', Validators.required],
      shortDescription: [data.product?.shortDescription || '', Validators.required],
      description: [data.product?.description || '', Validators.required],
      image: [data.product?.image || '', Validators.required],
      features: [data.product?.features?.join(', ') || '', Validators.required],
      benefits: [data.product?.benefits?.join(', ') || '', Validators.required],
      longDescription: [data.product?.longDescription || '', Validators.required],
      ctaText: [data.product?.ctaText || '', Validators.required],
      ctaLink: [data.product?.ctaLink || '', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.productForm.valid) {
      const formValue = this.productForm.value;
      const product: Product = {
        ...formValue,
        features: formValue.features.split(',').map((f: string) => f.trim()),
        benefits: formValue.benefits.split(',').map((b: string) => b.trim())
      };
      this.dialogRef.close(product);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
} 