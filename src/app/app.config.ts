import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore, enableIndexedDbPersistence } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFunctions, getFunctions } from '@angular/fire/functions';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { FIREBASE_OPTIONS } from '@angular/fire/compat';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withFetch()),
    provideFirebaseApp(() => {
      const app = initializeApp(environment.firebase);
      return app;
    }),
    provideFirestore(() => {
      const firestore = getFirestore();
      enableIndexedDbPersistence(firestore).catch((err) => {
        if (err.code == 'failed-precondition') {
          console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
        } else if (err.code == 'unimplemented') {
          console.warn('The current browser does not support persistence.');
        }
      });
      return firestore;
    }),
    provideAuth(() => getAuth()),
    provideFunctions(() => getFunctions()),
    provideStorage(() => getStorage()),
    { provide: FIREBASE_OPTIONS, useValue: environment.firebase }
  ]
};
