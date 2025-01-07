import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { TickerService } from '../../../shared/services/ticker.service';

interface TickerItem {
  icon: string;
  name: string;
  symbol: string;
  price: number;
  change: number;
}

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, RouterModule],
  templateUrl: './hero-section.component.html',
  styleUrls: ['./hero-section.component.scss']
})
export class HeroSectionComponent implements OnInit {
  tickerItems: any[] = [];
  displayedSymbols: string[] = ['ETHUSDT', 'USDTUSDT', 'XRPUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT', 'USDCUSDT', 'ADAUSDT', 'BTCUSDT', 'EURUSDT', 'TRXUSDT'];

  constructor(private tickerService: TickerService) {
    
  }

  ngOnInit() {
    this.loadTickers();
  }

  loadTickers() {
    this.tickerService.getAllTickers().subscribe((data) => {
      this.tickerItems = data.filter((item) =>
        this.displayedSymbols.includes(item.symbol)
      
      ).map((item) => ({
        icon: item.symbol.substring(0, 3).toLowerCase(), // Icon-Symbol extrahieren
        name: this.getCoinName(item.symbol),
        symbol: item.symbol,
        price: parseFloat(item.lastPrice).toFixed(2),
        change: parseFloat(item.priceChangePercent).toFixed(2)
      }));
    });

   

  }

  getCoinIcon(symbol: string): string {
    const icons: { [key: string]: string } = {
      'Ethereum': 'eth.svg',
      'USDT': 'usdt.png',
      'XRP': 'xrp.png',
      'Solana': 'sol.png',
      'BNB': 'bnb.png',
      'Dogecoin': 'doge.png',
      'USDC': 'usdc.png',
      'Cardano': 'ada.png',
      'BTC': 'btc.png',
      'Euro': 'eur.png',
      'Tron': 'trx.png'
    };
    return icons[symbol] || 'default.svg'; // Fallback auf ein Standard-Icon
  }

  getCoinName(symbol: string): string {
    const coinNames: { [key: string]: string } = {
      'ETHUSDT': 'Ethereum',
      'USDTUSDT': 'Tether',
      'XRPUSDT': 'XRP',
      'SOLUSDT': 'Solana',
      'BNBUSDT': 'BNB',
      'DOGEUSDT': 'Dogecoin',
      'USDCUSDT': 'USDC',
      'ADAUSDT': 'Cardano',
      'BTCUSDT': 'Bitcoin',
      'EURUSDT': 'Euro',
      'TRXUSDT': 'Tron'
    };
    
    return coinNames[symbol] || symbol;
  }
} 