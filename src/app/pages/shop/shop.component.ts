import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CartService } from '../../shared/services/cart.service';
import { CartSidebarService } from '../../shared/services/cart-sidebar.service';
import { CartSidebarComponent } from '../../core/components/cart-sidebar/cart-sidebar.component';
import { ShopService } from '../../shared/services/shop.service';
import { ShopProduct } from '../../shared/interfaces/shop-product.interface';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, CartSidebarComponent],
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.scss']
})
export class ShopComponent implements OnInit {
  products$: Observable<ShopProduct[]>;

  constructor(
    public cartService: CartService,
    private cartSidebarService: CartSidebarService,
    private shopService: ShopService
  ) {
    this.products$ = this.shopService.getAllProducts();
  }

  ngOnInit(): void {
    // Products are automatically loaded through the products$ observable
  }

  addToCart(productId: string) {
    if (this.cartService.addToCart(productId)) {
      this.cartSidebarService.open();
    }
  }

  isInCart(productId: string): boolean {
    return this.cartService.isInCart(productId);
  }

  calculatePriceWithVAT(price: number): number {
    return price * 1.2; // Add 20% VAT
  }
}
