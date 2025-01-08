const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialisiere Firebase Admin
const serviceAccount = require(path.join(process.cwd(), 'horizonnet-ed13d-firebase-adminsdk-z0yrt-1be0c6cc92.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'horizonnet-ed13d.firebasestorage.app'
});

const bucket = admin.storage().bucket();

// Liste der hochzuladenden Dokumente
const documents = [
  { source: path.join(process.cwd(), 'src/assets/documents/agb.pdf'), destination: 'documents/agb.pdf' },
  { source: path.join(process.cwd(), 'src/assets/documents/datenschutz.pdf'), destination: 'documents/datenschutz.pdf' },
  { source: path.join(process.cwd(), 'src/assets/documents/widerrufsbehlerung.pdf'), destination: 'documents/widerrufsbelehrung.pdf' }
];

async function uploadDocuments() {
  for (const doc of documents) {
    try {
      console.log('Uploading file:', doc.source);
      await bucket.upload(doc.source, {
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