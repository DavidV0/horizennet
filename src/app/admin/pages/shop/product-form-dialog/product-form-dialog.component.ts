import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-product-form-dialog',
  templateUrl: './product-form-dialog.component.html',
  styleUrls: ['./product-form-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressBarModule
  ]
})
export class ProductFormDialogComponent {
  productForm: FormGroup;
  imagePreview: string | undefined;
  uploadProgress: number = 0;
  isUploading: boolean = false;
  selectedFile: File | undefined;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProductFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: string; product?: any }
  ) {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      price: ['', [Validators.required, Validators.min(0.01)]],
      oldPrice: [''],
      tag: [''],
      image: ['']
    });

    if (data?.product) {
      this.productForm.patchValue({
        name: data.product.name || '',
        price: data.product.price || '',
        oldPrice: data.product.oldPrice || '',
        tag: data.product.tag || '',
        image: data.product.image || ''
      });

      if (data.product.image) {
        this.imagePreview = data.product.image;
      }
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
        this.productForm.patchValue({ image: '' });
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.productForm.valid) {
      const formValue = this.productForm.getRawValue();
      
      // Konvertiere und validiere die Daten
      const productData = {
        name: String(formValue.name || '').trim(),
        price: Number(formValue.price || 0),
        oldPrice: formValue.oldPrice ? Number(formValue.oldPrice) : null,
        tag: formValue.tag ? String(formValue.tag).trim() : null,
        image: formValue.image || null
      };

      console.log('Submitting product data:', productData); // Debug-Log

      this.dialogRef.close({
        product: productData,
        file: this.selectedFile
      });
    } else {
      console.log('Form validation errors:', this.productForm.errors); // Debug-Log
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  removeImage(): void {
    this.imagePreview = undefined;
    this.selectedFile = undefined;
    this.productForm.patchValue({ image: '' });
  }
} 