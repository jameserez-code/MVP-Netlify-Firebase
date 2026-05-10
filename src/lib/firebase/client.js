// Firebase Client Initialization - Production Ready
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore-compat.js";
import { firebaseConfig, validateConfig } from "../../config/firebase.config.js";

class FirebaseClient {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return this;
    
    try {
      // Validate configuration
      if (!validateConfig(firebaseConfig)) {
        throw new Error("Invalid Firebase configuration");
      }
      
      // Initialize Firebase app
      this.app = initializeApp(firebaseConfig);
      
      // Initialize services
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      
      this.initialized = true;
      console.log("Firebase client initialized successfully");
      
    } catch (error) {
      console.error("Firebase initialization error:", error);
      throw new Error(`Failed to initialize Firebase: ${error.message}`);
    }
    
    return this;
  }

  // Authentication methods
  async signIn(email, password) {
    if (!this.initialized) throw new Error("Firebase not initialized");
    
    const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js");
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async signOut() {
    if (!this.initialized) throw new Error("Firebase not initialized");
    
    const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js");
    return signOut(this.auth);
  }

  onAuthStateChanged(callback) {
    if (!this.initialized) throw new Error("Firebase not initialized");
    return this.auth.onAuthStateChanged(callback);
  }

  getCurrentUser() {
    if (!this.initialized) throw new Error("Firebase not initialized");
    return this.auth.currentUser;
  }

  // Database methods
  async addDocument(collectionName, data) {
    if (!this.initialized) throw new Error("Firebase not initialized");
    
    const { addDoc, collection } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore-compat.js");
    const docRef = await addDoc(collection(this.db, collectionName), {
      ...data,
      createdAt: new Date().toISOString(),
      uid: this.getCurrentUser()?.uid || null
    });
    
    return docRef.id;
  }

  async getDocuments(collectionName, uid = null) {
    if (!this.initialized) throw new Error("Firebase not initialized");
    
    const { collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore-compat.js");
    
    let q = collection(this.db, collectionName);
    if (uid) {
      q = query(q, where("uid", "==", uid));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

// Singleton instance
const firebaseClient = new FirebaseClient();

export { firebaseClient };