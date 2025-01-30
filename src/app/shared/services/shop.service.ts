import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  DocumentData,
  updateDoc,
  collectionData,
  QueryDocumentSnapshot,
  DocumentSnapshot
} from '@angular/fire/firestore';
import { Observable, from, firstValueFrom, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { ShopProduct } from '../interfaces/shop-product.interface';
import { StorageService } from './storage.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Functions, httpsCallable } from '@angular/fire/functions';

interface StripeProductResponse {
  productId: string;
  priceIds: {
    fullPayment: string;
    sixMonths: string;
    twelveMonths: string;
    eighteenMonths: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ShopService {
  private readonly collectionName = 'shop-products';
  private readonly storagePath = 'products';
  private apiUrl = environment.apiUrl;

  constructor(
    private firestore: Firestore,
    private storageService: StorageService,
    private http: HttpClient,
    private functions: Functions
  ) {}

  getAllProducts(): Observable<ShopProduct[]> {
    const productsCollection = collection(this.firestore, this.collectionName);
    return collectionData(productsCollection, { idField: 'id' }) as Observable<ShopProduct[]>;
  }

  getProduct(id: string): Observable<ShopProduct | undefined> {
    const docRef = doc(this.firestore, this.collectionName, id);
    return from(getDoc(docRef)).pipe(
      map(doc => doc.exists() ? { id: doc.id, ...doc.data() } as ShopProduct : undefined)
    );
  }

  async createProduct(product: Partial<ShopProduct>, imageFile?: File): Promise<void> {
    const productsCollection = collection(this.firestore, this.collectionName);
    const docRef = doc(productsCollection);
    let imageUrl = '';

    if (imageFile) {
      const imagePath = `${this.storagePath}/${docRef.id}/${imageFile.name}`;
      try {
        const uploadResult = await new Promise<string>((resolve, reject) => {
          const subscription: Subscription = this.storageService.uploadProductImage(imageFile, imagePath).subscribe({
            next: (progress) => {
              if (progress.url) {
                resolve(progress.url);
                subscription.unsubscribe();
              }
            },
            error: (error) => {
              reject(error);
              subscription.unsubscribe();
            },
            complete: () => subscription.unsubscribe()
          });
        });
        
        imageUrl = uploadResult;
      } catch (error) {
        throw error;
      }
    }

    // Create Stripe product and price points
    const response = await firstValueFrom(this.http.post<StripeProductResponse>(
      `${this.apiUrl}/stripe/products`,
      {
        name: product.name,
        description: product.description,
        price: product.price
      }
    ));

    // Create a clean product data object with only defined values
    const productData: DocumentData = {};

    // Only add fields that have actual values
    if (product.name) productData['name'] = product.name;
    if (typeof product.price === 'number') productData['price'] = product.price;
    if (product.description) productData['description'] = product.description;
    if (Array.isArray(product.features)) productData['features'] = product.features;
    if (Array.isArray(product.courseIds)) productData['courseIds'] = product.courseIds;
    if (imageUrl) productData['image'] = imageUrl;
    if (typeof product.oldPrice === 'number') productData['oldPrice'] = product.oldPrice;
    if (product.tag) productData['tag'] = product.tag;

    // Add Stripe IDs
    productData['stripeProductId'] = response.productId;
    productData['stripePriceIds'] = response.priceIds;

    await setDoc(docRef, productData);
  }

  async updateProduct(id: string, product: Partial<ShopProduct>, imageFile?: File): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    let imageUrl = product.image || '';

    const existingProduct = await getDoc(docRef);
    const existingData = existingProduct.data() as ShopProduct;

    // Aktualisiere Stripe-Produkt wenn Name oder Beschreibung geändert wurden
    if ((product.name && product.name !== existingData.name) || 
        (product.description && product.description !== existingData.description)) {
      try {
        await firstValueFrom(this.http.post<StripeProductResponse>(
          `${this.apiUrl}/stripe/products/${existingData.stripeProductId}/prices`,
          {
            price: product.price || existingData.price,
            name: product.name,
            description: product.description,
            existingPriceIds: existingData.stripePriceIds
          }
        ));
      } catch (error) {
        console.error('Error updating Stripe product:', error);
        throw new Error('Fehler beim Aktualisieren des Stripe-Produkts');
      }
    }

    // Wenn sich der Preis geändert hat, aktualisiere die Stripe-Preise
    if (typeof product.price === 'number' && existingData.price !== product.price && existingData.stripeProductId) {
      console.log('Updating Stripe prices for product:', existingData.stripeProductId);
      try {
        const response = await firstValueFrom(this.http.post<StripeProductResponse>(
          `${this.apiUrl}/stripe/products/${existingData.stripeProductId}/prices`,
          {
            price: product.price,
            name: product.name || existingData.name,
            description: product.description || existingData.description,
            existingPriceIds: existingData.stripePriceIds
          }
        ));
        product.stripePriceIds = response.priceIds;
      } catch (error) {
        console.error('Error updating Stripe prices:', error);
        throw new Error('Fehler beim Aktualisieren der Stripe-Preise');
      }
    }

    if (imageFile) {
      const imagePath = `${this.storagePath}/${id}/${imageFile.name}`;
      try {
        const uploadResult = await new Promise<string>((resolve, reject) => {
          const subscription: Subscription = this.storageService.uploadProductImage(imageFile, imagePath).subscribe({
            next: (progress) => {
              if (progress.url) {
                resolve(progress.url);
                subscription.unsubscribe();
              }
            },
            error: (error) => {
              reject(error);
              subscription.unsubscribe();
            },
            complete: () => subscription.unsubscribe()
          });
        });
        
        imageUrl = uploadResult;
      } catch (error) {
        throw error;
      }
    }

    // Create a clean update data object with only defined values
    const updateData: DocumentData = {};

    // Only add fields that have actual values
    if (product.name) updateData['name'] = product.name;
    if (typeof product.price === 'number') updateData['price'] = product.price;
    if (product.description) updateData['description'] = product.description;
    if (Array.isArray(product.features)) updateData['features'] = product.features;
    if (Array.isArray(product.courseIds)) updateData['courseIds'] = product.courseIds;
    if (imageUrl) updateData['image'] = imageUrl;
    if (typeof product.oldPrice === 'number') updateData['oldPrice'] = product.oldPrice;
    if (product.tag) updateData['tag'] = product.tag;
    if (product.stripeProductId) updateData['stripeProductId'] = product.stripeProductId;
    if (product.stripePriceIds) updateData['stripePriceIds'] = product.stripePriceIds;

    await updateDoc(docRef, updateData);
  }

  async deleteProduct(id: string): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    await deleteDoc(docRef);
  }

  async getStripeProduct(productId: string): Promise<any> {
    return this.http.get(`${this.apiUrl}/stripe/products/${productId}`).toPromise();
  }

  async createStripeProduct(name: string, price: number): Promise<any> {
    return this.http.post(`${this.apiUrl}/stripe/products`, {
      name,
      price
    }).toPromise();
  }

  async ensureStripePrices(productId: string, basePrice: number, existingPriceIds?: {
    fullPayment?: string;
    sixMonths?: string;
    twelveMonths?: string;
    eighteenMonths?: string;
  }): Promise<{
    fullPayment: string;
    sixMonths: string;
    twelveMonths: string;
    eighteenMonths: string;
  }> {
    const response = await this.http.post<{
      fullPayment: string;
      sixMonths: string;
      twelveMonths: string;
      eighteenMonths: string;
    }>(`${this.apiUrl}/stripe/products/${productId}/prices`, {
      basePrice,
      existingPriceIds
    }).toPromise();

    if (!response) {
      throw new Error('Failed to create/update Stripe prices');
    }

    return response;
  }
}