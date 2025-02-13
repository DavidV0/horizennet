import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, catchError, throwError, retry, timeout, map, timer } from 'rxjs';
import { 
  StripeCustomer, 
  StripePaymentIntent, 
  StripeSubscription, 
  StripeSetupIntent,
  StripePriceResponse 
} from '../interfaces/stripe.interface';
import { loadStripe } from '@stripe/stripe-js';

export interface CustomerData {
  email: string;
  name: string;
  phone?: string;
  address?: {
    line1: string;
    postal_code: string;
    city: string;
    country: string;
  };
  metadata?: {
    firstName: string;
    lastName: string;
    language: string;
    newsletter: string;
    becomePartner: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class StripeService {
  private apiUrl = environment.apiUrl;
  private headers = new HttpHeaders()
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  constructor(private http: HttpClient) {}

  // Customer Management
  createCustomer(customerData: CustomerData): Observable<StripeCustomer> {
    return this.http.post<StripeCustomer>(
      `${this.apiUrl}/stripe/customers`,
      customerData,
      { headers: this.headers }
    ).pipe(
      timeout(30000),
      retry(2),
      catchError(this.handleError)
    );
  }

  getCustomer(customerId: string): Observable<StripeCustomer> {
    return this.http.get<StripeCustomer>(
      `${this.apiUrl}/stripe/customers/${customerId}`,
      { headers: this.headers }
    ).pipe(
      timeout(30000),
      retry(2),
      catchError(this.handleError)
    );
  }

  // Payment Intents
  createPaymentIntent(amount: number, options: any = {}): Observable<StripePaymentIntent> {
    return this.http.post<StripePaymentIntent>(
      `${this.apiUrl}/stripe/payments`,
      { amount, ...options },
      { headers: this.headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getPaymentIntent(paymentIntentId: string): Observable<StripePaymentIntent> {
    return this.http.get<StripePaymentIntent>(
      `${this.apiUrl}/stripe/payments/${paymentIntentId}`,
      { headers: this.headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  retryPayment(paymentIntentId: string, paymentMethodId?: string): Observable<StripePaymentIntent> {
    return this.http.post<StripePaymentIntent>(
      `${this.apiUrl}/stripe/payments/${paymentIntentId}/retry`,
      { paymentMethodId },
      { headers: this.headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  capturePayment(paymentIntentId: string): Observable<StripePaymentIntent> {
    return this.http.post<StripePaymentIntent>(
      `${this.apiUrl}/stripe/payments/${paymentIntentId}/capture`,
      {},
      { headers: this.headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Subscriptions
  createSubscription(priceId: string, customerId: string, paymentMethodId: string): Observable<StripeSubscription> {
    return this.http.post<StripeSubscription>(
      `${this.apiUrl}/stripe/subscriptions`,
      { priceId, customerId, paymentMethodId },
      { headers: this.headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getSubscriptionStatus(subscriptionId: string): Observable<StripeSubscription> {
    return this.http.get<StripeSubscription>(
      `${this.apiUrl}/stripe/subscriptions/${subscriptionId}`,
      { headers: this.headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  cancelSubscription(subscriptionId: string): Observable<StripeSubscription> {
    return this.http.delete<StripeSubscription>(
      `${this.apiUrl}/stripe/subscriptions/${subscriptionId}`,
      { headers: this.headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  updateSubscriptionPaymentMethod(subscriptionId: string, paymentMethodId: string): Observable<StripeSubscription> {
    return this.http.post<StripeSubscription>(
      `${this.apiUrl}/stripe/subscriptions/${subscriptionId}/payment-method`,
      { paymentMethodId },
      { headers: this.headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Setup Intents
  createSetupIntent(customerId: string, paymentMethodId: string): Observable<StripeSetupIntent> {
    return this.http.post<StripeSetupIntent>(
      `${this.apiUrl}/stripe/setup-intent`,
      { customer: customerId, payment_method: paymentMethodId },
      { headers: this.headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Product Prices
  updateProductPrices(productId: string, price: number, options: any = {}): Observable<StripePriceResponse> {
    return this.http.post<StripePriceResponse>(
      `${this.apiUrl}/stripe/products/${productId}/prices`,
      { price, ...options },
      { headers: this.headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  deactivatePrices(productId: string, priceIds: string[]): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/stripe/products/${productId}/deactivate-prices`,
      { priceIds },
      { headers: this.headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  activatePrices(productId: string, priceIds: string[]): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/stripe/products/${productId}/activate-prices`,
      { priceIds },
      { headers: this.headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Checkout Sessions
  createCheckoutSession(priceId: string, customerData?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    street?: string;
    streetNumber?: string;
    zipCode?: string;
    city?: string;
    country?: string;
    mobile?: string;
  }): Observable<{ sessionId: string; url: string }> {
    const successUrl = `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${window.location.origin}/cancel`;

    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json');

    // Format the address for Stripe
    const address = customerData ? {
      line1: `${customerData.street} ${customerData.streetNumber}`,
      postal_code: customerData.zipCode,
      city: customerData.city,
      country: customerData.country
    } : undefined;

    // Prepare customer data for Stripe
    const customer = customerData ? {
      email: customerData.email,
      name: `${customerData.firstName} ${customerData.lastName}`,
      phone: customerData.mobile,
      address
    } : undefined;

    return this.http.post<{ sessionId: string; url: string }>(
      `${this.apiUrl}/stripe/checkout-session`,
      {
        priceId,
        successUrl,
        cancelUrl,
        customer,
        customerData // Keep original data for our backend
      },
      { headers }
    ).pipe(
      timeout(60000), // Increase timeout to 60 seconds
      retry({
        count: 3,
        delay: (error, retryCount) => {
          console.log(`Retry attempt ${retryCount}`, error);
          return timer(1000 * retryCount); // Exponential backoff
        }
      }),
      catchError(error => {
        console.error('Checkout session error:', error);
        if (error.name === 'TimeoutError') {
          return throwError(() => new Error('Die Verbindung zum Zahlungssystem ist derzeit nicht möglich. Bitte versuchen Sie es in einigen Minuten erneut.'));
        }
        if (error.status === 404) {
          return throwError(() => new Error('Der Zahlungsendpunkt wurde nicht gefunden. Bitte kontaktieren Sie den Support.'));
        }
        if (error.status === 500) {
          return throwError(() => new Error('Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.'));
        }
        return this.handleError(error);
      })
    );
  }

  redirectToCheckout(sessionId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const stripe = await loadStripe(environment.stripePublishableKey);
        if (!stripe) {
          throw new Error('Stripe failed to load');
        }

        const result = await stripe.redirectToCheckout({
          sessionId
        });

        if (result.error) {
          reject(result.error);
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);
    let errorMessage = 'Ein unerwarteter Fehler ist aufgetreten.';

    if (error.status === 0) {
      console.error('Connection error details:', error);
      errorMessage = 'Verbindung zum Server fehlgeschlagen. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.';
    } else if (error.error instanceof ErrorEvent) {
      errorMessage = `Client-Fehler: ${error.error.message}`;
    } else {
      errorMessage = `Server-Fehler: ${error.status} ${error.statusText}`;
      if (error.error?.message) {
        errorMessage += ` - ${error.error.message}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
} 