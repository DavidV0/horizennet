import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CartSidebarService {
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  isOpen$ = this.isOpenSubject.asObservable();

  open() {
    this.isOpenSubject.next(true);
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpenSubject.next(false);
    document.body.style.overflow = 'auto';
  }

  toggle() {
    const currentState = this.isOpenSubject.value;
    if (currentState) {
      this.close();
    } else {
      this.open();
    }
  }
} 