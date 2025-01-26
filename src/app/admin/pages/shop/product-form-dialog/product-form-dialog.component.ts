import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { ShopService } from '../../../../shared/services/shop.service';
import { CourseService } from '../../../../shared/services/course.service';
import { Course } from '../../../../shared/models/course.model';
import { ShopProduct } from '../../../../shared/interfaces/shop-product.interface';
import { Observable } from 'rxjs';

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
    MatProgressBarModule,
    MatSelectModule,
    MatChipsModule
  ]
})
export class ProductFormDialogComponent implements OnInit {
  productForm: FormGroup;
  imagePreview: string | undefined;
  uploadProgress: number = 0;
  isUploading: boolean = false;
  selectedFile: File | undefined;
  isLoading = false;
  courses$!: Observable<Course[]>;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProductFormDialogComponent>,
    private shopService: ShopService,
    private courseService: CourseService,
    @Inject(MAT_DIALOG_DATA) public data: { product?: ShopProduct }
  ) {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      description: ['', [Validators.required]],
      price: ['', [Validators.required, Validators.min(0)]],
      oldPrice: [''],
      courseIds: [[], Validators.required],
      tag: ['']
    });

    if (this.data?.product) {
      this.productForm.patchValue(this.data.product);
      if (this.data.product.image) {
        this.imagePreview = this.data.product.image;
      }
    }
  }

  async ngOnInit() {
    // Load available courses
    this.courses$ = this.courseService.getCourses('ADMIN');
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

  async onSubmit(): Promise<void> {
    if (this.productForm.valid && (this.selectedFile || this.data?.product?.image)) {
      this.isLoading = true;
      try {
        const formValue = this.productForm.getRawValue();
        
        const productData: Partial<ShopProduct> = {
          name: formValue.name.trim(),
          description: formValue.description.trim(),
          price: Number(formValue.price),
          oldPrice: formValue.oldPrice ? Number(formValue.oldPrice) : undefined,
          tag: formValue.tag ? formValue.tag.trim() : undefined,
          courseIds: formValue.courseIds,
          image: this.data?.product?.image || '', // Will be updated after upload
          stripeProductId: this.data?.product?.stripeProductId || '', // Will be set by the service
          stripePriceIds: this.data?.product?.stripePriceIds || {
            fullPayment: '',
            sixMonths: '',
            twelveMonths: '',
            eighteenMonths: ''
          }
        };

        this.dialogRef.close({
          product: productData,
          file: this.selectedFile
        });
      } catch (error) {
        console.error('Error saving product:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  removeImage(): void {
    this.imagePreview = undefined;
    this.selectedFile = undefined;
    if (this.data?.product) {
      this.data.product.image = '';
    }
  }
} 