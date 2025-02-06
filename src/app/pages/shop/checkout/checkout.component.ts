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
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      street: ['', [Validators.required, Validators.minLength(3)]],
      streetNumber: ['', [Validators.required]],
      zipCode: ['', [Validators.required, Validators.pattern('^[0-9]{4}$')]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      country: ['Austria', Validators.required],
      language: ['German', Validators.required],
      mobile: ['', [Validators.required, Validators.pattern('^[+]?[0-9]{10,13}$')]],
      phone: [''],
      useShippingAsBilling: [true],
      acceptTerms: [false, Validators.requiredTrue],
      newsletter: [false],
      becomePartner: [false],
      paymentPlan: [0, Validators.required],
      cardholderName: ['', [Validators.required, Validators.minLength(2)]]
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
      this.initializeStripeAndMount();
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
        return;
      }

      if (this.stripe && this.card) {
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

      if (this.card) {
        this.card.destroy();
        this.card = undefined;
      }

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
                      key !== 'becomePartner')
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
      // Detaillierte Fehlerprüfung
      const formControls = this.checkoutForm.controls;
      const invalidControls: string[] = [];
      
      Object.keys(formControls).forEach(key => {
        const control = formControls[key];
        if (control.errors) {
          console.error(`Validierungsfehler für ${key}:`, control.errors);
          invalidControls.push(key);
        }
      });

      if (invalidControls.length > 0) {
        this.paymentError = `Bitte füllen Sie alle erforderlichen Felder korrekt aus: ${invalidControls.join(', ')}`;
        this.cdr.detectChanges();
      }
      
      if (!this.stripe) {
        this.paymentError = 'Zahlungssystem nicht initialisiert. Bitte laden Sie die Seite neu.';
        this.cdr.detectChanges();
      }
      
      if (!this.card) {
        this.paymentError = 'Bitte geben Sie Ihre Kreditkartendaten ein.';
        this.cdr.detectChanges();
      }
      
      return;
    }

    this.isProcessing = true;
    this.paymentError = '';
    this.cdr.detectChanges();

    try {
      const formValues = this.checkoutForm.value;
      const fullName = `${formValues.firstName} ${formValues.lastName}`;

      try {
        const customerResponse = await firstValueFrom(
          this.paymentService.createCustomer({
            email: formValues.email,
            name: fullName
          })
        );
        this.customerId = customerResponse.id;
      } catch (customerError: any) {
        console.error('Error creating customer:', customerError);
        throw new Error('Fehler beim Erstellen des Kundenprofils');
      }

      if (!this.customerId) {
        throw new Error('Kundenprofil konnte nicht erstellt werden');
      }

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
        console.error('Payment method error:', paymentMethodError);
        throw new Error(paymentMethodError.message);
      }

      if (!paymentMethod) {
        throw new Error('Zahlungsmethode konnte nicht erstellt werden');
      }

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
      'AT': 'AT',
      'DE': 'DE',
      'CH': 'CH',
      'US': 'US',
      'CA': 'CA',
      'GB': 'GB'
    };
    return countryMap[country || ''] || 'AT';
  }

  private async processPaymentAndOrder(customerId: string, paymentMethodId: string) {
    const selectedPlan = this.checkoutForm.get('paymentPlan')?.value;
    this.isSubscription = selectedPlan > 0;
    
    try {
      if (this.isSubscription) {
        const priceId = this.getStripePriceId(selectedPlan);
        
        this.stripeSubscription = await firstValueFrom(
          this.paymentService.createSubscription(
            priceId,
            customerId,
            paymentMethodId
          )
        );


        // Setup Intent für 3D-Secure erzwingen
        const setupIntentSecret = await this.getSetupIntentSecret(customerId, paymentMethodId);
        
        const { error: setupError, setupIntent } = await this.stripe!.confirmCardSetup(
          setupIntentSecret,
          {
            payment_method: paymentMethodId,
            return_url: window.location.origin + '/payment-success'
          }
        );

        if (setupError) {
          console.error('Setup confirmation error:', setupError);
          throw new Error(setupError.message);
        }

        if (setupIntent?.status === 'requires_action') {
          console.log('3D Secure authentication required');
          return;
        }

        if (setupIntent?.status === 'succeeded') {
          await this.completeOrder(customerId);
          return;
        }

        throw new Error('Unerwarteter Setup Status');

      } else {
        const amount = this.calculatePriceWithVAT(this.fullTotal);
        
        this.paymentIntent = await firstValueFrom(
          this.paymentService.createPaymentIntent(amount * 100, {
            customer: customerId,
            payment_method: paymentMethodId,
            currency: 'eur',
            setup_future_usage: 'off_session'
          })
        );

        if (!this.paymentIntent?.clientSecret) {
          throw new Error('Keine Client Secret für die Zahlung erhalten');
        }

        const { error: confirmError, paymentIntent: confirmedPaymentIntent } = 
          await this.stripe!.confirmCardPayment(
            this.paymentIntent.clientSecret,
            {
              payment_method: paymentMethodId,
              return_url: window.location.origin + '/payment-success'
            }
          );

        if (confirmError) {
          throw new Error(confirmError.message);
        }

        if (confirmedPaymentIntent.status === 'requires_action') {
          console.log('3D Secure authentication required');
          // Der Browser wird automatisch zur 3D Secure Seite weitergeleitet
          return;
        }

        if (confirmedPaymentIntent.status === 'succeeded') {
          await this.completeOrder(customerId);
        } else {
          throw new Error(`Unerwarteter Zahlungsstatus: ${confirmedPaymentIntent.status}`);
        }
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      throw new Error(error.message || 'Fehler bei der Zahlungsverarbeitung');
    }
  }

  private async getSetupIntentSecret(customerId: string, paymentMethodId: string): Promise<string> {
    try {
      const setupIntent = await firstValueFrom(
        this.paymentService.createSetupIntent(customerId, paymentMethodId)
      );
      
      if (!setupIntent.client_secret) {
        throw new Error('Keine Setup Intent Client Secret erhalten');
      }
      
      return setupIntent.client_secret;
    } catch (error) {
      console.error('Error creating setup intent:', error);
      throw new Error('Fehler beim Erstellen des Setup Intents');
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

      
      // Clear cart first
      this.cartService.clearCart();
      
      // Sammle alle Kurs-IDs aus den gekauften Produkten
      const purchasedCourseIds = new Set<string>();
      this.cartProducts.forEach(product => {
        if (product.courseIds) {
          product.courseIds.forEach(courseId => purchasedCourseIds.add(courseId));
        }
      });

      // Send purchase confirmation email
      const purchasedProducts = this.cartProducts.map(product => ({
        id: product.id,
        name: product.name,
        courseIds: product.courseIds
      }));

      const confirmationData = {
        email: formValues.email,
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        orderId: orderId,
        amount: this.calculatePriceWithVAT(this.fullTotal),
        paymentPlan: this.checkoutForm.get('paymentPlan')?.value || 0,
        billingDetails: {
          street: formValues.street,
          streetNumber: formValues.streetNumber,
          zipCode: formValues.zipCode,
          city: formValues.city,
          country: this.getCountryCode(formValues.country)
        },
        purchasedCourseIds: Array.from(purchasedCourseIds),
        purchasedProducts: purchasedProducts,
        isSalesPartner: formValues.becomePartner,
        isSubscription: this.isSubscription
      };

      try {
        await firstValueFrom(
          this.http.post(`${this.apiUrl}/api/sendPurchaseConfirmation`, confirmationData)
        );
      } catch (emailError) {
        console.error('Error sending purchase confirmation email:', emailError);
        // Continue with redirection even if email fails
      }

      // Redirect to success page
      await this.router.navigate(['/success'], { 
        queryParams: { 
          orderId, 
          type: this.isSubscription ? 'subscription' : 'payment' 
        }
      });
      
    } catch (error: any) {
      console.error('Error completing order:', error);
      throw error;
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
    return this.cartProducts.some(product => product.name.toLowerCase() === 'horizon academy');
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

  async onPaymentSuccess(paymentIntent: any) {
    try {
      const purchasedProducts = this.cartProducts.map(product => ({
        id: product.id,
        name: product.name,
        courseIds: product.courseIds
      }));

      const confirmationData = {
        email: this.checkoutForm.get('email')?.value,
        firstName: this.checkoutForm.get('firstName')?.value,
        lastName: this.checkoutForm.get('lastName')?.value,
        orderId: paymentIntent.id,
        amount: this.calculatePriceWithVAT(this.fullTotal),
        paymentPlan: this.checkoutForm.get('paymentPlan')?.value || 0,
        billingDetails: {
          street: this.checkoutForm.get('street')?.value,
          streetNumber: this.checkoutForm.get('streetNumber')?.value,
          zipCode: this.checkoutForm.get('zipCode')?.value,
          city: this.checkoutForm.get('city')?.value,
          country: this.getCountryCode(this.checkoutForm.get('country')?.value)
        },
        purchasedCourseIds: this.cartProducts.flatMap(product => product.courseIds),
        purchasedProducts: purchasedProducts,
        isSalesPartner: this.checkoutForm.get('becomePartner')?.value,
        isSubscription: this.isSubscription
      };

      await this.paymentService.sendPurchaseConfirmation(confirmationData);
      
      // Rest des Codes...
    } catch (error) {
      console.error('Error in onPaymentSuccess:', error);
      this.paymentError = 'Ein Fehler ist aufgetreten. Bitte kontaktieren Sie den Support.';
      this.cdr.detectChanges();
    }
  }
} 
