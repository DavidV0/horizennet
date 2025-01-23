import { Injectable } from '@angular/core';
import { Product } from '../interfaces/product.interface';
import { 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc, 
  getDocs,
  query,
  orderBy,
  where,
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
      const q = query(productsRef, orderBy('order', 'asc'));
      return from(getDocs(q)).pipe(
        map(snapshot => {
          return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Product);
        })
      );
    } catch (error) {
      throw error;
    }
  }

  getActiveProducts(): Observable<Product[]> {
    try {
      const productsRef = collection(this.firestore, this.collectionName);
      const q = query(
        productsRef, 
        where('isActive', '==', true),
        orderBy('order', 'asc')
      );
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

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    try {
      const productsRef = collection(this.firestore, this.collectionName);
      const q = query(productsRef, where('slug', '==', slug));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return undefined;
      const doc = snapshot.docs[0];
      return { ...doc.data(), id: doc.id } as Product;
    } catch (error) {
      throw error;
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[äöüß]/g, (match) => {
        const chars: { [key: string]: string } = {
          'ä': 'ae',
          'ö': 'oe',
          'ü': 'ue',
          'ß': 'ss'
        };
        return chars[match] || match;
      })
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async createProduct(product: Product): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, product.id);
    const slug = this.generateSlug(product.title);
    return setDoc(docRef, {
      ...product,
      order: product.order || await this.getNextOrder(),
      isActive: product.isActive ?? true,
      slug,
      metaTitle: product.metaTitle || product.title,
      metaDescription: product.metaDescription || product.shortDescription
    });
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    const updateData = { ...product };
    
    if (product.title) {
      updateData.slug = this.generateSlug(product.title);
    }
    
    return setDoc(docRef, updateData, { merge: true });
  }

  async deleteProduct(id: string): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    return deleteDoc(docRef);
  }

  private async getNextOrder(): Promise<number> {
    const productsRef = collection(this.firestore, this.collectionName);
    const q = query(productsRef, orderBy('order', 'desc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return 0;
    const highestOrder = snapshot.docs[0].data()['order'] || 0;
    return highestOrder + 1;
  }
} 