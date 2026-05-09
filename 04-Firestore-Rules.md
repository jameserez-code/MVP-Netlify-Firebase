# Firestore Security Rules (Per-User Memory)

These are example rules for per-user memory isolation. Adapt and apply in the Firebase console.

service cloud.firestore {
  match /databases/{database}/documents {
    // Memory namespace
    match /secrets/{uid}/{doc=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Fallback deny for other paths
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
