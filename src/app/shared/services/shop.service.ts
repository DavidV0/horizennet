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
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class ShopService {
  private readonly collectionName = 'shop-products';
  private readonly storagePath = 'products';

  constructor(
    private firestore: Firestore,
    private storageService: StorageService
  ) {}

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

  async createProduct(product: Omit<ShopProduct, 'id'>, file?: File): Promise<void> {
    try {
      console.log('Received product data:', product); // Debug-Log

      // Validiere die Eingabedaten
      const name = product.name ? String(product.name).trim() : '';
      const price = product.price ? Number(product.price) : 0;

      if (!name) {
        throw new Error('A valid name is required');
      }
      if (isNaN(price) || price <= 0) {
        throw new Error('A valid price greater than 0 is required');
      }

      const productsRef = collection(this.firestore, this.collectionName);
      const newDoc = doc(productsRef);
      const productId = newDoc.id;

      // Erstelle ein neues Objekt mit den Produktdaten
      const productData: any = {
        name,
        price
      };
      
      // Füge optionale Felder hinzu
      if (product.oldPrice) {
        const oldPrice = Number(product.oldPrice);
        if (!isNaN(oldPrice)) {
          productData.oldPrice = oldPrice;
        }
      }
      if (product.tag) {
        const tag = String(product.tag).trim();
        if (tag) {
          productData.tag = tag;
        }
      }

      if (file) {
        const imagePath = `${this.storagePath}/${productId}/${file.name}`;
        
        // Warte auf den Upload und die finale URL
        const uploadResult = await new Promise<string>((resolve, reject) => {
          const subscription = this.storageService.uploadProductImage(file, imagePath).subscribe({
            next: (progress) => {
              if (progress.url) {
                resolve(progress.url);
                subscription.unsubscribe();
              }
            },
            error: (error) => {
              reject(error);
              subscription.unsubscribe();
            }
          });
        });
        
        productData.image = uploadResult;
      }

      console.log('Saving product data:', productData); // Debug-Log
      await setDoc(newDoc, productData);
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async updateProduct(id: string, product: Partial<ShopProduct>, file?: File): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      
      // Erstelle ein neues Objekt mit den zu aktualisierenden Daten
      const updateData: any = {};
      
      // Validiere und füge die Felder hinzu
      if (product.name !== undefined) {
        updateData.name = String(product.name).trim();
      }
      if (product.price !== undefined) {
        updateData.price = Number(product.price);
      }
      if (product.oldPrice !== undefined) {
        updateData.oldPrice = product.oldPrice ? Number(product.oldPrice) : null;
      }
      if (product.tag !== undefined) {
        updateData.tag = product.tag ? String(product.tag).trim() : null;
      }

      if (file) {
        // Lösche altes Bild, wenn vorhanden
        const oldProduct = await this.getProductById(id);
        if (oldProduct?.image && oldProduct.image.includes('firebase')) {
          const oldImagePath = oldProduct.image.split('?')[0].split('/o/')[1].replace(/%2F/g, '/');
          try {
            await this.storageService.deleteImage(oldImagePath);
          } catch (error) {
            console.error('Error deleting old image:', error);
          }
        }

        // Lade neues Bild hoch
        const imagePath = `${this.storagePath}/${id}/${file.name}`;
        
        // Warte auf den Upload und die finale URL
        const uploadResult = await new Promise<string>((resolve, reject) => {
          const subscription = this.storageService.uploadProductImage(file, imagePath).subscribe({
            next: (progress) => {
              if (progress.url) {
                resolve(progress.url);
                subscription.unsubscribe();
              }
            },
            error: (error) => {
              reject(error);
              subscription.unsubscribe();
            }
          });
        });
        
        updateData.image = uploadResult;
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      // Lösche zuerst das Bild
      const product = await this.getProductById(id);
      if (product?.image && product.image.includes('firebase')) {
        const imagePath = product.image.split('?')[0].split('/o/')[1].replace(/%2F/g, '/');
        try {
          await this.storageService.deleteImage(imagePath);
        } catch (error) {
          console.error('Error deleting image:', error);
        }
      }

      // Dann lösche das Produkt-Dokument
      const docRef = doc(this.firestore, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
}