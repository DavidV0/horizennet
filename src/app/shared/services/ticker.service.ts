import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TickerService {
  private readonly baseUrl = 'https://api.binance.com/api/v3/ticker/24hr';

  constructor(private http: HttpClient) {}

  // Abrufen aller Handelspaare
  getAllTickers(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  // Abrufen eines spezifischen Handelspaares
  getTickerBySymbol(symbol: string): Observable<any> {
    const url = `${this.baseUrl}?symbol=${symbol}`;
    return this.http.get<any>(url);
  }
}