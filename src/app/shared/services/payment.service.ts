import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface PaymentIntent {
  clientSecret: string;
  id: string;
  status: 'succeeded' | 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'failed';
}

export interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: number;
  gracePeriodEnd?: number;
  lastNotificationSent?: string;
  clientSecret?: string;
}

export interface SubscriptionStatus {
  id: string;
  status: string;
  currentPeriodEnd: number;
  gracePeriodEnd?: number;
  clientSecret?: string;
  paymentIntent?: {
    clientSecret: string;
    status: string;
  };
}

interface PurchaseConfirmationData {
  email: string;
  firstName: string;
  lastName: string;
  orderId: string;
  amount: number;
  paymentPlan: number;
  billingDetails: {
    street: string;
    streetNumber: string;
    zipCode: string;
    city: string;
    country: string;
  };
  purchasedCourseIds: string[];
  purchasedProducts: {
    id: string;
    name: string;
    courseIds: string[];
  }[];
  isSalesPartner?: boolean;
  isSubscription?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = environment.apiUrl;
  private readonly GRACE_PERIOD_DAYS = 7; // 7 days grace period for failed payments
  private readonly REMINDER_DAYS = [7, 3, 1]; // Send reminders 7, 3, and 1 day before renewal

  constructor(private http: HttpClient) {}

  // One-time payment
  createPaymentIntent(amount: number, options: any = {}): Observable<PaymentIntent> {
    return this.http.post<PaymentIntent>(`${this.apiUrl}/api/stripe/payments`, {
      amount,
      ...options
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Get payment intent status
  getPaymentIntent(paymentIntentId: string): Observable<PaymentIntent> {
    return this.http.get<PaymentIntent>(`${this.apiUrl}/api/stripe/payments/${paymentIntentId}`).pipe(
      catchError(this.handleError)
    );
  }

  // Subscription payment
  createSubscription(priceId: string, customerId: string, paymentMethodId: string): Observable<Subscription> {
    return this.http.post<Subscription>(`${this.apiUrl}/api/stripe/subscriptions`, {
      priceId,
      customerId,
      paymentMethodId,
      gracePeriodDays: this.GRACE_PERIOD_DAYS
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Get subscription status with grace period info
  getSubscriptionStatus(subscriptionId: string): Observable<SubscriptionStatus> {
    return this.http.get<SubscriptionStatus>(`${this.apiUrl}/api/stripe/subscriptions/${subscriptionId}`).pipe(
      map(status => {
        // Add grace period end date if status is past_due
        if (status.status === 'past_due' && !status.gracePeriodEnd) {
          const gracePeriodEnd = new Date();
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.GRACE_PERIOD_DAYS);
          status.gracePeriodEnd = gracePeriodEnd.getTime();
        }
        return status;
      }),
      catchError(this.handleError)
    );
  }

  // Check if subscription needs renewal reminder
  checkRenewalReminder(subscription: SubscriptionStatus): Observable<boolean> {
    const now = Date.now();
    const daysUntilRenewal = Math.ceil((subscription.currentPeriodEnd * 1000 - now) / (1000 * 60 * 60 * 24));
    
    return of(this.REMINDER_DAYS.includes(daysUntilRenewal));
  }

  // Send renewal reminder
  sendRenewalReminder(subscriptionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/stripe/subscriptions/${subscriptionId}/reminder`, {}).pipe(
      catchError(this.handleError)
    );
  }

  // Handle failed payment with grace period
  handleFailedPayment(subscriptionId: string): Observable<SubscriptionStatus> {
    return this.http.post<SubscriptionStatus>(`${this.apiUrl}/api/stripe/subscriptions/${subscriptionId}/handle-failed-payment`, {
      gracePeriodDays: this.GRACE_PERIOD_DAYS
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Cancel subscription
  cancelSubscription(subscriptionId: string): Observable<Subscription> {
    return this.http.delete<Subscription>(`${this.apiUrl}/api/stripe/subscriptions/${subscriptionId}`).pipe(
      catchError(this.handleError)
    );
  }

  // Handle payment webhook events (for failed payments, etc.)
  handleWebhookEvent(event: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/webhook`, event).pipe(
      catchError(this.handleError)
    );
  }

  // Retry failed payment
  retryFailedPayment(paymentIntentId: string, paymentMethodId?: string): Observable<PaymentIntent> {
    return this.http.post<PaymentIntent>(`${this.apiUrl}/api/stripe/payments/${paymentIntentId}/retry`, {
      paymentMethodId
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Update payment method
  updatePaymentMethod(subscriptionId: string, paymentMethodId: string): Observable<SubscriptionStatus> {
    return this.http.post<SubscriptionStatus>(`${this.apiUrl}/api/stripe/subscriptions/${subscriptionId}/payment-method`, {
      paymentMethodId
    }).pipe(
      catchError(this.handleError)
    );
  }

  createCustomer(customerData: { email: string; name: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/stripe/customers`, customerData)
      .pipe(
        catchError(this.handleError)
      );
  }

  capturePayment(paymentIntentId: string): Observable<PaymentIntent> {
    return this.http.post<PaymentIntent>(
      `${this.apiUrl}/api/stripe/payments/${paymentIntentId}/capture`,
      {}
    ).pipe(
      catchError(this.handleError)
    );
  }

  createSetupIntent(customerId: string, paymentMethodId: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/api/stripe/setup-intent`,
      {
        customer: customerId,
        payment_method: paymentMethodId
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  sendPurchaseConfirmation(data: PurchaseConfirmationData): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/sendPurchaseConfirmation`, data);
  }

  private handleError(error: any) {
    let errorMessage = 'Ein Fehler ist aufgetreten.';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      switch (error.status) {
        case 402:
          errorMessage = 'Die Zahlung wurde abgelehnt. Bitte überprüfen Sie Ihre Zahlungsinformationen.';
          break;
        case 403:
          errorMessage = 'Nicht autorisiert. Bitte melden Sie sich erneut an.';
          break;
        case 404:
          errorMessage = 'Die angeforderte Ressource wurde nicht gefunden.';
          break;
        case 500:
          errorMessage = 'Ein Server-Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
          break;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
} 