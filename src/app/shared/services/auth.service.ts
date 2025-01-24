import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, user, sendPasswordResetEmail } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AngularFirestore } from '@angular/fire/compat/firestore';

interface User {
  uid: string;
  email: string | null;
  firstName?: string;
  lastName?: string;
  status?: 'active' | 'inactive';
  accountActivated?: boolean;
  // ... andere Felder
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<any>;

  constructor(
    private auth: Auth,
    private router: Router,
    private firestore: AngularFirestore
  ) {
    this.user$ = user(this.auth);
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const uid = userCredential.user.uid;

      // Hole den aktuellen User-Datensatz
      const userDoc = await this.firestore.collection('users').doc(uid).get().toPromise();
      const userData = userDoc?.data() as User | undefined;

      // Bereite die Update-Daten vor
      const updateData: Partial<User> = {
        status: 'active'
      };

      // Wenn accountActivated noch nicht gesetzt ist (erster Login)
      if (!userData?.accountActivated) {
        updateData.accountActivated = true;
      }

      // Update den User-Datensatz
      await this.firestore.collection('users').doc(uid).update(updateData);

      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      const uid = this.auth.currentUser?.uid;
      if (uid) {
        // Setze den Status auf inaktiv
        await this.firestore.collection('users').doc(uid).update({
          status: 'inactive'
        });
      }
      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      // Überprüfe zuerst, ob der Benutzer in unserer Datenbank existiert
      const usersSnapshot = await this.firestore
        .collection('users', ref => ref.where('email', '==', email))
        .get()
        .toPromise();

      if (!usersSnapshot?.docs.length) {
        throw new Error('Diese E-Mail-Adresse ist nicht registriert.');
      }

      await sendPasswordResetEmail(this.auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  isLoggedIn(): Observable<any> {
    return this.user$;
  }

  getCurrentUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }
} 