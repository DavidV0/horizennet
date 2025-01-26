import { Component, OnInit, OnDestroy, ElementRef, ViewChild, PLATFORM_ID, Inject, ChangeDetectorRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { RouterModule, Router } from '@angular/router';
import { CartService } from '../../../shared/services/cart.service';
import { ShopService } from '../../../shared/services/shop.service';
import { PaymentService, PaymentIntent, Subscription as StripeSubscription } from '../../../shared/services/payment.service';
import { ShopProduct } from '../../../shared/interfaces/shop-product.interface';
import { Subscription } from 'rxjs';
import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
import { environment } from '../../../../environments/environment';
import { UserService, UserData } from '../../../shared/services/user.service';
import { firstValueFrom } from 'rxjs';
import { Functions, getFunctions, httpsCallable } from '@angular/fire/functions';
import { PaymentScheduleDialogComponent } from './payment-schedule-dialog/payment-schedule-dialog.component';
import { StripeService } from '../../../shared/services/stripe.service';
import { isPlatformBrowser } from '@angular/common';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../shared/services/auth.service';
import { User } from '@angular/fire/auth';

// Test card numbers
const TEST_CARDS = {
  success: '4242424242424242',
  declinedGeneric: '4000000000000002',
  declinedInsufficient: '4000000000009995',
  declinedExpired: '4000000000000069',
  declinedCVC: '4000000000000127',
  requires3DSecure: '4000000000003220'
};

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
    MatIconModule,
    MatDialogModule,
    RouterModule
  ],
  providers: [AuthService, UserService],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('cardElement', { static: false }) cardElement!: ElementRef;
  
  private card?: StripeCardElement;
  private stripe?: Stripe;
  private elements?: StripeElements;
  checkoutForm: FormGroup;
  cartProducts: ShopProduct[] = [];
  monthlyTotal = 0;
  fullTotal = 0;
  isProcessing = false;
  paymentError: string = '';
  currentStep = 1;
  formSubmitted = false;
  private eventsSubscription?: Subscription;
  paymentPlans = [
    { months: 0, label: 'Vollständige Zahlung' },
    { months: 6, label: '6 Monatsraten' },
    { months: 12, label: '12 Monatsraten' },
    { months: 18, label: '18 Monatsraten' }
  ];
  private shouldInitStripe: boolean = false;
  paymentIntent?: PaymentIntent;
  stripeSubscription?: StripeSubscription;
  isSubscription: boolean = false;
  customerId: string = '';
  private apiUrl: string;

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private shopService: ShopService,
    private paymentService: PaymentService,
    private userService: UserService,
    private router: Router,
    private dialog: MatDialog,
    private functions: Functions,
    private stripeService: StripeService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    private auth: AngularFireAuth,
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.checkoutForm = this.fb.group({
      firstName: ['Max', [Validators.required, Validators.minLength(2)]],
      lastName: ['Mustermann', [Validators.required, Validators.minLength(2)]],
      email: ['david.v@atg-at.net', [Validators.required, Validators.email]],
      street: ['Musterstraße', [Validators.required, Validators.minLength(3)]],
      streetNumber: ['123', [Validators.required]],
      zipCode: ['1234', [Validators.required, Validators.pattern('^[0-9]{4}$')]],
      city: ['Wien', [Validators.required, Validators.minLength(2)]],
      country: ['Austria', Validators.required],
      language: ['German', Validators.required],
      mobile: ['06641234567', [Validators.required, Validators.pattern('^[+]?[0-9]{10,13}$')]],
      phone: [''],
      useShippingAsBilling: [true],
      acceptTerms: [false, Validators.requiredTrue],
      newsletter: [false],
      becomePartner: [false],
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

    this.apiUrl = environment.apiUrl;
  }

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      await this.loadCartProducts();
      // Don't initialize Stripe here
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Don't initialize Stripe here either
      this.shouldInitStripe = true;
      this.cdr.detectChanges();
    }
  }

  ngAfterViewChecked() {
    if (this.shouldInitStripe && this.cardElement?.nativeElement && !this.stripe) {
      this.shouldInitStripe = false;
      this.initializeStripeAndMount();
    }
  }

  private async initializeStripeAndMount() {
    try {
      if (!this.cardElement?.nativeElement) {
        console.log('Card element container not ready');
        return;
      }

      if (this.stripe && this.card) {
        console.log('Stripe already initialized');
        return;
      }

      const stripeInstance = await loadStripe(environment.stripePublishableKey);
      
      if (!stripeInstance) {
        throw new Error('Stripe konnte nicht initialisiert werden');
      }

      this.stripe = stripeInstance;
      this.elements = this.stripe.elements();
      
      if (!this.elements) {
        throw new Error('Stripe Elements konnten nicht erstellt werden');
      }

      // Clean up old card instance if it exists
      if (this.card) {
        this.card.destroy();
        this.card = undefined;
      }

      // Create and mount the new card element
      this.card = this.elements.create('card', {
        style: {
          base: {
            color: '#ffffff',
            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
              color: '#aab7c4'
            },
            ':-webkit-autofill': {
              color: '#ffffff'
            }
          },
          invalid: {
            color: '#fa755a',
            iconColor: '#fa755a'
          }
        },
        hidePostalCode: true
      });

      this.card.mount(this.cardElement.nativeElement);

      this.card.on('change', (event) => {
        if (event.error) {
          this.paymentError = event.error.message;
        } else {
          this.paymentError = '';
        }
        this.cdr.detectChanges();
      });

    } catch (error) {
      console.error('Stripe initialization error:', error);
      this.paymentError = 'Fehler beim Initialisieren des Zahlungssystems. Bitte laden Sie die Seite neu.';
      this.cdr.detectChanges();
    }
  }

  private setCurrentStep(step: number, isPaymentStep: boolean = false) {
    this.currentStep = step;
    if (step === 2 && isPaymentStep && isPlatformBrowser(this.platformId)) {
      // Set flag to initialize Stripe and trigger change detection
      this.shouldInitStripe = true;
      this.cdr.detectChanges();
      
      // Give the DOM time to update before attempting to mount
      setTimeout(() => {
        if (!this.stripe || !this.card) {
          this.initializeStripeAndMount();
        }
      }, 100);
    }
  }

  private async loadCartProducts() {
    const cartItems = Array.from(this.cartService.getCartItems());
    const products = await firstValueFrom(this.shopService.getAllProducts());
    
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

  async proceedToPayment(): Promise<void> {
    this.formSubmitted = true;
    this.paymentError = '';
    
    try {
      // First validate the customer information form
      const isValid = Object.keys(this.checkoutForm.controls)
        .filter(key => key !== 'acceptTerms' && 
                      key !== 'cardholderName' && 
                      key !== 'paymentPlan' &&
                      key !== 'newsletter' &&
                      key !== 'becomePartner' &&
                      key !== 'cardNumber' &&
                      key !== 'expiryMonth' &&
                      key !== 'expiryYear' &&
                      key !== 'cvv')
        .every(key => !this.checkoutForm.get(key)?.errors);
      
      if (!isValid) {
        Object.keys(this.checkoutForm.controls).forEach(key => {
          const control = this.checkoutForm.get(key);
          if (control) {
            control.markAsTouched();
          }
        });
        return;
      }

      // Move to payment step
      this.setCurrentStep(2, true);
      
      // Wait for Stripe to initialize
      let attempts = 0;
      while (!this.stripe || !this.card) {
        if (attempts >= 50) { // 5 seconds timeout
          throw new Error('Zeitüberschreitung beim Initialisieren des Zahlungssystems');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      // Create customer first
      const formValues = this.checkoutForm.value;
      const fullName = `${formValues.firstName} ${formValues.lastName}`;
      
      const customerData = await firstValueFrom(
        this.stripeService.createCustomer({
          email: formValues.email,
          name: fullName
        })
      );

      if (!customerData) {
        throw new Error('Kunde konnte nicht erstellt werden');
      }

      // Don't proceed with payment yet, just store the customer ID
      this.customerId = customerData.id;

    } catch (error: any) {
      console.error('Payment error:', error);
      this.paymentError = error.message || 'Ein unerwarteter Fehler ist aufgetreten.';
      this.cdr.detectChanges();
    }
  }

  editCustomerData() {
    this.setCurrentStep(1);
  }

  async onSubmit() {
    if (!this.checkoutForm.valid || !this.stripe || !this.card) {
      return;
    }

    this.isProcessing = true;
    this.paymentError = '';

    try {
      const formValues = this.checkoutForm.value;
      const fullName = `${formValues.firstName} ${formValues.lastName}`;

      // Erstelle oder hole den Kunden
      try {
        console.log('Creating/retrieving customer...');
        const customerResponse = await firstValueFrom(
          this.stripeService.createCustomer({
            email: formValues.email,
            name: fullName
          })
        );
        this.customerId = customerResponse.id;
        console.log('Customer created/retrieved:', this.customerId);
      } catch (customerError: any) {
        console.error('Error creating customer:', customerError);
        throw new Error('Fehler beim Erstellen des Kundenprofils');
      }

      if (!this.customerId) {
        throw new Error('Kundenprofil konnte nicht erstellt werden');
      }

      // Create payment method with 3D Secure support
      const { paymentMethod, error: paymentMethodError } = await this.stripe.createPaymentMethod({
        type: 'card',
        card: this.card,
        billing_details: {
          name: fullName,
          email: formValues.email,
          address: {
            line1: `${formValues.street} ${formValues.streetNumber}`,
            postal_code: formValues.zipCode,
            city: formValues.city,
            country: this.getCountryCode(formValues.country)
          }
        }
      });

      if (paymentMethodError) {
        throw new Error(paymentMethodError.message);
      }

      if (!paymentMethod) {
        throw new Error('Zahlungsmethode konnte nicht erstellt werden');
      }

      // Process payment with existing customer ID and handle 3D Secure
      await this.processPaymentAndOrder(this.customerId, paymentMethod.id);

    } catch (error: any) {
      console.error('Payment error:', error);
      this.paymentError = error.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
    } finally {
      this.isProcessing = false;
      this.cdr.detectChanges();
    }
  }

  private getCountryCode(country: string | undefined): string {
    const countryMap: { [key: string]: string } = {
      'Austria': 'AT',
      'Österreich': 'AT'
    };
    return countryMap[country || ''] || 'AT';
  }

  private async processPaymentAndOrder(customerId: string, paymentMethodId: string) {
    const selectedPlan = this.checkoutForm.get('paymentPlan')?.value;
    this.isSubscription = selectedPlan > 0;
    
    try {
      if (this.isSubscription) {
        // Handle subscription payment
        const priceId = this.getStripePriceId(selectedPlan);
        console.log('Creating subscription with:', { priceId, customerId, paymentMethodId });
        
        this.stripeSubscription = await firstValueFrom(
          this.paymentService.createSubscription(
            priceId,
            customerId,
            paymentMethodId
          )
        );

        console.log('Subscription created:', this.stripeSubscription);

        if (this.stripeSubscription.status === 'active') {
          console.log('Subscription is active, completing order');
          await this.completeOrder(customerId);
        } else if (this.stripeSubscription.status === 'incomplete' || 
                  this.stripeSubscription.status === 'requires_payment_method' ||
                  this.stripeSubscription.status === 'requires_action') {
          console.log('Subscription requires payment confirmation');
          
          // Use the client secret from the subscription response
          const clientSecret = this.stripeSubscription.clientSecret;
          
          if (clientSecret) {
            console.log('Confirming card payment with client secret:', clientSecret);
            const { paymentIntent, error } = await this.stripe!.confirmCardPayment(
              clientSecret,
              {
                payment_method: paymentMethodId,
                return_url: window.location.origin + '/payment-success'
              }
            );

            if (error) {
              console.error('Payment confirmation error:', error);
              throw new Error(error.message);
            }

            console.log('Payment intent after confirmation:', paymentIntent);

            if (paymentIntent && paymentIntent.status === 'succeeded') {
              console.log('Payment confirmed, completing order');
              await this.completeOrder(customerId);
            } else if (paymentIntent && paymentIntent.status === 'requires_payment_method') {
              throw new Error('Die Zahlung wurde abgelehnt. Bitte überprüfen Sie Ihre Zahlungsinformationen.');
            } else if (paymentIntent && paymentIntent.status === 'requires_action') {
              // Handle 3D Secure authentication
              const { error: confirmError } = await this.stripe!.confirmCardPayment(clientSecret);
              if (confirmError) {
                throw new Error(confirmError.message);
              }
              await this.completeOrder(customerId);
            } else {
              throw new Error(`Unerwarteter Zahlungsstatus: ${paymentIntent?.status}`);
            }
          } else {
            throw new Error('Kein Client Secret in der Antwort gefunden');
          }
        } else if (this.stripeSubscription.status === 'past_due' ||
                  this.stripeSubscription.status === 'unpaid') {
          // These statuses still indicate a successful subscription creation
          console.log(`Subscription is in ${this.stripeSubscription.status} status, completing order`);
          await this.completeOrder(customerId);
        } else {
          throw new Error(`Unerwarteter Abonnementstatus: ${this.stripeSubscription.status}`);
        }
      } else {
        // Handle one-time payment
        const amount = this.calculatePriceWithVAT(this.fullTotal); // Amount in euros
        console.log('Creating payment intent:', { amount: amount * 100, customerId, paymentMethodId });
        
        this.paymentIntent = await firstValueFrom(
          this.paymentService.createPaymentIntent(amount * 100, {
            customer: customerId,
            payment_method: paymentMethodId,
            currency: 'eur'
          })
        );

        console.log('Payment intent created:', this.paymentIntent);

        if (!this.paymentIntent?.clientSecret) {
          throw new Error('Fehler beim Erstellen der Zahlung');
        }

        // Immer zuerst die Zahlung bestätigen
        console.log('Confirming card payment with client secret:', this.paymentIntent.clientSecret);
        const { paymentIntent: confirmedIntent, error: confirmError } = await this.stripe!.confirmCardPayment(
          this.paymentIntent.clientSecret,
          {
            payment_method: paymentMethodId,
            return_url: window.location.origin + '/payment-success'
          }
        );

        if (confirmError) {
          console.error('Payment confirmation error:', confirmError);
          throw new Error(confirmError.message);
        }

        console.log('Payment intent after confirmation:', confirmedIntent);

        if (confirmedIntent?.status === 'succeeded') {
          console.log('Payment confirmed, completing order');
          await this.completeOrder(customerId);
        } else if (confirmedIntent?.status === 'requires_action') {
          console.log('3D Secure authentication required');
          // Der Browser wird automatisch zur 3D Secure Seite weitergeleitet
        } else {
          throw new Error(`Unerwarteter Zahlungsstatus: ${confirmedIntent?.status}`);
        }
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      this.handlePaymentError(error);
    }
  }

  private handlePaymentError(error: any) {
    let errorMessage = 'Ein Fehler ist aufgetreten.';

    if (error.type === 'card_error') {
      switch (error.code) {
        case 'card_declined':
          errorMessage = 'Die Karte wurde abgelehnt.';
          break;
        case 'expired_card':
          errorMessage = 'Die Karte ist abgelaufen.';
          break;
        case 'incorrect_cvc':
          errorMessage = 'Der Sicherheitscode ist falsch.';
          break;
        case 'processing_error':
          errorMessage = 'Ein Fehler bei der Verarbeitung ist aufgetreten. Bitte versuchen Sie es erneut.';
          break;
        case 'insufficient_funds':
          errorMessage = 'Die Karte hat nicht genügend Guthaben.';
          break;
      }
    }

    this.paymentError = errorMessage;
    this.isProcessing = false;
    this.cdr.detectChanges();
  }

  private async retryFailedPayment() {
    if (!this.paymentIntent) return;

    try {
      const updatedPaymentIntent = await firstValueFrom(
        this.paymentService.retryFailedPayment(this.paymentIntent.id)
      );

      if (updatedPaymentIntent.status === 'succeeded') {
        await this.completeOrder(updatedPaymentIntent.id);
      }
    } catch (error) {
      this.handlePaymentError(error);
    }
  }

  // Helper method to check subscription status
  private async checkSubscriptionStatus(subscriptionId: string) {
    try {
      const subscription = await firstValueFrom(
        this.paymentService.getSubscriptionStatus(subscriptionId)
      );

      if (subscription.status === 'past_due') {
        // Handle past due subscription (e.g., show warning to user)
        console.warn('Subscription payment is past due');
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  }

  private async completeOrder(customerId: string) {
    try {
      const formValues = this.checkoutForm.value;
      const orderId = this.isSubscription ? this.stripeSubscription?.id : this.paymentIntent?.id;
      
      if (!orderId) {
        throw new Error('No order ID found');
      }

      // Überprüfen Sie den Zahlungsstatus
      if (this.isSubscription) {
        const subscription = await firstValueFrom(
          this.paymentService.getSubscriptionStatus(orderId)
        );
        if (subscription.status !== 'active' && subscription.status !== 'trialing') {
          throw new Error('Zahlung wurde nicht bestätigt');
        }
      } else {
        const paymentIntent = await firstValueFrom(
          this.paymentService.getPaymentIntent(orderId)
        );
        if (paymentIntent.status !== 'succeeded') {
          throw new Error('Zahlung wurde nicht bestätigt');
        }
      }

      console.log('Payment confirmed, processing order:', { orderId, isSubscription: this.isSubscription });
      
      // Clear cart first
      this.cartService.clearCart();
      
      // Get purchased course IDs
      const purchasedCourses = this.cartProducts.map(product => product.courseIds);
      
      // Activate course access for each purchased product
      for (const product of this.cartProducts) {
        try {
          await this.userService.activateProductAccess(customerId, orderId, product);
          console.log('Product access activated:', product.courseIds);
        } catch (accessError) {
          console.error('Error activating product access:', accessError);
          // Continue with other products
        }
      }
      
      // Send purchase confirmation email only after successful payment and activation
      try {
        const emailData = {
          email: formValues.email,
          firstName: formValues.firstName,
          lastName: formValues.lastName,
          productType: this.hasHorizonAcademy() ? 'academy' : 'crypto',
          isSalesPartner: formValues.becomePartner,
          orderId: orderId,
          amount: this.calculatePriceWithVAT(this.fullTotal),
          paymentPlan: this.checkoutForm.get('paymentPlan')?.value || 0,
          billingDetails: {
            street: formValues.street,
            streetNumber: formValues.streetNumber,
            zipCode: formValues.zipCode,
            city: formValues.city,
            country: formValues.country
          },
          purchasedCourses: purchasedCourses,
          isSubscription: this.isSubscription
        };

        console.log('Sending confirmation email:', emailData);
        
        await firstValueFrom(
          this.http.post(`${this.apiUrl}/api/sendPurchaseConfirmation`, emailData)
        );
        
        console.log('Confirmation email sent successfully');
      } catch (emailError) {
        console.error('Error sending purchase confirmation email:', emailError);
        // Continue with redirection even if email fails
      }

      console.log('Redirecting to success page');
      
      // Redirect to success page
      await this.router.navigate(['/success'], { 
        queryParams: { 
          orderId, 
          type: this.isSubscription ? 'subscription' : 'payment' 
        }
      });
      
    } catch (error: any) {
      console.error('Error completing order:', error);
      throw error; // Fehler weiterleiten, damit die Bestellung nicht als erfolgreich markiert wird
    }
  }

  calculatePriceWithVAT(price: number): number {
    return price * 1.2; // Add 20% VAT
  }

  openPaymentSchedule() {
    const selectedPlan = this.checkoutForm.get('paymentPlan')?.value;
    if (!selectedPlan) return;

    const dialogRef = this.dialog.open(PaymentScheduleDialogComponent, {
      width: '500px',
      data: {
        monthlyAmount: this.calculatePriceWithVAT(this.monthlyTotal),
        totalAmount: this.calculatePriceWithVAT(this.fullTotal),
        months: selectedPlan
      }
    });
  }

  hasHorizonAcademy(): boolean {
    return this.cartProducts.some(product => product.name === 'Horizon Academy');
  }

  ngOnDestroy() {
    if (this.card) {
      this.card.destroy();
    }
    if (this.eventsSubscription) {
      this.eventsSubscription.unsubscribe();
    }
  }

  private getStripePriceId(months: number): string {
    // Get the product from cart
    const product = this.cartProducts[0]; // Assuming only one product in cart at a time
    
    if (!product) {
      console.error('No product found in cart');
      return '';
    }

    if (!product.stripePriceIds) {
      console.error('No stripe price IDs found for product');
      return '';
    }
    
    switch(months) {
      case 0:
        return product.stripePriceIds.fullPayment;
      case 6:
        return product.stripePriceIds.sixMonths;
      case 12:
        return product.stripePriceIds.twelveMonths;
      case 18:
        return product.stripePriceIds.eighteenMonths;
      default:
        console.error('Invalid payment plan selected');
        return '';
    }
  }

  goBack() {
    this.setCurrentStep(1, false);
  }
} 
