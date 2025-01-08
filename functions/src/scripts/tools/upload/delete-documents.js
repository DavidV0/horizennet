const admin = require('firebase-admin');
const path = require('path');

// Initialisiere Firebase Admin
const serviceAccount = require(path.join(process.cwd(), 'horizonnet-ed13d-firebase-adminsdk-z0yrt-1be0c6cc92.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'horizonnet-ed13d.firebasestorage.app'
});

const bucket = admin.storage().bucket();

// Liste der zu löschenden Dokumente
const documents = [
  'documents/abg.pdf',
  'documents/widerrufsbehlerung.pdf'
];

async function deleteDocuments() {
  for (const doc of documents) {
    try {
      console.log('Deleting file:', doc);
      await bucket.file(doc).delete();
      console.log(`Successfully deleted ${doc}`);
    } catch (error) {
      console.error(`Error deleting ${doc}:`, error);
    }
  }
}

deleteDocuments().then(() => {
  console.log('All documents deleted successfully');
  process.exit(0);
}).catch(error => {
  console.error('Error deleting documents:', error);
  process.exit(1);
}); 