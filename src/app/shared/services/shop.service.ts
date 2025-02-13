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
    thirtyMonths: string;
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
    return collectionData(productsCollection, { idField: 'id' }).pipe(
      map(products => products as ShopProduct[])
    );
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

    if (!product.price) {
      throw new Error('Product price is required');
    }

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

    console.log('Creating Stripe product with data:', {
      name: product.name,
      description: product.description,
      price: product.price,
      metadata: product.metadata
    });

    // Create Stripe product and price points
    const response = await firstValueFrom(this.http.post<StripeProductResponse>(
      `${this.apiUrl}/stripe/products`,
      {
        name: product.name,
        description: product.description,
        price: product.price,
        metadata: {
          type: 'one_time',
          courseIds: product.courseIds?.join(','),
          tax_behavior: 'exclusive',
          tax_code: 'txcd_10201000',
          product_type: 'digital_goods',
          eu_vat: 'true',
          created_at: new Date().toISOString()
        },
        prices: {
          fullPayment: {
            type: 'one_time',
            currency: 'eur',
            unit_amount: product.price * 100,
            tax_behavior: 'exclusive'
          },
          sixMonths: {
            type: 'recurring',
            currency: 'eur',
            unit_amount: Math.round((product.price / 6) * 100),
            tax_behavior: 'exclusive',
            recurring: {
              interval: 'month',
              interval_count: 1,
              usage_type: 'licensed'
            }
          },
          twelveMonths: {
            type: 'recurring',
            currency: 'eur',
            unit_amount: Math.round((product.price / 12) * 100),
            tax_behavior: 'exclusive',
            recurring: {
              interval: 'month',
              interval_count: 1,
              usage_type: 'licensed'
            }
          },
          eighteenMonths: {
            type: 'recurring',
            currency: 'eur',
            unit_amount: Math.round((product.price / 18) * 100),
            tax_behavior: 'exclusive',
            recurring: {
              interval: 'month',
              interval_count: 1,
              usage_type: 'licensed'
            }
          },
          thirtyMonths: {
            type: 'recurring',
            currency: 'eur',
            unit_amount: Math.round((product.price / 30) * 100),
            tax_behavior: 'exclusive',
            recurring: {
              interval: 'month',
              interval_count: 1,
              usage_type: 'licensed'
            }
          }
        }
      }
    ));

    console.log('Stripe product created:', response);

    // Create a clean product data object with only defined values
    const productData: DocumentData = {};

    // Only add fields that have actual values
    if (product.name) productData['name'] = product.name;
    if (typeof product.price === 'number') productData['price'] = product.price;
    if (product.description) productData['description'] = product.description;
    if (Array.isArray(product.courseIds)) productData['courseIds'] = product.courseIds;
    if (imageUrl) productData['image'] = imageUrl;
    if (typeof product.oldPrice === 'number') productData['oldPrice'] = product.oldPrice;
    if (product.tag) productData['tag'] = product.tag;

    // Add Stripe IDs
    productData['stripeProductId'] = response.productId;
    productData['stripePriceIds'] = response.priceIds;

    // Always add tax metadata
    productData['metadata'] = {
      tax_behavior: 'exclusive',
      tax_code: 'txcd_10201000',
      product_type: 'digital_goods',
      eu_vat: 'true',
      created_at: new Date().toISOString()
    };

    console.log('Creating Firestore document with:', productData);
    await setDoc(docRef, productData);
  }

  async updateProduct(id: string, product: Partial<ShopProduct>, imageFile?: File): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    let imageUrl = product.image || '';

    const existingProduct = await getDoc(docRef);
    const existingData = existingProduct.data() as ShopProduct;

    if (!existingData) {
      throw new Error('Product not found');
    }

    // Ensure we have a valid price, either from update or existing product
    const updatedPrice = product.price ?? existingData.price;
    if (typeof updatedPrice !== 'number') {
      throw new Error('Valid price is required');
    }

    // If price has changed, update Stripe prices
    if (typeof product.price === 'number' && existingData.price !== product.price && existingData.stripeProductId) {
      console.log('Updating Stripe prices for product:', existingData.stripeProductId);
      try {
        // First, deactivate existing prices
        if (existingData.stripePriceIds) {
          console.log('Deactivating existing prices:', existingData.stripePriceIds);
          try {
            await firstValueFrom(this.http.post(
              `${this.apiUrl}/stripe/products/${existingData.stripeProductId}/deactivate-prices`,
              { priceIds: Object.values(existingData.stripePriceIds) }
            ));
            console.log('Successfully deactivated existing prices');
          } catch (deactivateError) {
            console.error('Error deactivating existing prices:', deactivateError);
            // Continue with creating new prices even if deactivation fails
          }
        }

        // Create new prices
        const priceData = {
          price: product.price,
          name: product.name || existingData.name,
          description: product.description || existingData.description,
          existingPriceIds: existingData.stripePriceIds,
          activate: true,
          forceActivate: true,
          metadata: {
            type: 'one_time',
            courseIds: product.courseIds?.join(','),
            tax_behavior: 'exclusive',
            tax_code: 'txcd_10201000',
            product_type: 'digital_goods',
            eu_vat: 'true'
          },
          prices: {
            fullPayment: {
              type: 'one_time',
              currency: 'eur',
              unit_amount: product.price * 100,
              tax_behavior: 'exclusive'
            },
            sixMonths: {
              type: 'recurring',
              currency: 'eur',
              unit_amount: Math.round((product.price / 6) * 100),
              tax_behavior: 'exclusive',
              recurring: {
                interval: 'month',
                interval_count: 1,
                usage_type: 'licensed'
              }
            },
            twelveMonths: {
              type: 'recurring',
              currency: 'eur',
              unit_amount: Math.round((product.price / 12) * 100),
              tax_behavior: 'exclusive',
              recurring: {
                interval: 'month',
                interval_count: 1,
                usage_type: 'licensed'
              }
            },
            eighteenMonths: {
              type: 'recurring',
              currency: 'eur',
              unit_amount: Math.round((product.price / 18) * 100),
              tax_behavior: 'exclusive',
              recurring: {
                interval: 'month',
                interval_count: 1,
                usage_type: 'licensed'
              }
            },
            thirtyMonths: {
              type: 'recurring',
              currency: 'eur',
              unit_amount: Math.round((product.price / 30) * 100),
              tax_behavior: 'exclusive',
              recurring: {
                interval: 'month',
                interval_count: 1,
                usage_type: 'licensed'
              }
            }
          }
        };

        console.log('Creating new prices with data:', JSON.stringify(priceData, null, 2));
        const response = await firstValueFrom(this.http.post<StripeProductResponse>(
          `${this.apiUrl}/stripe/products/${existingData.stripeProductId}/prices`,
          priceData
        ));

        console.log('Received response from price creation:', JSON.stringify(response, null, 2));

        // Only update stripePriceIds if we got valid price IDs back
        if (response?.priceIds) {
          console.log('Validating received price IDs:', response.priceIds);
          const { fullPayment, sixMonths, twelveMonths, eighteenMonths, thirtyMonths } = response.priceIds;
          
          const missingPrices = [];
          if (!fullPayment) missingPrices.push('fullPayment');
          if (!sixMonths) missingPrices.push('sixMonths');
          if (!twelveMonths) missingPrices.push('twelveMonths');
          if (!eighteenMonths) missingPrices.push('eighteenMonths');
          if (!thirtyMonths) missingPrices.push('thirtyMonths');

          if (missingPrices.length > 0) {
            console.error('Missing price IDs in response:', {
              received: response.priceIds,
              missing: missingPrices
            });
            throw new Error(`Missing required price IDs: ${missingPrices.join(', ')}`);
          }

          console.log('All price IDs are valid, updating product');
          product.stripePriceIds = response.priceIds;

          // Activate the new prices
          console.log('Activating new prices:', Object.values(response.priceIds));
          try {
            await firstValueFrom(this.http.post(
              `${this.apiUrl}/stripe/products/${existingData.stripeProductId}/activate-prices`,
              {
                priceIds: Object.values(response.priceIds)
              }
            ));
            console.log('Successfully activated new prices');
          } catch (activateError) {
            console.error('Error activating new prices:', activateError);
            throw new Error('Failed to activate new prices: ' + (activateError instanceof Error ? activateError.message : String(activateError)));
          }
        } else {
          console.error('Invalid response from price creation:', response);
          throw new Error('Invalid response from price creation: No price IDs received');
        }
      } catch (error) {
        console.error('Error updating Stripe prices:', error);
        throw new Error('Fehler beim Aktualisieren der Stripe-Preise: ' + (error instanceof Error ? error.message : String(error)));
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
    if (Array.isArray(product.courseIds)) updateData['courseIds'] = product.courseIds;
    if (imageUrl) updateData['image'] = imageUrl;
    if (typeof product.oldPrice === 'number') updateData['oldPrice'] = product.oldPrice;
    if (product.tag) updateData['tag'] = product.tag;
    if (product.stripeProductId) updateData['stripeProductId'] = product.stripeProductId;
    if (product.stripePriceIds && 
        product.stripePriceIds.fullPayment && 
        product.stripePriceIds.sixMonths && 
        product.stripePriceIds.twelveMonths && 
        product.stripePriceIds.eighteenMonths && 
        product.stripePriceIds.thirtyMonths) {
      updateData['stripePriceIds'] = product.stripePriceIds;
    }

    console.log('Updating Firestore document with:', updateData);
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
    thirtyMonths?: string;
  }): Promise<{
    fullPayment: string;
    sixMonths: string;
    twelveMonths: string;
    eighteenMonths: string;
    thirtyMonths: string;
  }> {
    const response = await this.http.post<{
      fullPayment: string;
      sixMonths: string;
      twelveMonths: string;
      eighteenMonths: string;
      thirtyMonths: string;
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