import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

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
export class HeroSectionComponent {
  tickerItems: TickerItem[] = [
    { icon: 'eth', name: 'Ethereum', symbol: 'ETH', price: 3670.88, change: -1.54 },
    { icon: 'usdt', name: 'Tether', symbol: 'USDT', price: 0.95, change: 0.01 },
    { icon: 'xrp', name: 'XRP', symbol: 'XRP', price: 2.28, change: -1.00 },
    { icon: 'sol', name: 'Solana', symbol: 'SOL', price: 207.59, change: -2.18 },
    { icon: 'bnb', name: 'BNB', symbol: 'BNB', price: 675.22, change: -1.81 },
    { icon: 'doge', name: 'Dogecoin', symbol: 'DOGE', price: 0.372807, change: -2.54 },
    { icon: 'usdc', name: 'USDC', symbol: 'USDC', price: 0.95, change: 0.02 },
    { icon: 'ada', name: 'Cardano', symbol: 'ADA', price: 1.28, change: -1.92 }
  ];
} 