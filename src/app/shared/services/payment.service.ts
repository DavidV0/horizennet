import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface PaymentIntent {
  clientSecret: string;
  id: string;
  status: 'succeeded' | 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'failed';
}

export interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: number;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // One-time payment
  createPaymentIntent(amount: number, options: any = {}): Observable<PaymentIntent> {
    return this.http.post<PaymentIntent>(`${this.apiUrl}/stripe/payments`, {
      amount,
      ...options
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Subscription payment
  createSubscription(priceId: string, customerId: string, paymentMethodId: string): Observable<Subscription> {
    return this.http.post<Subscription>(`${this.apiUrl}/stripe/subscriptions`, {
      priceId,
      customerId,
      paymentMethodId
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Get subscription status
  getSubscriptionStatus(subscriptionId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stripe/subscriptions/${subscriptionId}`);
  }

  // Cancel subscription
  cancelSubscription(subscriptionId: string): Observable<Subscription> {
    return this.http.delete<Subscription>(`${this.apiUrl}/stripe/subscriptions/${subscriptionId}`).pipe(
      catchError(this.handleError)
    );
  }

  // Handle payment webhook events (for failed payments, etc.)
  handleWebhookEvent(event: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/webhook`, event).pipe(
      catchError(this.handleError)
    );
  }

  // Retry failed payment
  retryFailedPayment(paymentIntentId: string, paymentMethodId?: string): Observable<PaymentIntent> {
    return this.http.post<PaymentIntent>(`${this.apiUrl}/stripe/payments/${paymentIntentId}/retry`, {
      paymentMethodId
    }).pipe(
      catchError(this.handleError)
    );
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