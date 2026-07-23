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
 * Compresses heavy base64 image strings using browser canvas API to fit Firestore 1MB limits.
 */
async function compressBase64Image(dataUrl: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return dataUrl;
  // If the dataUrl is already small (e.g. < 40KB), don't compress it
  if (dataUrl.length < 40000) return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
          return;
        }
      } catch (e) {
        console.warn("Base64 image compression failed:", e);
      }
      resolve(dataUrl);
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}

/**
 * Recursively scans and compresses heavy base64 images inside any transaction payload.
 */
export async function compressPayload(obj: any): Promise<any> {
  if (!obj) return obj;

  if (typeof obj === 'string') {
    if (obj.startsWith('data:image/')) {
      return await compressBase64Image(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    const list = [];
    for (const item of obj) {
      list.push(await compressPayload(item));
    }
    return list;
  }

  if (typeof obj === 'object') {
    const copy = { ...obj };
    for (const key of Object.keys(copy)) {
      copy[key] = await compressPayload(copy[key]);
    }
    return copy;
  }

  return obj;
}

/**
 * Deleted Document Tracker to prevent deleted documents from resurrecting
 */
export function markDocumentDeleted(id: string) {
  if (!id) return;
  try {
    const raw = localStorage.getItem('gr_deleted_doc_ids');
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(id)) {
      list.push(id);
      if (list.length > 2000) list.shift();
      localStorage.setItem('gr_deleted_doc_ids', JSON.stringify(list));
    }
  } catch (e) {
    console.warn("Failed to mark document as deleted", e);
  }
}

export function unmarkDocumentDeleted(id: string) {
  if (!id) return;
  try {
    const raw = localStorage.getItem('gr_deleted_doc_ids');
    if (!raw) return;
    const list: string[] = JSON.parse(raw);
    const updated = list.filter(i => i !== id);
    localStorage.setItem('gr_deleted_doc_ids', JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to unmark deleted document", e);
  }
}

export function isDocumentDeleted(id: string): boolean {
  if (!id) return false;
  try {
    const raw = localStorage.getItem('gr_deleted_doc_ids');
    const list: string[] = raw ? JSON.parse(raw) : [];
    return list.includes(id);
  } catch {
    return false;
  }
}

/**
 * Syncs a single document to Firestore.
 */
export async function saveDocument(collectionName: string, id: string, data: any) {
  const path = `${collectionName}/${id}`;
  unmarkDocumentDeleted(id);
  try {
    const docRef = doc(db, collectionName, id);
    // Sanitize any undefined properties before uploading to Firestore
    const sanitized = JSON.parse(JSON.stringify(data));
    // Remove syncPending from the cloud-bound payload
    if (sanitized && typeof sanitized === 'object') {
      delete sanitized.syncPending;
    }
    // Compress heavy base64 image attachments to avoid exceeding Firestore limits
    const compressed = await compressPayload(sanitized);
    await setDoc(docRef, compressed, { merge: true });
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
  markDocumentDeleted(id);
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
      if (item && item.id && item.id !== 'undefined') {
        // Skip any item that was deleted
        if (isDocumentDeleted(item.id)) {
          continue;
        }
        if (!cloudIds.has(item.id)) {
          const docRef = doc(db, collectionName, item.id);
          const sanitized = JSON.parse(JSON.stringify(item));
          if (sanitized && typeof sanitized === 'object') {
            delete sanitized.syncPending;
          }
          const compressed = await compressPayload(sanitized);
          batch.set(docRef, compressed);
          count++;
        }
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
