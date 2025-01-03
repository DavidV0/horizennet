import { Injectable } from '@angular/core';
import { Event } from '../interfaces/event.interface';
import { 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc,
  getDocs,
  query,
  orderBy
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private readonly collectionName = 'events';

  constructor(private firestore: Firestore) {
    this.initializeEvents();
  }

  private async initializeEvents() {
    const eventsRef = collection(this.firestore, this.collectionName);
    const snapshot = await getDocs(eventsRef);
    
    if (snapshot.empty) {
      const sampleEvents: Event[] = [
        {
          id: 'event1',
          title: 'Inner Circle Weihnachtsfeier',
          description: 'Exklusives Weihnachtsevent für unsere Inner Circle Mitglieder',
          time: '19:00 - 23:30',
          location: 'Kontaktieren Sie uns per Mail für detaillierte Informationen',
          image: 'assets/images/events/christmas-event.jpg',
          date: {
            day: '20',
            month: 'DEZ'
          },
          status: 'upcoming'
        },
        {
          id: 'event2',
          title: 'Jahresabschluss Mastermind',
          description: 'Strategieplanung und Networking zum Jahresabschluss',
          time: '14:00 - 18:00',
          location: 'Kontaktieren Sie uns per Mail für detaillierte Informationen',
          image: 'assets/images/events/mastermind.jpg',
          date: {
            day: '15',
            month: 'DEZ'
          },
          status: 'upcoming'
        },
        {
          id: 'event3',
          title: 'Inner Circle MEETUP',
          description: 'Networking und Austausch im exklusiven Kreis',
          time: '17:00 - 22:00',
          location: 'Kontaktieren Sie uns per Mail für detaillierte Informationen',
          image: 'assets/images/events/meetup.jpg',
          date: {
            day: '08',
            month: 'DEZ'
          },
          status: 'upcoming'
        },
        {
          id: 'event4',
          title: 'Business Strategy Workshop',
          description: 'Intensive Strategieentwicklung für Ihr Business',
          time: '10:00 - 16:00',
          location: 'Kontaktieren Sie uns per Mail für detaillierte Informationen',
          image: 'assets/images/events/workshop.jpg',
          date: {
            day: '05',
            month: 'DEZ'
          },
          status: 'upcoming'
        },
        {
          id: 'event5',
          title: 'Inner Circle Networking – Team Event',
          description: 'Ganztägiges Networking Event für Team-Building',
          time: 'Ganztägig',
          location: 'Kontaktieren Sie uns per Mail für detaillierte Informationen',
          image: 'assets/images/events/networking.jpg',
          date: {
            day: '29',
            month: 'NOV'
          },
          status: 'upcoming'
        },
        {
          id: 'event6',
          title: 'Investment Strategien 2024',
          description: 'Ausblick und Strategien für das kommende Investmentjahr',
          time: '18:00 - 21:00',
          location: 'Kontaktieren Sie uns per Mail für detaillierte Informationen',
          image: 'assets/images/events/investment.jpg',
          date: {
            day: '25',
            month: 'NOV'
          },
          status: 'upcoming'
        }
      ];

      for (const event of sampleEvents) {
        await this.createEvent(event);
      }
    }
  }

  getAllEvents(): Observable<Event[]> {
    const eventsRef = collection(this.firestore, this.collectionName);
    const q = query(eventsRef, orderBy('title'));
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Event))
    );
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const docRef = doc(this.firestore, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { ...docSnap.data(), id: docSnap.id } as Event : undefined;
  }

  async createEvent(event: Event): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, event.id);
    return setDoc(docRef, event);
  }

  async updateEvent(id: string, event: Partial<Event>): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    return setDoc(docRef, event, { merge: true });
  }

  async deleteEvent(id: string): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    return deleteDoc(docRef);
  }
} 