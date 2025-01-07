import { Injectable } from '@angular/core';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private stripe: Promise<Stripe | null>;
  private paymentIntentSubject = new BehaviorSubject<string | null>(null);
  paymentIntent$ = this.paymentIntentSubject.asObservable();

  constructor(private http: HttpClient) {
    this.stripe = loadStripe(environment.stripePublishableKey);
  }

  async createPaymentIntent(amount: number): Promise<string> {
    try {
      const response = await this.http.post<{clientSecret: string}>(
        `${environment.apiUrl}/create-payment-intent`,
        { amount }
      ).toPromise();

      if (!response || !response.clientSecret) {
        throw new Error('Invalid response from payment server');
      }

      this.paymentIntentSubject.next(response.clientSecret);
      return response.clientSecret;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  async confirmCardPayment(clientSecret: string, paymentMethod: any): Promise<any> {
    const stripeInstance = await this.stripe;
    if (!stripeInstance) {
      throw new Error('Stripe has not been initialized');
    }

    try {
      const result = await stripeInstance.confirmCardPayment(clientSecret, {
        payment_method: paymentMethod
      });

      if (result.error) {
        throw result.error;
      }

      return result.paymentIntent;
    } catch (error) {
      console.error('Error confirming card payment:', error);
      throw error;
    }
  }
} 