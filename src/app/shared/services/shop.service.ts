import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  collectionData,
  query,
  updateDoc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { ShopProduct } from '../interfaces/shop-product.interface';

@Injectable({
  providedIn: 'root'
})
export class ShopService {
  private readonly collectionName = 'shop-products';

  constructor(private firestore: Firestore) {}

  getAllProducts(): Observable<ShopProduct[]> {
    const productsRef = collection(this.firestore, this.collectionName);
    const products$ = new Observable<ShopProduct[]>(observer => {
      getDocs(productsRef).then(snapshot => {
        const products: ShopProduct[] = [];
        snapshot.forEach(doc => {
          products.push({ id: doc.id, ...doc.data() } as ShopProduct);
        });
        observer.next(products);
        observer.complete();
      }).catch(error => observer.error(error));
    });
    return products$;
  }

  async getProductById(id: string): Promise<ShopProduct | undefined> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as ShopProduct : undefined;
    } catch (error) {
      console.error('Error getting product:', error);
      throw error;
    }
  }

  async createProduct(product: Omit<ShopProduct, 'id'>): Promise<void> {
    try {
      const productsRef = collection(this.firestore, this.collectionName);
      const newDoc = doc(productsRef);
      await setDoc(newDoc, product);
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async updateProduct(id: string, product: Partial<ShopProduct>): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      await updateDoc(docRef, product);
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
}