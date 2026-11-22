import { initializeApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc as firestoreDeleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  writeBatch,
  getDocs,
  getDocFromServer
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

const DATABASE_ID = "ai-studio-goldroseexecutiv-24ffabdd-e90e-4dd9-8e2b-4b1051c7eea0";

export const FIREBASE_UPGRADE_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${DATABASE_ID}/data?openUpgradeDialog=true`;

const app = initializeApp(firebaseConfig);

// Enable persistent multi-tab IndexedDB local cache so page reloads & extra tabs
// serve unchanged Firestore documents locally instead of re-charging server reads.
let db: Firestore;
try {
  db = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    },
    DATABASE_ID
  );
} catch {
  db = getFirestore(app, DATABASE_ID);
}

const auth = getAuth(app);

export function isQuotaError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error || '')).toLowerCase();
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as any).code).toLowerCase() : '';
  return (
    code.includes('resource-exhausted') ||
    message.includes('quota limit exceeded') ||
    message.includes('resource_exhausted') ||
    message.includes('resource-exhausted') ||
    message.includes('quota')
  );
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (isQuotaError(error)) {
      console.warn("[Firestore Quota Notice] Daily cloud read quota reached. Running smoothly from local device cache.");
    } else if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

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
  const message = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: message,
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

  if (isQuotaError(error)) {
    console.warn(`[Firestore Quota Notice] Cloud daily quota reached for ${operationType} on ${path || 'database'}. Preserved in local device storage.`);
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Lightly compresses large base64 images for cloud sync while keeping them sharp and crisp.
 * Full original images remain preserved locally; images already under ~45KB are left untouched.
 */
async function compressBase64Image(dataUrl: string, maxWidth = 800, maxHeight = 800, quality = 0.68): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return dataUrl;
  // Skip already-compact images (~45KB binary / ~60,000 base64 chars) so sketches & small photos stay untouched
  if (dataUrl.length < 60000) return dataUrl;

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

        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          // Only adopt the compressed version if it actually saves space
          resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
          return;
        }
      } catch (e) {
        console.warn("Base64 image compression notice:", e);
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
 * Recursively scans and lightly compresses heavy base64 images inside any cloud-bound payload.
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
 * Syncs a single document to Firestore with quota resilience.
 */
export async function saveDocument(collectionName: string, id: string, data: any): Promise<{ success: boolean; offline?: boolean; quotaExceeded?: boolean }> {
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
    // Lightly compress heavy base64 image attachments to keep cloud reads & storage lean
    const compressed = await compressPayload(sanitized);
    await setDoc(docRef, compressed, { merge: true });
    console.log(`Successfully synced document ${id} to collection ${collectionName}`);
    return { success: true, offline: false };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    const isQuotaOrLimit =
      isQuotaError(error) ||
      message.includes('1 MiB') ||
      message.includes('unavailable') ||
      message.includes('network');

    if (isQuotaOrLimit) {
      console.warn(`[Firestore Quota Notice] Cloud quota/network limit reached for ${path}. Document safely preserved in local device storage.`);
      return { success: true, offline: true, quotaExceeded: true };
    }

    handleFirestoreError(error, OperationType.WRITE, path);
    return { success: false, offline: true };
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

    // Record deletion tombstone in cloud so all devices instantly sync deletion state
    if (collectionName !== 'deleted_doc_ids') {
      const tombstoneRef = doc(db, 'deleted_doc_ids', id);
      await setDoc(tombstoneRef, { id, collectionName, deletedAt: Date.now() }).catch(e => {
        console.warn("Failed to set tombstone doc:", e);
      });
    }

    console.log(`Successfully deleted document ${id} from collection ${collectionName}`);
  } catch (error) {
    if (isQuotaError(error)) {
      console.warn(`[Firestore Quota Notice] Daily cloud quota reached while deleting ${path}. Removed locally.`);
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface ListenCollectionOptions {
  limitCount?: number;
  orderByField?: string;
}

/**
 * Real-time listener for a Firestore collection with optional recent-record windowing
 * to avoid downloading unbounded historical records on every page load.
 */
export function listenCollection(
  collectionName: string,
  onUpdate: (docs: any[]) => void,
  onError?: (error: any) => void,
  options?: ListenCollectionOptions
) {
  const colRef = collection(db, collectionName);
  let q;
  if (options?.orderByField && options?.limitCount) {
    q = query(colRef, orderBy(options.orderByField, 'desc'), limit(options.limitCount));
  } else if (options?.limitCount) {
    q = query(colRef, limit(options.limitCount));
  } else if (options?.orderByField) {
    q = query(colRef, orderBy(options.orderByField, 'desc'));
  } else {
    q = query(colRef);
  }

  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(d => ({
      ...d.data(),
      id: d.id
    }));
    onUpdate(docs);
  }, (error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (isQuotaError(error)) {
      console.warn(`[Firestore Quota Notice] Free daily read quota reached for collection "${collectionName}". Preserving current local cache.`);
    } else {
      console.warn(`Firestore onSnapshot warning for "${collectionName}":`, message);
    }
    if (onError) {
      onError(error);
    }
  });
}

/**
 * On-demand one-time fetch of a full collection (used only when the user explicitly
 * clicks "Load Older Cloud Records" in LedgerView).
 */
export async function fetchCollectionOnce(collectionName: string): Promise<{ docs: any[]; quotaExceeded?: boolean }> {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const docs = snapshot.docs.map(d => ({
      ...d.data(),
      id: d.id
    }));
    return { docs };
  } catch (error) {
    if (isQuotaError(error)) {
      console.warn(`[Firestore Quota Notice] Cannot load older records for "${collectionName}" until daily cloud quota resets.`);
      return { docs: [], quotaExceeded: true };
    }
    handleFirestoreError(error, OperationType.LIST, collectionName);
    return { docs: [] };
  }
}

/**
 * Uploads ONLY local items explicitly marked `syncPending === true` directly to Firestore
 * with ZERO cloud reads (no full-collection `getDocs` scan).
 */
export async function syncLocalToCloud(
  collectionName: string,
  localItems: any[]
): Promise<{ uploadedCount: number; uploadedIds: string[]; quotaExceeded?: boolean }> {
  if (!localItems || localItems.length === 0) {
    return { uploadedCount: 0, uploadedIds: [] };
  }

  const pendingItems = localItems.filter(
    item => item && item.id && item.id !== 'undefined' && !isDocumentDeleted(item.id) && item.syncPending === true
  );

  // Zero pending local writes => 0 Firestore reads & 0 writes!
  if (pendingItems.length === 0) {
    return { uploadedCount: 0, uploadedIds: [] };
  }

  try {
    const uploadedIds: string[] = [];
    const CHUNK_SIZE = 400;

    for (let i = 0; i < pendingItems.length; i += CHUNK_SIZE) {
      const chunk = pendingItems.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      for (const item of chunk) {
        const docRef = doc(db, collectionName, item.id);
        const sanitized = JSON.parse(JSON.stringify(item));
        if (sanitized && typeof sanitized === 'object') {
          delete sanitized.syncPending;
        }
        const compressed = await compressPayload(sanitized);
        batch.set(docRef, compressed, { merge: true });
        uploadedIds.push(item.id);
      }

      await batch.commit();
    }

    if (uploadedIds.length > 0) {
      console.log(`Uploaded ${uploadedIds.length} pending item(s) to collection ${collectionName}`);
    }
    return { uploadedCount: uploadedIds.length, uploadedIds };
  } catch (error) {
    if (isQuotaError(error)) {
      console.warn(`[Firestore Quota Notice] Daily cloud quota reached while syncing "${collectionName}". Pending records remain safely stored locally.`);
      return { uploadedCount: 0, uploadedIds: [], quotaExceeded: true };
    }
    handleFirestoreError(error, OperationType.WRITE, collectionName);
    return { uploadedCount: 0, uploadedIds: [] };
  }
}
