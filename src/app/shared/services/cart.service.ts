import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItemsSubject = new BehaviorSubject<Set<string>>(new Set());
  cartItems$ = this.cartItemsSubject.asObservable();

  addToCart(productId: string): boolean {
    const currentItems = this.cartItemsSubject.value;
    if (!currentItems.has(productId)) {
      const newItems = new Set(currentItems);
      newItems.add(productId);
      this.cartItemsSubject.next(newItems);
      return true;
    }
    return false;
  }

  removeFromCart(productId: string) {
    const currentItems = this.cartItemsSubject.value;
    const newItems = new Set(currentItems);
    newItems.delete(productId);
    this.cartItemsSubject.next(newItems);
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
  }
} 