import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc, getDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Event } from '../interfaces/event.interface';
import { StorageService, UploadProgress } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private readonly collectionName = 'events';
  private readonly storagePath = 'events';

  constructor(
    private firestore: Firestore,
    private storageService: StorageService
  ) {}

  getAllEvents(): Observable<Event[]> {
    const eventsRef = collection(this.firestore, this.collectionName);
    const events$ = new Observable<Event[]>(observer => {
      getDocs(eventsRef).then(snapshot => {
        const events: Event[] = [];
        snapshot.forEach(doc => {
          events.push({ id: doc.id, ...doc.data() } as Event);
        });
        observer.next(events);
        observer.complete();
      }).catch(error => observer.error(error));
    });
    return events$;
  }

  async getEventById(id: string): Promise<Event | undefined> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Event : undefined;
    } catch (error) {
      console.error('Error getting event:', error);
      throw error;
    }
  }

  async createEvent(event: Omit<Event, 'id'>, file?: File): Promise<void> {
    try {
      console.log('Received event data:', event);

      const title = event.title ? String(event.title).trim() : '';
      if (!title) {
        throw new Error('A valid title is required');
      }

      const eventsRef = collection(this.firestore, this.collectionName);
      const newDoc = doc(eventsRef);
      const eventId = newDoc.id;

      const eventData: any = {
        title,
        description: event.description,
        day: event.day,
        month: event.month,
        time: event.time,
        location: event.location,
        status: event.status
      };

      if (file) {
        const imagePath = `${this.storagePath}/${eventId}/${file.name}`;
        
        const uploadResult = await new Promise<string>((resolve, reject) => {
          const subscription = this.storageService.uploadProductImage(file, imagePath).subscribe({
            next: (progress: UploadProgress) => {
              if (progress.url) {
                resolve(progress.url);
                subscription.unsubscribe();
              }
            },
            error: (error: unknown) => {
              reject(error);
              subscription.unsubscribe();
            }
          });
        });
        
        eventData.image = uploadResult;
      }

      console.log('Saving event data:', eventData);
      await addDoc(eventsRef, eventData);
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  async updateEvent(id: string, event: Partial<Event>, file?: File): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      
      const updateData: any = {};
      
      if (event.title !== undefined) {
        updateData.title = String(event.title).trim();
      }
      if (event.description !== undefined) {
        updateData.description = String(event.description).trim();
      }
      if (event.day !== undefined) {
        updateData.day = event.day;
      }
      if (event.month !== undefined) {
        updateData.month = event.month;
      }
      if (event.time !== undefined) {
        updateData.time = event.time;
      }
      if (event.location !== undefined) {
        updateData.location = event.location;
      }
      if (event.status !== undefined) {
        updateData.status = event.status;
      }

      if (file) {
        const oldEvent = await this.getEventById(id);
        if (oldEvent?.image && oldEvent.image.includes('firebase')) {
          const oldImagePath = oldEvent.image.split('?')[0].split('/o/')[1].replace(/%2F/g, '/');
          try {
            await this.storageService.deleteImage(oldImagePath);
          } catch (error) {
            console.error('Error deleting old image:', error);
          }
        }

        const imagePath = `${this.storagePath}/${id}/${file.name}`;
        
        const uploadResult = await new Promise<string>((resolve, reject) => {
          const subscription = this.storageService.uploadProductImage(file, imagePath).subscribe({
            next: (progress: UploadProgress) => {
              if (progress.url) {
                resolve(progress.url);
                subscription.unsubscribe();
              }
            },
            error: (error: unknown) => {
              reject(error);
              subscription.unsubscribe();
            }
          });
        });
        
        updateData.image = uploadResult;
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  async deleteEvent(id: string): Promise<void> {
    try {
      const event = await this.getEventById(id);
      if (event?.image && event.image.includes('firebase')) {
        const imagePath = event.image.split('?')[0].split('/o/')[1].replace(/%2F/g, '/');
        try {
          await this.storageService.deleteImage(imagePath);
        } catch (error) {
          console.error('Error deleting image:', error);
        }
      }

      const docRef = doc(this.firestore, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }
} 