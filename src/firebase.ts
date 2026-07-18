import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc as firestoreDeleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  writeBatch,
  getDocs
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuration loaded from the firebase-applet-config.json
const firebaseConfig = {
  projectId: "gen-lang-client-0220551398",
  appId: "1:554688163297:web:7f493d21f30dd0ab2e76a0",
  apiKey: "AIzaSyDiV_FLR50fSZKTPVNLLQMfmiZCKwoZUq0",
  authDomain: "gen-lang-client-0220551398.firebaseapp.com",
  storageBucket: "gen-lang-client-0220551398.firebasestorage.app",
  messagingSenderId: "554688163297"
};

const app = initializeApp(firebaseConfig);

// Use the custom databaseId provided in the applet config
const db = getFirestore(app, "ai-studio-goldroseexecutiv-24ffabdd-e90e-4dd9-8e2b-4b1051c7eea0");
const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Syncs a single document to Firestore.
 */
export async function saveDocument(collectionName: string, id: string, data: any) {
  const path = `${collectionName}/${id}`;
  try {
    const docRef = doc(db, collectionName, id);
    // Sanitize any undefined properties before uploading to Firestore
    const sanitized = JSON.parse(JSON.stringify(data));
    await setDoc(docRef, sanitized, { merge: true });
    console.log(`Successfully synced document ${id} to collection ${collectionName}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a document from Firestore.
 */
export async function deleteDocument(collectionName: string, id: string) {
  const path = `${collectionName}/${id}`;
  try {
    const docRef = doc(db, collectionName, id);
    await firestoreDeleteDoc(docRef);
    console.log(`Successfully deleted document ${id} from collection ${collectionName}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Real-time listener for a Firestore collection.
 */
export function listenCollection(collectionName: string, onUpdate: (docs: any[]) => void) {
  const colRef = collection(db, collectionName);
  const q = query(colRef);
  
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));
    onUpdate(docs);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, collectionName);
  });
}

/**
 * Uploads local items that are not yet present in Firestore to ensure everything is synced.
 */
export async function syncLocalToCloud(collectionName: string, localItems: any[]) {
  if (!localItems || localItems.length === 0) return;
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const cloudIds = new Set(snapshot.docs.map(d => d.id));
    
    const batch = writeBatch(db);
    let count = 0;
    
    for (const item of localItems) {
      if (item && item.id && !cloudIds.has(item.id)) {
        const docRef = doc(db, collectionName, item.id);
        const sanitized = JSON.parse(JSON.stringify(item));
        batch.set(docRef, sanitized);
        count++;
      }
    }
    
    if (count > 0) {
      await batch.commit();
      console.log(`Uploaded ${count} offline items to collection ${collectionName}`);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collectionName);
  }
}
