import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Product } from '../../../shared/interfaces/product.interface';
import { StorageService } from '../../../shared/services/storage.service';

@Component({
  selector: 'app-product-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressBarModule
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>{{ data.product ? 'Produkt bearbeiten' : 'Neues Produkt' }}</h2>
      
      <form [formGroup]="productForm" (ngSubmit)="onSubmit()">
        <div mat-dialog-content>
          <!-- Image Upload -->
          <div class="image-upload-container">
            <div class="preview-container" (click)="fileInput.click()">
              <img [src]="previewUrl || 'assets/images/placeholder.jpg'" alt="Product preview">
              <div class="upload-overlay">
                <mat-icon>cloud_upload</mat-icon>
                <span>Bild auswählen</span>
              </div>
            </div>
            <input
              #fileInput
              type="file"
              hidden
              accept="image/*"
              (change)="onFileSelected($event)"
            >
            <mat-progress-bar *ngIf="uploadProgress > 0" [value]="uploadProgress"></mat-progress-bar>
          </div>

          <!-- Title -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Titel</mat-label>
            <input matInput formControlName="title" required>
            <mat-error *ngIf="productForm.get('title')?.hasError('required')">
              Titel ist erforderlich
            </mat-error>
          </mat-form-field>

          <!-- Beschreibung -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Beschreibung</mat-label>
            <textarea matInput formControlName="description" rows="3" required></textarea>
            <mat-error *ngIf="productForm.get('description')?.hasError('required')">
              Beschreibung ist erforderlich
            </mat-error>
          </mat-form-field>

          <!-- Short Description -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Kurzbeschreibung</mat-label>
            <textarea matInput formControlName="shortDescription" rows="3" required></textarea>
            <mat-error *ngIf="productForm.get('shortDescription')?.hasError('required')">
              Kurzbeschreibung ist erforderlich
            </mat-error>
          </mat-form-field>

          <!-- Long Description -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Ausführliche Beschreibung</mat-label>
            <textarea matInput formControlName="longDescription" rows="5" required></textarea>
            <mat-error *ngIf="productForm.get('longDescription')?.hasError('required')">
              Ausführliche Beschreibung ist erforderlich
            </mat-error>
          </mat-form-field>

          <!-- Features -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Features (durch Komma getrennt)</mat-label>
            <textarea matInput formControlName="features" rows="3"></textarea>
            <mat-hint>Geben Sie die Features durch Kommas getrennt ein</mat-hint>
          </mat-form-field>

          <!-- Benefits -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Vorteile (durch Komma getrennt)</mat-label>
            <textarea matInput formControlName="benefits" rows="3"></textarea>
            <mat-hint>Geben Sie die Vorteile durch Kommas getrennt ein</mat-hint>
          </mat-form-field>

          <!-- CTA Text -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Call-to-Action Text</mat-label>
            <input matInput formControlName="ctaText">
          </mat-form-field>

          <!-- CTA Link -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Call-to-Action Link</mat-label>
            <input matInput formControlName="ctaLink">
          </mat-form-field>
        </div>

        <div mat-dialog-actions>
          <button type="button" mat-button (click)="onCancel()">Abbrechen</button>
          <button type="submit" mat-raised-button color="primary" [disabled]="!productForm.valid || isUploading">
            {{ data.product ? 'Speichern' : 'Erstellen' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: var(--spacing-lg);
      max-width: 800px;
      margin: 0 auto;
      color: var(--color-white);
    }

    ::ng-deep {
      .mdc-dialog__surface {
        background-color: var(--color-secondary) !important;
      }

      .mdc-dialog__title {
        color: var(--color-white) !important;
      }

      .mat-mdc-form-field {
        width: 100%;
        margin-bottom: var(--spacing-md);
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

    mat-dialog-content {
      padding-top: var(--spacing-md);
    }

    .full-width {
      width: 100%;
      margin-bottom: var(--spacing-md);
    }

    .image-upload-container {
      margin-bottom: var(--spacing-lg);

      .preview-container {
        position: relative;
        width: 100%;
        height: 200px;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        margin-bottom: var(--spacing-sm);
        border: 2px dashed var(--color-accent);

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .upload-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
          color: var(--color-white);

          mat-icon {
            font-size: 48px;
            width: 48px;
            height: 48px;
            margin-bottom: var(--spacing-sm);
            color: var(--color-accent);
          }

          span {
            font-size: var(--font-size-sm);
          }
        }

        &:hover .upload-overlay {
          opacity: 1;
        }
      }
    }

    mat-dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-md);
      padding: var(--spacing-lg) 0 0;
      margin-bottom: 0;

      button {
        &[type="submit"] {
          background-color: var(--color-accent);
          color: var(--color-white);
        }

        &[type="button"] {
          border: 1px solid var(--color-accent);
          color: var(--color-accent);
        }
      }
    }

    @media (max-width: 600px) {
      .dialog-container {
        padding: var(--spacing-md);
      }
    }
  `]
})
export class ProductDialogComponent {
  productForm: FormGroup;
  previewUrl: string | null = null;
  uploadProgress: number = 0;
  isUploading: boolean = false;
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProductDialogComponent>,
    private storageService: StorageService,
    @Inject(MAT_DIALOG_DATA) public data: { product: Product | null }
  ) {
    this.productForm = this.fb.group({
      title: [data.product?.title || '', Validators.required],
      description: [data.product?.description || '', Validators.required],
      shortDescription: [data.product?.shortDescription || '', Validators.required],
      longDescription: [data.product?.longDescription || '', Validators.required],
      features: [data.product?.features?.join(', ') || ''],
      benefits: [data.product?.benefits?.join(', ') || ''],
      ctaText: [data.product?.ctaText || 'Jetzt entdecken'],
      ctaLink: [data.product?.ctaLink || '/kontakt'],
      image: [data.product?.image || '']
    });

    if (data.product?.image) {
      this.previewUrl = data.product.image;
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  async uploadImage(): Promise<string | null> {
    if (!this.selectedFile) return null;

    try {
      this.isUploading = true;
      const fileName = this.storageService.generateUniqueFileName(this.selectedFile);
      const path = `product-images/${fileName}`;
      const url = await this.storageService.uploadImage(this.selectedFile, path);
      this.isUploading = false;
      return url;
    } catch (error) {
      console.error('Error uploading image:', error);
      this.isUploading = false;
      return null;
    }
  }

  async onSubmit() {
    if (this.productForm.valid) {
      let imageUrl = this.productForm.get('image')?.value;

      if (this.selectedFile) {
        const uploadedUrl = await this.uploadImage();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const productData: Product = {
        id: this.data.product?.id || Math.random().toString(36).substring(2),
        title: this.productForm.get('title')?.value,
        description: this.productForm.get('description')?.value,
        shortDescription: this.productForm.get('shortDescription')?.value,
        longDescription: this.productForm.get('longDescription')?.value,
        features: this.productForm.get('features')?.value.split(',').map((f: string) => f.trim()).filter((f: string) => f),
        benefits: this.productForm.get('benefits')?.value.split(',').map((b: string) => b.trim()).filter((b: string) => b),
        ctaText: this.productForm.get('ctaText')?.value,
        ctaLink: this.productForm.get('ctaLink')?.value,
        image: imageUrl
      };

      this.dialogRef.close(productData);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
} 