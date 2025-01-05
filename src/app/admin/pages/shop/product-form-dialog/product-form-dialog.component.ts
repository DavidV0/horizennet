import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { ShopService } from '../../../../shared/services/shop.service';
import { ShopProduct } from '../../../../shared/interfaces/shop-product.interface';

@Component({
  selector: 'app-product-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './product-form-dialog.component.html',
  styleUrls: ['./product-form-dialog.component.scss']
})
export class ProductFormDialogComponent {
  productForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProductFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ShopProduct
  ) {
    this.productForm = this.fb.group({
      name: [data?.name || '', Validators.required],
      price: [data?.price || '', [Validators.required, Validators.min(0)]],
      oldPrice: [data?.oldPrice || ''],
      tag: [data?.tag || ''],
      image: [data?.image || 'assets/products/default.jpg', Validators.required]
    });
  }

  onSubmit() {
    if (this.productForm.valid) {
      const productData = {
        ...this.productForm.value,
        price: Number(this.productForm.value.price),
        oldPrice: this.productForm.value.oldPrice ? Number(this.productForm.value.oldPrice) : null
      };

      this.dialogRef.close(productData);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
} 