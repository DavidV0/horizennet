import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {
  private selectedCountrySubject = new BehaviorSubject<string>('AT');
  selectedCountry$ = this.selectedCountrySubject.asObservable();

  private readonly VAT_RATES: { [key: string]: number } = {
    'AT': 0.20, // Austria 20%
    'DE': 0.19, // Germany 19%
    'CH': 0.077, // Switzerland 7.7%
    'GB': 0.20, // UK 20%
    'US': 0, // USA no VAT
    'CA': 0.05, // Canada 5% GST
    'default': 0.20 // Default to Austrian VAT
  };

  constructor() {}

  setSelectedCountry(country: string) {
    this.selectedCountrySubject.next(country);
  }

  getVatRate(country?: string): number {
    const selectedCountry = country || this.selectedCountrySubject.value;
    return this.VAT_RATES[selectedCountry] ?? this.VAT_RATES['default'];
  }

  calculateTotalWithVat(basePrice: number, country?: string): number {
    const vatRate = this.getVatRate(country);
    return basePrice * (1 + vatRate);
  }

  calculateVatAmount(basePrice: number, country?: string): number {
    const vatRate = this.getVatRate(country);
    return basePrice * vatRate;
  }
} 