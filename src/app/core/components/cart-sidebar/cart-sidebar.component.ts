import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CartService } from '../../../shared/services/cart.service';
import { CartSidebarService } from '../../../shared/services/cart-sidebar.service';
import { ShopService } from '../../../shared/services/shop.service';
import { ShopProduct } from '../../../shared/interfaces/shop-product.interface';
import { Subscription, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cart-sidebar',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  templateUrl: './cart-sidebar.component.html',
  styleUrls: ['./cart-sidebar.component.scss']
})
export class CartSidebarComponent implements OnInit, OnDestroy {
  isOpen = false;
  private subscriptions: Subscription[] = [];
  private productsMap = new Map<string, ShopProduct>();
  private productsMapSubject = new BehaviorSubject<Map<string, ShopProduct>>(new Map());
  products$ = this.productsMapSubject.asObservable();

  constructor(
    public cartService: CartService,
    public cartSidebarService: CartSidebarService,
    private shopService: ShopService
  ) {}

  ngOnInit() {
    // Subscribe to sidebar state
    this.subscriptions.push(
      this.cartSidebarService.isOpen$.subscribe(
        isOpen => this.isOpen = isOpen
      )
    );

    // Subscribe to products and update the map
    this.subscriptions.push(
      this.shopService.getAllProducts().subscribe(products => {
        this.productsMap.clear();
        products.forEach(product => {
          this.productsMap.set(product.id, product);
        });
        this.productsMapSubject.next(this.productsMap);
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub?.unsubscribe());
  }

  removeFromCart(productId: string) {
    this.cartService.removeFromCart(productId);
  }

  getProduct(productId: string): ShopProduct | undefined {
    return this.productsMap.get(productId);
  }

  getMonthlyPrice(productId: string): number {
    const product = this.getProduct(productId);
    return (product?.price || 0) / 18;
  }

  getMonthlyTotal(): number {
    return Array.from(this.cartService.getCartItems()).reduce((sum, productId) => {
      return sum + this.getMonthlyPrice(productId);
    }, 0);
  }
} 