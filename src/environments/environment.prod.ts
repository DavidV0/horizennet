export const environment = {
  production: true,
  firebase: {
    apiKey: '${{ secrets.FIREBASE_API_KEY }}',
    authDomain: '${{ secrets.FIREBASE_AUTH_DOMAIN }}',
    projectId: '${{ secrets.FIREBASE_PROJECT_ID }}',
    storageBucket: '${{ secrets.FIREBASE_STORAGE_BUCKET }}',
    messagingSenderId: '${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}',
    appId: '${{ secrets.FIREBASE_APP_ID }}',
    measurementId: '${{ secrets.FIREBASE_MEASUREMENT_ID }}'
  },
  functionsBaseUrl: 'https://api-kwordus5wa-uc.a.run.app'
}; 