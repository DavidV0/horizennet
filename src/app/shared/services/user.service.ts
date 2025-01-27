import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { firstValueFrom } from 'rxjs';
import { ShopProduct } from '../interfaces/shop-product.interface';
import firebase from 'firebase/compat/app';
import { AuthService } from './auth.service';
import { Observable, from, of, switchMap, map, catchError } from 'rxjs';
import { User, LessonProgress, ModuleProgress, CourseProgress, Progress } from '../models/user.model';

export interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  street: string;
  streetNumber: string;
  zipCode: string;
  city: string;
  country: string;
  mobile: string;
  paymentPlan: number;
  purchaseDate: Date;
  productKey: string;
  status: string;
  keyActivated: boolean;
  accountActivated: boolean;
  becomePartner?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  purchasedCourses?: string[];
  productType?: string;
}

interface ConsentData {
  acceptTerms: boolean;
  consent1: boolean;
  consent2: boolean;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(
    private firestore: AngularFirestore,
    private auth: AngularFireAuth,
    private functions: AngularFireFunctions,
    private authService: AuthService
  ) {}

  getCurrentUser(): Observable<User | null> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) return of(null);
        return this.firestore.doc<User>(`users/${user.uid}`).valueChanges().pipe(
          map(userData => userData || null)
        );
      })
    );
  }

  async createUserWithEmailAndPassword(email: string, password: string) {
    return await this.auth.createUserWithEmailAndPassword(email, password);
  }

  async createUser(userData: UserData) {
    console.log('Starting createUser with data:', userData);
    
    try {
      // Create a product key document with user data only
      console.log('Creating product key document...');
      await this.firestore.collection('productKeys').doc(userData.productKey).set({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        street: userData.street,
        streetNumber: userData.streetNumber,
        zipCode: userData.zipCode,
        city: userData.city,
        country: userData.country,
        mobile: userData.mobile,
        paymentPlan: userData.paymentPlan,
        purchaseDate: new Date(),
        status: 'pending_activation',
        keyActivated: false,
        createdAt: new Date(),
        becomePartner: userData.becomePartner || false,
        purchasedCourses: userData.purchasedCourses || [],
        productType: userData.productType || 'crypto'
      });
      console.log('Product key document created successfully');

      // Send purchase confirmation email
      console.log('Sending purchase confirmation email...');
      const sendEmail = this.functions.httpsCallable('sendPurchaseConfirmation');
      const result = await sendEmail({
        email: userData.email,
        productKey: userData.productKey,
        firstName: userData.firstName,
        lastName: userData.lastName,
        becomePartner: userData.becomePartner || false
      });
      console.log('Email sending result:', result);

      return userData.productKey;
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  async activateProductKey(productKey: string, consent: ConsentData) {
    if (!consent.acceptTerms || !consent.consent1 || !consent.consent2) {
      throw new Error('Alle Zustimmungen müssen akzeptiert werden');
    }

    try {
      // Check if product key exists and is valid
      const keyDoc = await this.firestore.collection('productKeys').doc(productKey).get().toPromise();
      if (!keyDoc?.exists) {
        throw new Error('Invalid product key');
      }

      const keyData = keyDoc.data() as any;
      
      if (keyData.keyActivated) {
        throw new Error('Dieser Produktschlüssel wurde bereits aktiviert.');
      }

      // Check for email in customerEmail field first, then fall back to email field
      const email = keyData.customerEmail || keyData.email;
      
      if (!email) {
        throw new Error('Keine E-Mail-Adresse für diesen Produktschlüssel gefunden.');
      }

      // Get course IDs from the product key document
      let courseIds = keyData.courseIds || [];

      if (!courseIds || courseIds.length === 0) {
        // Try to get course IDs from customer document as fallback
        if (keyData.customerId && keyData.productId) {
          const customerDoc = await this.firestore.collection('customers').doc(keyData.customerId).get().toPromise();
          if (customerDoc?.exists) {
            const customerData = customerDoc.data() as any;
            if (customerData?.products?.[keyData.productId]?.courseIds) {
              courseIds = customerData.products[keyData.productId].courseIds;
            }
          }
        }

        // If still no course IDs and it's a crypto product, assign default crypto course
        if ((!courseIds || courseIds.length === 0) && keyData.productType === 'crypto') {
          const cryptoCourseId = 'GMrcDhUa9rQQ7C5lm404'; // Default crypto course ID
          courseIds = [cryptoCourseId];
        }
      }

      // Update keyData.email to ensure it's available for the rest of the process
      keyData.email = email;

      // Generate password and create or get Firebase Auth user
      const password = Math.random().toString(36).slice(-8);
      let user;
      let isNewUser = true;

      // First check if there's a currently logged in user
      const currentUser = await this.auth.currentUser;
      if (currentUser) {
        // If the current user's email matches the product key email, use that user
        if (currentUser.email === keyData.email) {
          user = currentUser;
          isNewUser = false;
        } else {
          // If emails don't match, sign out the current user
          await this.auth.signOut();
        }
      }

      // If no user yet, try to create one
      if (!user) {
        try {
          const userCredential = await this.auth.createUserWithEmailAndPassword(keyData.email, password);
          user = userCredential.user;
        } catch (authError: any) {
          isNewUser = false;
          if (authError.code === 'auth/email-already-in-use') {
            // Check if user exists in our database
            const existingUser = await this.checkIfUserExists(keyData.email);
            if (existingUser) {
              throw new Error('Diese E-Mail-Adresse wurde bereits aktiviert. Bitte verwenden Sie die Anmeldedaten aus Ihrer Aktivierungs-E-Mail.');
            }
            
            // If user exists in Auth but not in our database, try to sign in
            try {
              const userCredential = await this.auth.signInWithEmailAndPassword(keyData.email, password);
              user = userCredential.user;
            } catch (signInError) {
              throw new Error('Bitte melden Sie sich mit Ihrer E-Mail-Adresse an, um den Produktschlüssel zu aktivieren.');
            }
          } else {
            throw authError;
          }
        }
      }

      if (!user) {
        throw new Error('Failed to create or get user account');
      }

      // Create user document with consent data and course IDs
      const userData = {
        firstName: keyData.firstName || '',
        lastName: keyData.lastName || '',
        email: email,
        street: keyData.street || '',
        streetNumber: keyData.streetNumber || '',
        zipCode: keyData.zipCode || '',
        city: keyData.city || '',
        country: keyData.country || '',
        mobile: keyData.mobile || '',
        paymentPlan: keyData.paymentPlan || 0,
        purchaseDate: keyData.purchaseDate || new Date(),
        productKey: productKey,
        status: 'active',
        keyActivated: true,
        accountActivated: false,
        firebaseUid: user.uid,
        activatedAt: new Date(),
        consent: {
          acceptTerms: consent.acceptTerms,
          consent1: consent.consent1,
          consent2: consent.consent2,
          timestamp: consent.timestamp
        },
        courses: {
          purchased: courseIds,
          progress: {}
        }
      };

      // Create user document
      await this.firestore.collection('users').doc(user.uid).set(userData);

      // Update product key status with consent data
      await this.firestore.collection('productKeys').doc(productKey).update({
        status: 'active',
        keyActivated: true,
        activatedAt: new Date(),
        firebaseUid: user.uid,
        email: email,
        consent: {
          acceptTerms: consent.acceptTerms,
          consent1: consent.consent1,
          consent2: consent.consent2,
          timestamp: consent.timestamp
        }
      });

      // Send confirmation email with login credentials only if new user was created
      if (isNewUser) {
        try {
          const sendEmail = this.functions.httpsCallable('sendActivationConfirmation');
          await firstValueFrom(sendEmail({
            email: keyData.email,
            password: password,
            firstName: keyData.firstName,
            lastName: keyData.lastName,
            userId: user.uid,
            productType: keyData.productType || 'crypto'
          }));
        } catch (error: any) {
          console.error('Error sending activation email:', error);
        }
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  async activateAccount(userId: string) {
    try {
      await this.firestore.collection('users').doc(userId).update({
        accountActivated: true,
        status: 'active'
      });
      return true;
    } catch (error) {
      console.error('Error activating account:', error);
      throw error;
    }
  }

  async checkIfUserExists(email: string): Promise<boolean> {
    try {
      const usersSnapshot = await this.firestore
        .collection('users', ref => ref.where('email', '==', email))
        .get()
        .toPromise();

      return !!(usersSnapshot && usersSnapshot.docs.length > 0);
    } catch (error) {
      console.error('Error checking user existence:', error);
      throw error;
    }
  }

  async updateUserSubscription(productKey: string, subscriptionId: string) {
    try {
      await this.firestore.collection('productKeys').doc(productKey).update({
        stripeSubscriptionId: subscriptionId
      });
    } catch (error) {
      console.error('Error updating user subscription:', error);
      throw error;
    }
  }

  async activateProductAccess(customerId: string, productKey: string, product: ShopProduct) {
    try {
      // Ensure we're authenticated
      const currentUser = await this.auth.currentUser;
      if (!currentUser) {
        // Sign in anonymously if no user is signed in
        await this.auth.signInAnonymously();
      }

      // Create or update product key document with all necessary data
      const productKeyData = {
        isActivated: false,
        customerId,
        productId: product.id,
        createdAt: new Date(),
        courseIds: product.courseIds || [],
        status: 'pending_activation',
        purchaseDate: new Date(),
        productType: product.tag === 'crypto' || product.name.toLowerCase().includes('crypto') ? 'crypto' : undefined
      };

      if (productKeyData.productType === 'crypto' && (!productKeyData.courseIds || productKeyData.courseIds.length === 0)) {
        productKeyData.courseIds = ['GMrcDhUa9rQQ7C5lm404']; // Default crypto course ID
      }

      await this.firestore.collection('productKeys').doc(productKey).set(productKeyData, { merge: true });

      // Create or update customer's document with product access
      const customerData = {
        [`products.${product.id}`]: {
          activated: false,
          productKey,
          createdAt: new Date(),
          courseIds: productKeyData.courseIds
        }
      };

      await this.firestore.collection('customers').doc(customerId).set(customerData, { merge: true });

      return true;
    } catch (error) {
      throw error;
    }
  }

  markLessonAsCompleted(courseId: string, moduleId: string, lessonId: string, completionType: 'video' | 'quiz'): Observable<void> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) throw new Error('No user logged in');
        
        const userRef = this.firestore.doc(`users/${user.uid}`);
        return userRef.get().pipe(
          switchMap(doc => {
            const userData = doc.data() as User;
            const progress: Progress = userData.progress || { courses: {} };
            
            if (!progress.courses[courseId]) {
              progress.courses[courseId] = {
                modules: {},
                startedAt: new Date()
              };
            }
            
            if (!progress.courses[courseId].modules[moduleId]) {
              progress.courses[courseId].modules[moduleId] = {
                lessons: {}
              };
            }
            
            progress.courses[courseId].modules[moduleId].lessons[lessonId] = {
              completed: true,
              completedAt: new Date(),
              completionType
            };
            
            return from(userRef.update({ progress }));
          })
        );
      })
    );
  }

  getLessonProgress(courseId: string, moduleId: string, lessonId: string): Observable<boolean> {
    return this.getCurrentUser().pipe(
      map(user => {
        if (!user?.progress?.courses[courseId]?.modules[moduleId]?.lessons[lessonId]?.completed) {
          return false;
        }
        return true;
      })
    );
  }

  getModuleProgress(courseId: string, moduleId: string): Observable<number> {
    return this.getCurrentUser().pipe(
      map(user => {
        const moduleProgress = user?.progress?.courses[courseId]?.modules[moduleId]?.lessons || {};
        const lessons = Object.values(moduleProgress) as LessonProgress[];
        const completedLessons = lessons.filter(lesson => lesson.completed).length;
        const totalLessons = lessons.length;
        
        return totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
      })
    );
  }

  getCourseProgress(courseId: string): Observable<number> {
    return this.getCurrentUser().pipe(
      map(user => {
        const courseProgress = user?.progress?.courses[courseId]?.modules || {};
        let completedLessons = 0;
        let totalLessons = 0;
        
        Object.values(courseProgress).forEach((module: ModuleProgress) => {
          const lessons = Object.values(module.lessons) as LessonProgress[];
          completedLessons += lessons.filter(lesson => lesson.completed).length;
          totalLessons += lessons.length;
        });
        
        return totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
      })
    );
  }

  async purchaseCourse(courseId: string, user: User): Promise<void> {
    const userRef = this.firestore.doc(`users/${user.firebaseUid}`);
    const userData = (await userRef.get().toPromise())?.data() as User;
    
    await userRef.update({
      purchasedCourses: [...new Set([...(userData?.purchasedCourses || []), courseId])]
    });
  }

  // Migration method for old purchase system to new system
  async migratePurchasedCourses(userId: string): Promise<void> {
    const userRef = this.firestore.doc(`users/${userId}`);
    const userDoc = await userRef.get().toPromise();
    
    if (!userDoc?.exists) return;
    
    const userData = userDoc.data() as User;
    if (!userData) return;

    // Collect courses from both old structures
    const oldPurchased = Array.isArray(userData?.purchased) ? userData.purchased : [];
    const coursesPurchased = Array.isArray(userData?.courses?.purchased) ? userData.courses.purchased : [];
    
    // Combine all purchased courses
    const allPurchasedCourses = [...new Set([...oldPurchased, ...coursesPurchased])];
    
    // Initialize progress structure with correct types
    const progress: Progress = {
      courses: allPurchasedCourses.reduce((acc, courseId) => {
        acc[courseId] = {
          modules: {},
          startedAt: new Date()
        };
        return acc;
      }, {} as { [courseId: string]: CourseProgress })
    };

    // Prepare update object
    const updateData = {
      purchasedCourses: allPurchasedCourses,
      progress,
      ...(userData.purchased && { purchased: firebase.firestore.FieldValue.delete() }),
      ...(userData.courses && { courses: firebase.firestore.FieldValue.delete() })
    };

    // Update the user document
    await userRef.update(updateData);
    
    console.log('Migration completed for user:', userId);
  }

  // Helper method to check if user has access to course
  hasAccessToCourse(courseId: string): Observable<boolean> {
    return this.getCurrentUser().pipe(
      map(user => {
        if (!user) return false;
        return user.purchasedCourses?.includes(courseId) || 
               user.purchased?.includes(courseId) || 
               user.courses?.purchased?.includes(courseId) || 
               false;
      })
    );
  }
} 