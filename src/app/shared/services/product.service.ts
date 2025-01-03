import { Injectable } from '@angular/core';
import { Product } from '../interfaces/product.interface';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc, 
  getDocs,
  query,
  orderBy,
  limit
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly collectionName = 'products';

  constructor(private firestore: Firestore) {}

  getAllProducts(): Observable<Product[]> {
    try {
      const productsRef = collection(this.firestore, this.collectionName);
      const q = query(productsRef, orderBy('title'));
      return from(getDocs(q)).pipe(
        map(snapshot => {
          return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Product);
        })
      );
    } catch (error) {
      throw error;
    }
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const docRef = doc(this.firestore, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { ...docSnap.data(), id: docSnap.id } as Product : undefined;
  }

  async createProduct(product: Product): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, product.id);
    return setDoc(docRef, product);
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    return setDoc(docRef, product, { merge: true });
  }

  async deleteProduct(id: string): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    return deleteDoc(docRef);
  }
} 