import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { UserService, UserData } from '../../../shared/services/user.service';
import { firstValueFrom } from 'rxjs';
import { Functions, getFunctions, httpsCallable } from '@angular/fire/functions';

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
export class CheckoutComponent implements OnInit, OnDestroy {
  checkoutForm: FormGroup;
  cartProducts: ShopProduct[] = [];
  monthlyTotal = 0;
  fullTotal = 0;
  isProcessing = false;
  paymentError: string | null = null;
  currentStep = 1;
  formSubmitted = false;
  private eventsSubscription?: Subscription;
  paymentPlans = [
    { months: 0, label: 'Vollständige Zahlung' },
    { months: 6, label: '6 Monatsraten' },
    { months: 12, label: '12 Monatsraten' },
    { months: 18, label: '18 Monatsraten' }
  ];
  private stripe: Stripe | null = null;
  private readonly STRIPE_TEST_KEY = 'pk_test_51OgPQbHVdYxhGPFPxQGPGPwxZBxZBxZBxZBxZBxZBxZBxZBxZBxZBxZBxZBxZB'; // Ersetze mit deinem Test Key

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private shopService: ShopService,
    private paymentService: PaymentService,
    private userService: UserService,
    private router: Router,
    private functions: Functions
  ) {
    this.checkoutForm = this.fb.group({
      firstName: ['Max', [Validators.required, Validators.minLength(2)]],
      lastName: ['Mustermann', [Validators.required, Validators.minLength(2)]],
      email: ['david.v@atg-at.net', [Validators.required, Validators.email]],
      street: ['Musterstraße', [Validators.required, Validators.minLength(3)]],
      streetNumber: ['123', [Validators.required]],
      zipCode: ['1234', [Validators.required, Validators.pattern('^[0-9]{4,5}$')]],
      city: ['Wien', [Validators.required, Validators.minLength(2)]],
      country: ['Austria', Validators.required],
      language: ['German', Validators.required],
      mobile: ['06641234567', [Validators.required, Validators.pattern('^[+]?[0-9]{10,13}$')]],
      phone: [''],
      useShippingAsBilling: [true],
      acceptTerms: [false, Validators.requiredTrue],
      newsletter: [false],
      paymentPlan: [0, Validators.required],
      cardholderName: ['Max Mustermann', [Validators.required, Validators.minLength(2)]],
      cardNumber: ['4242 4242 4242 4242', [Validators.required, Validators.pattern('^[0-9]{4}\\s[0-9]{4}\\s[0-9]{4}\\s[0-9]{4}$')]],
      expiryMonth: ['12', [Validators.required, Validators.pattern('^(0[1-9]|1[0-2])$')]],
      expiryYear: ['25', [Validators.required, Validators.pattern('^[0-9]{2}$')]],
      cvv: ['123', [Validators.required, Validators.pattern('^[0-9]{3,4}$')]]
    });

    this.checkoutForm.get('paymentPlan')?.valueChanges.subscribe(() => {
      this.calculateTotals();
    });
  }

  async ngOnInit() {
    await this.initializeStripe();
    this.loadCartProducts();
  }

  private async initializeStripe() {
    try {
      this.stripe = await loadStripe(this.STRIPE_TEST_KEY);
      if (!this.stripe) {
        throw new Error('Stripe failed to initialize');
      }
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      this.paymentError = 'Failed to initialize payment system. Please try again later.';
    }
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
    this.fullTotal = this.cartProducts.reduce((sum, product) => sum + product.price, 0);
    const selectedPlan = this.checkoutForm.get('paymentPlan')?.value;
    
    if (selectedPlan === 0) {
      this.monthlyTotal = this.fullTotal;
    } else {
      this.monthlyTotal = this.fullTotal / selectedPlan;
    }
  }

  getMonthlyPrice(price: number): number {
    const selectedPlan = this.checkoutForm.get('paymentPlan')?.value;
    return selectedPlan === 0 ? price : price / selectedPlan;
  }

  formatCardNumber(event: any) {
    let value = event.target.value.replace(/\s/g, '').substring(0, 16);
    let formattedValue = '';
    
    for(let i = 0; i < value.length; i++) {
      if(i > 0 && i % 4 === 0) {
        formattedValue += ' ';
      }
      formattedValue += value[i];
    }
    
    this.checkoutForm.get('cardNumber')?.setValue(formattedValue, { emitEvent: false });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.checkoutForm.get(fieldName);
    if (!control || !control.errors) return '';

    const errors = control.errors;
    if (errors['required']) return 'Dieses Feld ist erforderlich';
    if (errors['email']) return 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    if (errors['minlength']) return `Mindestens ${errors['minlength'].requiredLength} Zeichen erforderlich`;
    if (errors['pattern']) {
      switch (fieldName) {
        case 'mobile':
          return 'Bitte geben Sie eine gültige Telefonnummer ein';
        case 'zipCode':
          return 'Bitte geben Sie eine gültige Postleitzahl ein';
        case 'cardNumber':
          return 'Bitte geben Sie eine gültige Kartennummer ein';
        case 'expiryMonth':
          return 'Ungültiger Monat';
        case 'expiryYear':
          return 'Ungültiges Jahr';
        case 'cvv':
          return 'Ungültiger Sicherheitscode';
        default:
          return 'Ungültiges Format';
      }
    }
    return '';
  }

  proceedToPayment() {
    this.formSubmitted = true;
    console.log('Form submitted:', this.checkoutForm.value);
    
    // Temporär die acceptTerms-Validierung ausschließen
    const isValid = Object.keys(this.checkoutForm.controls)
      .filter(key => key !== 'acceptTerms' && 
                    key !== 'cardholderName' && 
                    key !== 'cardNumber' && 
                    key !== 'expiryMonth' && 
                    key !== 'expiryYear' && 
                    key !== 'cvv')
      .every(key => !this.checkoutForm.get(key)?.errors);
    
    console.log('Form valid (without payment fields):', isValid);
    
    if (isValid) {
      console.log('Proceeding to payment step');
      this.currentStep = 2;
      
      // Ensure DOM is updated before initializing Stripe
      setTimeout(() => {
        this.initializeStripe();
      }, 100);
    } else {
      console.log('Form validation errors:');
      Object.keys(this.checkoutForm.controls)
        .filter(key => key !== 'acceptTerms' && 
                      key !== 'cardholderName' && 
                      key !== 'cardNumber' && 
                      key !== 'expiryMonth' && 
                      key !== 'expiryYear' && 
                      key !== 'cvv')
        .forEach(key => {
          const control = this.checkoutForm.get(key);
          if (control?.invalid) {
            console.log(`${key} errors:`, control.errors);
            control.markAsTouched();
          }
        });
    }
  }

  editCustomerData() {
    this.currentStep = 1;
  }

  async onSubmit() {
    if (this.checkoutForm.valid) {
      this.isProcessing = true;
      this.paymentError = null;

      try {
        // Generate product key
        const productKey = this.generateProductKey();

        // Create user data
        const userData: UserData = {
          firstName: this.checkoutForm.get('firstName')?.value,
          lastName: this.checkoutForm.get('lastName')?.value,
          email: this.checkoutForm.get('email')?.value,
          street: this.checkoutForm.get('street')?.value,
          streetNumber: this.checkoutForm.get('streetNumber')?.value,
          zipCode: this.checkoutForm.get('zipCode')?.value,
          city: this.checkoutForm.get('city')?.value,
          country: this.checkoutForm.get('country')?.value,
          mobile: this.checkoutForm.get('mobile')?.value,
          paymentPlan: this.checkoutForm.get('paymentPlan')?.value,
          purchaseDate: new Date(),
          productKey: productKey,
          status: 'pending_activation',
          keyActivated: false,
          accountActivated: false
        };

        // Save product key with user data
        await this.userService.createUser(userData);

        // Clear cart
        this.cartService.clearCart();

        // Redirect to success page
        this.router.navigate(['/success']);
      } catch (error: any) {
        console.error('Checkout error:', error);
        this.paymentError = error.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
      } finally {
        this.isProcessing = false;
      }
    }
  }

  private generateProductKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = Array(4).fill(0).map(() => {
      return Array(4).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
    });
    return segments.join('-');
  }

  ngOnDestroy() {
    if (this.eventsSubscription) {
      this.eventsSubscription.unsubscribe();
    }
  }
} 
