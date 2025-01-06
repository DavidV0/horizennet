import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { CartService } from '../../../shared/services/cart.service';
import { ShopService } from '../../../shared/services/shop.service';
import { ShopProduct } from '../../../shared/interfaces/shop-product.interface';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSelectModule,
    RouterModule
  ],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {
  checkoutForm: FormGroup;
  cartProducts: ShopProduct[] = [];
  monthlyTotal = 0;

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private shopService: ShopService
  ) {
    this.checkoutForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      street: ['', Validators.required],
      streetNumber: [''],
      zipCode: ['', Validators.required],
      city: ['', Validators.required],
      country: ['Austria', Validators.required],
      language: ['German', Validators.required],
      mobile: ['', Validators.required],
      phone: [''],
      isCompany: [false],
      companyName: [''],
      useShippingAsBilling: [true],
      acceptTerms: [false, Validators.requiredTrue],
      newsletter: [false]
    });
  }

  ngOnInit() {
    this.loadCartProducts();
  }

  private async loadCartProducts() {
    const cartItems = Array.from(this.cartService.getCartItems());
    const products = await this.shopService.getAllProducts().toPromise();
    
    if (products) {
      this.cartProducts = products.filter(product => 
        cartItems.includes(product.id)
      );
      
      this.calculateTotals();
    }
  }

  private calculateTotals() {
    this.monthlyTotal = this.cartProducts.reduce((sum, product) => 
      sum + (product.price / 18), 0
    );
  }

  onSubmit() {
    if (this.checkoutForm.valid) {
      console.log('Form submitted:', this.checkoutForm.value);
      // Here we would handle the order submission
    }
  }

  getMonthlyPrice(price: number): number {
    return price / 18;
  }
} 