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
    // Create form with editable and read-only fields
    this.productForm = this.fb.group({
      // Editable fields
      name: ['', [Validators.required, Validators.minLength(1)]],
      oldPrice: [''],
      tag: [''],
      // Read-only fields
      price: [{value: '', disabled: true}],
      stripeProductId: [{value: '', disabled: true}],
      stripeFullPaymentId: [{value: '', disabled: true}],
      stripeSixMonthsId: [{value: '', disabled: true}],
      stripeTwelveMonthsId: [{value: '', disabled: true}],
      stripeEighteenMonthsId: [{value: '', disabled: true}]
    });

    if (data?.product) {
      // Set default Stripe IDs based on product name
      let stripeProductId = '';
      let stripePriceIds = {
        fullPayment: '',
        sixMonths: '',
        twelveMonths: '',
        eighteenMonths: ''
      };

      if (data.product.name === 'Horizon Academy') {
        stripeProductId = 'prod_RaJP8uJTvZnxRj';
        stripePriceIds = {
          fullPayment: 'price_1Qh8mUGmKQzZmpXRRe5qUaj1',
          sixMonths: 'price_1Qh8mUGmKQzZmpXRAq2gWoyZ',
          twelveMonths: 'price_1Qh8mUGmKQzZmpXRHn9lgRHq',
          eighteenMonths: 'price_1Qh8mUGmKQzZmpXRWXzdLWti'
        };
      } else if (data.product.name === 'Horizon Krypto') {
        stripeProductId = 'prod_RaJPLaApWZxg7X';
        stripePriceIds = {
          fullPayment: 'price_1Qh8mVGmKQzZmpXRX7Ye4whH',
          sixMonths: 'price_1Qh8mVGmKQzZmpXRchnqbJjG',
          twelveMonths: 'price_1Qh8mVGmKQzZmpXRsd01cwXP',
          eighteenMonths: 'price_1Qh8mVGmKQzZmpXRqcIJ0Lnm'
        };
      }

      // Update form with existing values
      this.productForm.patchValue({
        name: data.product.name || '',
        oldPrice: data.product.oldPrice || '',
        tag: data.product.tag || '',
        price: data.product.price || '',
        stripeProductId: data.product.stripeProductId || stripeProductId,
        stripeFullPaymentId: data.product.stripePriceIds?.fullPayment || stripePriceIds.fullPayment,
        stripeSixMonthsId: data.product.stripePriceIds?.sixMonths || stripePriceIds.sixMonths,
        stripeTwelveMonthsId: data.product.stripePriceIds?.twelveMonths || stripePriceIds.twelveMonths,
        stripeEighteenMonthsId: data.product.stripePriceIds?.eighteenMonths || stripePriceIds.eighteenMonths
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
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (this.productForm.valid) {
      const formValue = this.productForm.getRawValue();
      
      // Only include editable fields and preserve existing data
      const productData = {
        ...this.data.product,
        name: String(formValue.name || '').trim(),
        oldPrice: formValue.oldPrice ? Number(formValue.oldPrice) : null,
        tag: formValue.tag ? String(formValue.tag).trim() : null
      };

      // Keep existing Stripe data
      if (this.data.product) {
        productData.stripeProductId = this.data.product.stripeProductId;
        productData.stripePriceIds = this.data.product.stripePriceIds;
      }

      this.dialogRef.close({
        product: productData,
        file: this.selectedFile
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  removeImage(): void {
    this.imagePreview = undefined;
    this.selectedFile = undefined;
  }
} 