import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, catchError, throwError, retry, timeout } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StripeService {
  private apiUrl = environment.apiUrl;
  private headers = new HttpHeaders()
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');

  constructor(private http: HttpClient) { }

  // Customer Management
  createCustomer(email: string, name: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/api/stripe/customers`,
      { email, name },
      { headers: this.headers }
    ).pipe(
      timeout(30000),
      retry(2),
      catchError(this.handleError)
    );
  }

  getCustomer(customerId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/api/stripe/customers/${customerId}`,
      { headers: this.headers }
    ).pipe(
      timeout(30000),
      retry(2),
      catchError(this.handleError)
    );
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