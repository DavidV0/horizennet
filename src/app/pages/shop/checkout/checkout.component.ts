import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule, Router } from '@angular/router';
import { CartService } from '../../../shared/services/cart.service';
import { ShopService } from '../../../shared/services/shop.service';
import { PaymentService } from '../../../shared/services/payment.service';
import { ShopProduct } from '../../../shared/interfaces/shop-product.interface';
import { Subscription } from 'rxjs';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { environment } from '../../../../environments/environment';
import { HttpClientModule } from '@angular/common/http';

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
    RouterModule,
    HttpClientModule
  ],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit, OnDestroy {
  @ViewChild('cardElement') cardElement?: ElementRef;
  
  checkoutForm: FormGroup;
  cartProducts: ShopProduct[] = [];
  monthlyTotal = 0;
  isProcessing = false;
  paymentError: string | null = null;
  private eventsSubscription?: Subscription;
  private card: any;
  private stripe: Stripe | null = null;

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private shopService: ShopService,
    private paymentService: PaymentService,
    private router: Router
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

  async ngOnInit() {
    this.loadCartProducts();
    await this.initializeStripe();
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

  private async initializeStripe() {
    try {
      this.stripe = await loadStripe(environment.stripePublishableKey);
      
      if (!this.stripe) {
        throw new Error('Stripe failed to initialize');
      }

      // Create card element
      const elements = this.stripe.elements();
      
      this.card = elements.create('card', {
        style: {
          base: {
            color: '#ffffff',
            fontFamily: '"DM Sans", sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
              color: '#aab7c4'
            }
          },
          invalid: {
            color: '#fa755a',
            iconColor: '#fa755a'
          }
        }
      });

      // Mount the card element
      this.card.mount('#card-element');

      // Handle real-time validation errors
      this.card.addEventListener('change', (event: any) => {
        const displayError = document.getElementById('card-errors');
        if (displayError) {
          displayError.textContent = event.error ? event.error.message : '';
        }
      });
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      this.paymentError = 'Failed to initialize payment system. Please try again later.';
    }
  }

  async onSubmit() {
    if (this.checkoutForm.valid && this.stripe && this.card) {
      this.isProcessing = true;
      this.paymentError = null;

      try {
        // Create payment method
        const { paymentMethod, error: paymentMethodError } = await this.stripe.createPaymentMethod({
          type: 'card',
          card: this.card,
          billing_details: {
            name: `${this.checkoutForm.get('firstName')?.value} ${this.checkoutForm.get('lastName')?.value}`,
            email: this.checkoutForm.get('email')?.value,
            address: {
              line1: `${this.checkoutForm.get('street')?.value} ${this.checkoutForm.get('streetNumber')?.value}`,
              postal_code: this.checkoutForm.get('zipCode')?.value,
              city: this.checkoutForm.get('city')?.value,
              country: this.checkoutForm.get('country')?.value
            }
          }
        });

        if (paymentMethodError) {
          throw paymentMethodError;
        }

        // Create payment intent
        const clientSecret = await this.paymentService.createPaymentIntent(this.monthlyTotal * 100);

        // Confirm payment
        const { error: confirmError } = await this.stripe.confirmCardPayment(clientSecret, {
          payment_method: paymentMethod.id
        });

        if (confirmError) {
          throw confirmError;
        }

        // Handle successful payment
        this.cartService.clearCart();
        this.router.navigate(['/shop/success']);
      } catch (error: any) {
        console.error('Payment error:', error);
        this.paymentError = error.message || 'An error occurred during payment. Please try again.';
      } finally {
        this.isProcessing = false;
      }
    }
  }

  getMonthlyPrice(price: number): number {
    return price / 18;
  }

  ngOnDestroy() {
    if (this.eventsSubscription) {
      this.eventsSubscription.unsubscribe();
    }
    if (this.card) {
      this.card.destroy();
    }
  }
} 