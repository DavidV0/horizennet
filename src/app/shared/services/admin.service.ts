import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc, collection, getDocs } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {}

  async createAdmin(email: string, password: string): Promise<void> {
    try {
      // Überprüfe, ob der aktuelle Benutzer ein Admin ist
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('Sie müssen eingeloggt sein, um einen Admin zu erstellen.');
      }

      const isCurrentUserAdmin = await this.isAdmin(currentUser.uid);
      if (!isCurrentUserAdmin) {
        throw new Error('Nur Administratoren können neue Admins erstellen.');
      }

      // Erstelle den Benutzer in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // Speichere zusätzliche Admin-Informationen in Firestore
      const adminRef = doc(this.firestore, 'admins', userCredential.user.uid);
      await setDoc(adminRef, {
        email: email,
        role: 'admin',
        createdAt: new Date(),
        createdBy: currentUser.uid
      });

      return;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async createFirstAdmin(email: string, password: string): Promise<void> {
    try {
      // Überprüfe, ob bereits Admins existieren
      const adminsCollection = collection(this.firestore, 'admins');
      const adminsSnapshot = await getDocs(adminsCollection);
      
      if (!adminsSnapshot.empty) {
        throw new Error('Es existiert bereits ein Administrator. Bitte verwenden Sie den normalen Anmeldeprozess.');
      }

      // Erstelle den ersten Admin-Benutzer
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // Speichere Admin-Informationen
      const adminRef = doc(this.firestore, 'admins', userCredential.user.uid);
      await setDoc(adminRef, {
        email: email,
        role: 'admin',
        isFirstAdmin: true,
        createdAt: new Date()
      });

      return;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async isAdmin(uid: string): Promise<boolean> {
    try {
      const adminRef = doc(this.firestore, 'admins', uid);
      const adminDoc = await getDoc(adminRef);
      return adminDoc.exists();
    } catch (error) {
      return false;
    }
  }
} 