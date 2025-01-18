import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../shared/services/auth.service';
import { UserService, UserData } from '../../shared/services/user.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { take } from 'rxjs/operators';
import { EmailAuthProvider } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  userData: UserData | null = null;
  showPassword = {
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  };
  showProfileSuccess = false;
  showPasswordSuccess = false;
  passwordError: string | null = null;
  resetPasswordSuccess = false;
  resetPasswordError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth,
    private userService: UserService
  ) {
    this.initializeForms();
  }

  ngOnInit() {
    this.loadUserData();
  }

  private initializeForms() {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      street: [''],
      streetNumber: [''],
      zipCode: [''],
      city: ['']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });

    // Reset Fehler wenn sich das Formular ändert
    this.passwordForm.valueChanges.subscribe(() => {
      this.passwordError = null;
    });
  }

  private passwordMatchValidator(g: FormGroup) {
    const newPassword = g.get('newPassword')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    if (newPassword === confirmPassword) {
      g.get('confirmPassword')?.setErrors(null);
      return null;
    }
    g.get('confirmPassword')?.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }

  async loadUserData() {
    const user = await this.authService.user$.pipe(take(1)).toPromise();
    if (user) {
      this.firestore.collection('users').doc(user.uid).valueChanges()
        .subscribe((data: any) => {
          // Verbesserte Datumskonvertierung
          let purchaseDate;
          if (data.purchaseDate) {
            if (data.purchaseDate instanceof Timestamp) {
              purchaseDate = data.purchaseDate.toDate();
            } else if (data.purchaseDate.seconds) {
              // Wenn es ein Firestore Timestamp-Objekt ist, aber nicht als Instance erkannt wird
              purchaseDate = new Timestamp(data.purchaseDate.seconds, data.purchaseDate.nanoseconds).toDate();
            } else {
              // Versuche das Datum zu parsen
              const parsedDate = new Date(data.purchaseDate);
              purchaseDate = isNaN(parsedDate.getTime()) ? null : parsedDate;
            }
          }

          this.userData = {
            ...data,
            purchaseDate: purchaseDate || null,
            status: data.accountActivated && data.keyActivated ? 'active' : 'pending_activation'
          } as UserData;

          if (this.userData) {
            this.profileForm.patchValue({
              firstName: this.userData.firstName || '',
              lastName: this.userData.lastName || '',
              email: this.userData.email || '',
              phone: this.userData.mobile || '',
              street: this.userData.street || '',
              streetNumber: this.userData.streetNumber || '',
              zipCode: this.userData.zipCode || '',
              city: this.userData.city || ''
            });
          }
        });
    }
  }

  async updateProfile() {
    if (this.profileForm.valid) {
      try {
        const user = await this.authService.user$.pipe(take(1)).toPromise();
        if (user) {
          await this.firestore.collection('users').doc(user.uid).update(this.profileForm.value);
          this.showProfileSuccess = true;
          setTimeout(() => {
            this.showProfileSuccess = false;
          }, 3000);
        }
      } catch (error) {
        console.error('Error updating profile:', error);
      }
    }
  }

  async updatePassword() {
    if (this.passwordForm.valid) {
      try {
        const currentPassword = this.passwordForm.get('currentPassword')?.value;
        const newPassword = this.passwordForm.get('newPassword')?.value;
        
        const user = await this.afAuth.currentUser;
        if (!user || !user.email) {
          this.passwordError = 'Benutzer nicht gefunden. Bitte melden Sie sich erneut an.';
          return;
        }

        try {
          // Reauth mit aktuellem Passwort
          const credential = EmailAuthProvider.credential(user.email, currentPassword);
          await user.reauthenticateWithCredential(credential);
        } catch (error: any) {
          console.error('Reauthentication error:', error);
          if (error.code === 'auth/wrong-password') {
            this.passwordError = 'Das aktuelle Passwort ist falsch';
          } else {
            this.passwordError = 'Fehler bei der Authentifizierung. Bitte versuchen Sie es erneut.';
          }
          return;
        }

        // Passwort ändern
        await user.updatePassword(newPassword);
        this.passwordForm.reset();
        this.showPasswordSuccess = true;
        setTimeout(() => {
          this.showPasswordSuccess = false;
        }, 3000);
        
      } catch (error: any) {
        console.error('Error updating password:', error);
        if (error.code === 'auth/requires-recent-login') {
          this.passwordError = 'Bitte melden Sie sich erneut an und versuchen Sie es dann nochmal';
        } else if (error.code === 'auth/weak-password') {
          this.passwordError = 'Das neue Passwort ist zu schwach';
        } else {
          this.passwordError = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut';
        }
      }
    }
  }

  togglePasswordVisibility(field: 'currentPassword' | 'newPassword' | 'confirmPassword') {
    this.showPassword[field] = !this.showPassword[field];
  }

  getPasswordFieldType(field: 'currentPassword' | 'newPassword' | 'confirmPassword'): string {
    return this.showPassword[field] ? 'text' : 'password';
  }

  async resetPassword() {
    this.resetPasswordSuccess = false;
    this.resetPasswordError = null;
    
    try {
      if (!this.userData?.email) {
        this.resetPasswordError = 'Keine E-Mail-Adresse gefunden.';
        return;
      }

      await this.afAuth.sendPasswordResetEmail(this.userData.email);
      this.resetPasswordSuccess = true;
      
      setTimeout(() => {
        this.resetPasswordSuccess = false;
      }, 8000);
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      
      if (error.code === 'auth/user-not-found') {
        this.resetPasswordError = 'Kein Benutzer mit dieser E-Mail-Adresse gefunden.';
      } else {
        this.resetPasswordError = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
      }
    }
  }
} 