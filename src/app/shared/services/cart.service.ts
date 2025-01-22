import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly CART_STORAGE_KEY = 'cart_items';
  private cartItemsSubject = new BehaviorSubject<Set<string>>(new Set());
  cartItems$ = this.cartItemsSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Initialize with stored cart items
    const storedItems = this.loadCartFromStorage();
    this.cartItemsSubject.next(storedItems);
  }

  private loadCartFromStorage(): Set<string> {
    if (isPlatformBrowser(this.platformId)) {
      const storedItems = localStorage.getItem(this.CART_STORAGE_KEY);
      return storedItems ? new Set(JSON.parse(storedItems)) : new Set();
    }
    return new Set();
  }

  private saveCartToStorage(items: Set<string>) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(Array.from(items)));
    }
  }

  addToCart(productId: string): boolean {
    const currentItems = this.cartItemsSubject.value;
    if (!currentItems.has(productId)) {
      const newItems = new Set(currentItems);
      newItems.add(productId);
      this.cartItemsSubject.next(newItems);
      this.saveCartToStorage(newItems);
      return true;
    }
    return false;
  }

  removeFromCart(productId: string) {
    const currentItems = this.cartItemsSubject.value;
    const newItems = new Set(currentItems);
    newItems.delete(productId);
    this.cartItemsSubject.next(newItems);
    this.saveCartToStorage(newItems);
  }

  isInCart(productId: string): boolean {
    return this.cartItemsSubject.value.has(productId);
  }

  getCartCount(): number {
    return this.cartItemsSubject.value.size;
  }

  getCartItems(): string[] {
    return Array.from(this.cartItemsSubject.value);
  }

  clearCart() {
    this.cartItemsSubject.next(new Set());
    this.saveCartToStorage(new Set());
  }
} 