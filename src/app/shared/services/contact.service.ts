import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ContactService {
  private functionUrl = `${environment.apiUrl}/sendContactEmail`;

  constructor(private http: HttpClient) {}

  sendContactForm(data: ContactFormData): Observable<any> {
    return this.http.post(this.functionUrl, data);
  }
} 