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
import { Router } from '@angular/router';
import { CheckoutService } from '../../../shared/services/checkout.service';
import { firstValueFrom } from 'rxjs';

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
  cartProducts: ShopProduct[] = [];
  private subscription: Subscription = new Subscription();
  selectedCountry: string = 'AT';

  constructor(
    public cartService: CartService,
    public cartSidebarService: CartSidebarService,
    private shopService: ShopService,
    private router: Router,
    private checkoutService: CheckoutService
  ) {
    // Subscribe to country changes
    this.subscription.add(
      this.checkoutService.selectedCountry$.subscribe(country => {
        this.selectedCountry = country;
        this.updateTotals();
      })
    );
  }

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

    this.loadCartProducts();
  }

  private async loadCartProducts() {
    const cartItems = Array.from(this.cartService.getCartItems());
    const products = await firstValueFrom(this.shopService.getAllProducts());
    
    if (products) {
      this.cartProducts = products.filter(product => 
        cartItems.includes(product.id)
      );
      this.updateTotals();
    }
  }

  private updateTotals() {
    this.cartProducts.forEach(product => {
      const totalWithVat = this.checkoutService.calculateTotalWithVat(product.price);
      product.priceWithVat = totalWithVat;
    });
  }

  getTotal(): number {
    const baseTotal = this.cartProducts.reduce((sum, product) => sum + product.price, 0);
    return this.checkoutService.calculateTotalWithVat(baseTotal);
  }

  getBasePrice(): number {
    return this.cartProducts.reduce((sum, product) => sum + product.price, 0);
  }

  getVatAmount(): number {
    const baseTotal = this.getBasePrice();
    return this.checkoutService.calculateVatAmount(baseTotal);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub?.unsubscribe());
    this.subscription.unsubscribe();
  }

  removeFromCart(productId: string) {
    this.cartService.removeFromCart(productId);
  }

  getProduct(productId: string): ShopProduct | undefined {
    return this.productsMap.get(productId);
  }

  getMonthlyPrice(productId: string): number {
    const product = this.getProduct(productId);
    return (product?.price || 0) / 18 * 1.2;
  }

  getMonthlyTotal(): number {
    return Array.from(this.cartService.getCartItems()).reduce((sum, productId) => {
      return sum + this.getMonthlyPrice(productId);
    }, 0);
  }
} 