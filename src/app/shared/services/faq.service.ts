import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDocs,
  query as firestoreQuery,
  orderBy as firestoreOrderBy
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { FaqItem } from '../interfaces/faq.interface';

@Injectable({
  providedIn: 'root'
})
export class FaqService {
  private readonly collectionName = 'faqs';

  constructor(private firestore: Firestore) {}

  getAllFaqs(): Observable<FaqItem[]> {
    const faqs = collection(this.firestore, this.collectionName);
    const q = firestoreQuery(faqs, firestoreOrderBy('question'));
    return from(getDocs(q)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FaqItem[];
      })
    );
  }

  async createFaq(faq: Omit<FaqItem, 'id'>): Promise<void> {
    const faqs = collection(this.firestore, this.collectionName);
    await addDoc(faqs, faq);
  }

  async updateFaq(id: string, faq: Partial<FaqItem>): Promise<void> {
    const faqDoc = doc(this.firestore, this.collectionName, id);
    await updateDoc(faqDoc, { ...faq });
  }

  async deleteFaq(id: string): Promise<void> {
    const faqDoc = doc(this.firestore, this.collectionName, id);
    await deleteDoc(faqDoc);
  }
} 