const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialisiere Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'horizonnet-ed13d.appspot.com'
});

const bucket = admin.storage().bucket();

// Liste der hochzuladenden Dokumente
const documents = [
  { source: '../src/assets/documents/agb.pdf', destination: 'documents/agb.pdf' },
  { source: '../src/assets/documents/datenschutz.pdf', destination: 'documents/datenschutz.pdf' },
  { source: '../src/assets/documents/widerrufsbehlerung.pdf', destination: 'documents/widerrufsbelehrung.pdf' }
];

async function uploadDocuments() {
  for (const doc of documents) {
    try {
      const filePath = path.join(__dirname, doc.source);
      await bucket.upload(filePath, {
        destination: doc.destination,
        metadata: {
          contentType: 'application/pdf'
        }
      });
      console.log(`Successfully uploaded ${doc.source} to ${doc.destination}`);
    } catch (error) {
      console.error(`Error uploading ${doc.source}:`, error);
    }
  }
}

uploadDocuments().then(() => {
  console.log('All documents uploaded successfully');
  process.exit(0);
}).catch(error => {
  console.error('Error uploading documents:', error);
  process.exit(1);
}); 