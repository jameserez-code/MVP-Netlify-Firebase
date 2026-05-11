'use strict';

const admin = require('firebase-admin');

let initialized = false;

function getFirestore() {
  if (!initialized) {
    const projectId = process.env.FIREBASE_PROJECT_ID ||
      process.env.GCLOUD_PROJECT;

    if (!projectId) {
      throw new Error(
        'Firebase not configured. Set FIREBASE_PROJECT_ID environment variable ' +
        'or provide GCLOUD_PROJECT. In local dev, set GOOGLE_APPLICATION_CREDENTIALS ' +
        'to a service account key path.'
      );
    }

    admin.initializeApp({
      projectId,
      credential: process.env.GOOGLE_APPLICATION_CREDENTIALS
        ? admin.credential.applicationDefault()
        : admin.credential.cert({
            projectId,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
          }),
    });

    initialized = true;
  }

  return admin.firestore();
}

// Wrapper for atomic ticket usage (prevents replay)
async function markTicketUsed(intentId) {
  const db = getFirestore();
  const ref = db.collection('gatewayTickets').doc(intentId);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) {
      throw new Error('ticket_not_found');
    }
    if (doc.data().status !== 'unused') {
      if (doc.data().status === 'used') throw new Error('ticket_replayed');
      if (doc.data().status === 'expired') throw new Error('ticket_expired');
      throw new Error('ticket_unknown_status');
    }
    tx.update(ref, { status: 'used', usedAt: new Date().toISOString() });
    return doc.data();
  });
}

module.exports = { getFirestore, markTicketUsed };
