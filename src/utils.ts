/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CategoryType, JewelryItem, QuoteSession, ScrapItem, AppSettings, ScrapTransaction, RingTierId, MaterialType } from './types';
import { DENSITIES, FANCY_SHAPES, ROUND_MELEE, TROY_ONCE_GRAMS, RING_TIERS, DEFAULT_RING_TIER_GRAMS } from './constants';

export function genId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function getTierGrams(tierId?: RingTierId | string, settings?: AppSettings): number {
  const id = (tierId || 'simple') as RingTierId;
  const configured = settings?.ringTierGrams?.[id];
  if (configured !== undefined && configured !== null && !isNaN(Number(configured)) && Number(configured) > 0) {
    return Number(configured);
  }
  return DEFAULT_RING_TIER_GRAMS[id] ?? 3.5;
}

/**
 * Density multiplier for Tiered Pricing relative to 14K Gold base (13.1 g/cm³).
 * - Gold > 14K (e.g. 18K, 22K, 24K): scaled up proportionally by alloy density
 * - Platinum: scaled up proportionally by platinum density (~53.4% denser than 14K)
 * - 14K Gold, 10K Gold (or any Gold <= 14K), and Silver: unadjusted (1.0x)
 */
export function getTierDensityMultiplier(material?: MaterialType | string, goldKarat?: number | string): number {
  const baseDensity = DENSITIES.gold[14] || 13.1;
  if (material === 'platinum') {
    return DENSITIES.platinum / baseDensity;
  }
  if (material === 'gold') {
    const karat = Number(goldKarat) || 14;
    if (karat > 14) {
      const karatDensity = DENSITIES.gold[karat] || baseDensity;
      return karatDensity / baseDensity;
    }
  }
  return 1;
}

export function getAdjustedTierGrams(
  tierId?: RingTierId | string,
  material?: MaterialType | string,
  goldKarat?: number | string,
  settings?: AppSettings
): number {
  const baseGrams = getTierGrams(tierId, settings);
  const multiplier = getTierDensityMultiplier(material, goldKarat);
  if (multiplier === 1) return baseGrams;
  return Number((baseGrams * multiplier).toFixed(2));
}

export function getTierLabel(tierId?: RingTierId | string): string {
  const tier = RING_TIERS.find(t => t.id === tierId);
  return tier ? tier.label : 'Simple';
}

export function calculateTierPrice(
  tierId: RingTierId | string,
  r: JewelryItem,
  settings: AppSettings,
  spotPrices: { gold: number; silver: number; platinum: number },
  overridePrices?: { gold?: number; silver?: number; platinum?: number }
): number {
  const id = (tierId || 'simple') as RingTierId;
  const fixedPrice = settings?.ringTierPrices?.[id];
  if (fixedPrice !== undefined && fixedPrice !== null && !isNaN(Number(fixedPrice)) && Number(fixedPrice) > 0) {
    return Number(fixedPrice);
  }

  const sPGold = Number(overridePrices?.gold ?? spotPrices.gold);
  const sPPlat = Number(overridePrices?.platinum ?? spotPrices.platinum);
  const sPSilv = Number(overridePrices?.silver ?? spotPrices.silver);

  const rGoldPrem = Number(settings.retailGoldPremium !== undefined ? settings.retailGoldPremium : 100);
  const rSilverPrem = Number(settings.retailSilverPremium !== undefined ? settings.retailSilverPremium : 20);
  const rPlatPrem = Number(settings.retailPlatinumPremium !== undefined ? settings.retailPlatinumPremium : 100);

  const tierGrams = getAdjustedTierGrams(id, r.material, r.goldKarat, settings);

  let rate = 0;
  if (r.material === 'gold') {
    const karat = Number(r.goldKarat) || 14;
    rate = Number(settings.goldPricesPerGram?.[karat] ?? (((sPGold + rGoldPrem) / 31.1034768) * (karat / 24)));
  } else if (r.material === 'platinum') {
    rate = Number(settings.platinumPricePerGram ?? (((sPPlat + rPlatPrem) / 31.1034768) * 0.95));
  } else if (r.material === 'silver') {
    rate = Number(settings.silverPricePerGram ?? (((sPSilv + rSilverPrem) / 31.1034768) * 0.925));
  }

  return tierGrams * rate;
}

export function getItemDisplayName(r: JewelryItem, index?: number, short: boolean = false): string {
  if (r.customTitle && r.customTitle.trim().length > 0) {
    return r.customTitle.trim();
  }
  const prefix = index !== undefined ? (short ? `#${index + 1} ` : `Piece ${index + 1}: `) : '';
  let defaultName = 'Piece';
  switch (r.category) {
    case 'customRing':
      defaultName = short ? 'Engagement' : 'Engagement Ring';
      break;
    case 'weddingBand':
      defaultName = short ? 'Band' : 'Wedding Band';
      break;
    case 'mensBand':
      defaultName = short ? "Men's" : "Men's Band";
      break;
    case 'pendant':
      defaultName = 'Pendant';
      break;
    case 'earrings':
      defaultName = short ? 'Earrings' : 'Earrings Pair';
      break;
    case 'tennisBracelet':
      defaultName = short ? 'Tennis' : 'Tennis Bracelet';
      break;
    case 'repair':
      defaultName = 'Repair Service';
      break;
  }
  return `${prefix}${defaultName}`;
}

export function getEmptyRing(category: CategoryType, customTitle?: string): JewelryItem {
  const base: JewelryItem = {
    id: genId(),
    category,
    customTitle: customTitle || '',
    pricingMethod: 'grams',
    selectedTier: 'simple',
    stoneSource: 'our',
    custCenterCt: '',
    custMeleeCount: '',
    material: 'gold',
    metalColor: 'Yellow',
    goldKarat: 14,
    fancy: [],
    melee: [],
    clientStones: [],
    centerStones: [],
    addons: [],
    showEngraving: false,
    engravingText: '',
    engravingFont: "'Times New Roman', Times, serif",
    designNotes: [],
    discount: '',
    discountType: '$',
    applyDesignFee: false,
    goldGrams: '',
    referenceSketches: [],
    referencePhotos: [],
    overridePrice: null
  };

  if (category === 'mensBand') {
    return {
      ...base,
      mbSize: '8.0',
      mbWidth: '5.0',
      mbThickness: '1.7',
      mbProfile: 'Flat',
      goldGrams: ''
    };
  }
  if (category === 'pendant') {
    return {
      ...base,
      pDimensions: '',
      centerStone: { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' }
    };
  }
  if (category === 'tennisBracelet') {
    return {
      ...base,
      tbLength: 7.0,
      tbShape: 'Round',
      tbSizeRound: '2.0',
      tbSizeIdx: 0,
      tbManualStones: '',
      tbManualGrams: '',
      tbManualCarats: ''
    };
  }
  if (category === 'earrings') {
    return {
      ...base,
      backingType: 'Push backs',
      centerStone: { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' },
      centerStone2: { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' }
    };
  }
  if (category === 'repair') {
    return {
      ...base,
      repairs: [],
      repairNotes: ''
    };
  }

  // customRing or weddingBand
  return {
    ...base,
    cRingSize: '',
    cBandWidth: '',
    cBandThickness: '',
    centerStone: { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' },
    centerStones: [],
    showCenterStone: category === 'customRing' ? false : true
  };
}

export function upgradeRingData(r: any): JewelryItem {
  const base = { ...r };
  if (!base.id) {
    base.id = genId();
  }
  if (!base.addons) {
    base.addons = (base.customAddon || base.customAddonDesc) 
      ? [{ fee: String(base.customAddon || ''), desc: String(base.customAddonDesc || '') }] 
      : [];
  }
  if (base.showEngraving === undefined) base.showEngraving = !!base.engravingText;
  if (base.engravingText === undefined) base.engravingText = '';
  if (!base.engravingFont) base.engravingFont = "'Times New Roman', Times, serif";
  if (base.discount === undefined) base.discount = '';
  if (!base.discountType) base.discountType = '$';
  if (!base.stoneSource) base.stoneSource = 'our';
  if (base.applyDesignFee === undefined) base.applyDesignFee = false;
  if (!base.clientStones) base.clientStones = [];
  
  if (!base.designNotes) {
    base.designNotes = [];
    if (base.ringNotes) {
      base.designNotes.push({ text: base.ringNotes });
      base.ringNotes = '';
    }
  }
  if (!base.fancy) base.fancy = [];
  if (!base.melee) base.melee = [];
  if (!base.centerStones) {
    base.centerStones = [];
    if (base.centerStone && base.centerStone.carats !== '') {
      base.centerStones.push({ ...base.centerStone });
    }
    if (base.category === 'earrings' && base.centerStone2 && base.centerStone2.carats !== '') {
      base.centerStones.push({ ...base.centerStone2 });
    }
  }
  base.centerStones.forEach((cs: any) => {
    if (!cs.type) cs.type = 'Diamond';
    if (!cs.origin) cs.origin = 'Lab';
    if (!cs.shape) cs.shape = 'Round';
    if (!cs.setting) cs.setting = 'Round Prongs';
  });
  if (!base.metalColor) base.metalColor = 'Yellow';
  if (!base.centerStone && ['customRing', 'weddingBand', 'pendant', 'earrings'].includes(base.category)) {
    base.centerStone = { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' };
  } else if (base.centerStone) {
    if (!base.centerStone.type) base.centerStone.type = 'Diamond';
    if (!base.centerStone.origin) base.centerStone.origin = 'Lab';
  }
  if (base.category === 'earrings') {
    if (!base.backingType) base.backingType = 'Push backs';
    if (!base.centerStone2) {
      base.centerStone2 = { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' };
    } else {
      if (!base.centerStone2.type) base.centerStone2.type = 'Diamond';
      if (!base.centerStone2.origin) base.centerStone2.origin = 'Lab';
    }
  }
  // Sanitize and upgrade sketches and photos safely
  const isImageValid = (str: any): boolean => {
    if (typeof str !== 'string') return false;
    const s = str.trim();
    if (s.length < 15) return false;
    if (s.startsWith('(') && s.includes('omitted')) return false;
    return s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://') || s.startsWith('blob:') || s.startsWith('<svg');
  };

  let sketches: string[] = [];
  if (Array.isArray(base.referenceSketches)) {
    sketches = base.referenceSketches.filter(isImageValid);
  }
  if (sketches.length === 0 && isImageValid(base.referenceSketch)) {
    sketches = [base.referenceSketch];
  }
  base.referenceSketches = sketches;
  base.referenceSketch = sketches[0] || null;

  let photos: string[] = [];
  if (Array.isArray(base.referencePhotos)) {
    photos = base.referencePhotos.filter(isImageValid);
  }
  if (photos.length === 0 && isImageValid(base.referencePhoto)) {
    photos = [base.referencePhoto];
  }
  base.referencePhotos = photos;
  base.referencePhoto = photos[0] || null;

  if (base.category === 'mensBand') {
    if (base.mbSize === undefined || base.mbSize === '') base.mbSize = '8.0';
    if (base.mbWidth === undefined || base.mbWidth === '') base.mbWidth = '5.0';
    if (base.mbThickness === undefined || base.mbThickness === '') base.mbThickness = '1.7';
    if (base.mbProfile === undefined || base.mbProfile === '') base.mbProfile = 'Flat';
  }
  if (base.showCenterStone === undefined) {
    base.showCenterStone = base.category === 'customRing' ? (!!base.centerStone?.carats) : true;
  }
  if (base.overridePrice !== undefined && base.overridePrice !== null && !isNaN(Number(base.overridePrice))) {
    base.overridePrice = Number(base.overridePrice);
  } else {
    base.overridePrice = null;
  }
  if (!base.pricingMethod) base.pricingMethod = 'grams';
  if (!base.selectedTier) base.selectedTier = 'simple';
  if (base.customTitle === undefined) base.customTitle = '';
  return base as JewelryItem;
}

export function getEmptyQuoteSession(): QuoteSession {
  return {
    id: genId(),
    cName: '',
    cPhone: '',
    cEmail: '',
    employeeId: '',
    jobNum: '',
    jobDesc: '',
    applyTax: false,
    notes: '',
    activeSubTab: '',
    rings: [],
    scrapCredit: 0,
    signatureImg: null,
    referenceSketch: null,
    referencePhoto: null,
    discount: '',
    discountType: '$'
  };
}

export function compressImage(base64Str: string, maxDim: number = 1200, quality: number = 0.80): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) {
      resolve(base64Str);
      return;
    }
    // If the image is already lightweight (< 50KB), don't re-compress
    if (base64Str.length < 50000) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / img.width, maxDim / img.height);
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetW, targetH);
          const out = canvas.toDataURL('image/jpeg', quality);
          resolve(out);
          return;
        }
      } catch (err) {
        console.warn("Image compression notice:", err);
      }
      resolve(base64Str);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
    img.src = base64Str;
  });
}

export function safeParseDate(dateStr: string): number {
  if (!dateStr) return 0;

  // Clean the string:
  // - Replace narrow non-breaking spaces (\u202f) and standard non-breaking spaces (\u00a0) with regular spaces.
  // - Standardize dots in a.m. / p.m. to am / pm.
  const cleaned = dateStr
    .replace(/[\u202f\u00a0]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Try standard Date.parse first after cleaning
  let parsed = Date.parse(cleaned);
  if (!isNaN(parsed)) return parsed;

  // Try another standard cleaning: Safari sometimes dislikes commas or the word "at"
  const cleanedForSafari = cleaned
    .replace(/,/, '')
    .replace(/\bat\b/i, '')
    .trim();
  parsed = Date.parse(cleanedForSafari);
  if (!isNaN(parsed)) return parsed;

  // Fallback: Custom manual parsing
  try {
    const months = [
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
    ];
    
    let monthIndex = -1;
    const lowerStr = cleaned.toLowerCase();
    for (let i = 0; i < months.length; i++) {
      if (lowerStr.includes(months[i])) {
        monthIndex = i;
        break;
      }
    }

    // Extract all numeric sequences
    const parts = cleaned.match(/\d+/g);
    if (!parts || parts.length < 2) return 0;

    let year = new Date().getFullYear();
    let month = 0; // 0-indexed
    let day = 1;
    let hour = 0;
    let minute = 0;
    let second = 0;

    // Determine the year. A 4-digit number is almost certainly the year.
    let yearIdx = parts.findIndex(p => p.length === 4);
    if (yearIdx !== -1) {
      year = parseInt(parts[yearIdx]);
    } else {
      // If no 4-digit number is found, see if parts[2] is a 2-digit year (e.g. DD/MM/YY)
      if (parts[2] && parts[2].length === 2) {
        yearIdx = 2;
        year = parseInt("20" + parts[2]);
      } else {
        yearIdx = -1;
      }
    }

    if (monthIndex !== -1) {
      // We found a text month!
      month = monthIndex;
      // Filter out the year from the numeric parts to locate the day
      const nonYearParts = parts.filter((_, idx) => idx !== yearIdx);
      if (nonYearParts.length > 0) {
        day = parseInt(nonYearParts[0]);
      }
      
      const timeParts = nonYearParts.slice(1);
      if (timeParts.length > 0) hour = parseInt(timeParts[0]) || 0;
      if (timeParts.length > 1) minute = parseInt(timeParts[1]) || 0;
      if (timeParts.length > 2) second = parseInt(timeParts[2]) || 0;
    } else {
      // No text month, numeric only
      if (yearIdx === 0) {
        // YYYY-MM-DD
        month = (parseInt(parts[1]) || 1) - 1;
        day = parseInt(parts[2]) || 1;
        
        if (parts.length > 3) hour = parseInt(parts[3]) || 0;
        if (parts.length > 4) minute = parseInt(parts[4]) || 0;
        if (parts.length > 5) second = parseInt(parts[5]) || 0;
      } else if (yearIdx === 2 || yearIdx === -1) {
        // DD/MM/YYYY or MM/DD/YYYY
        const p1 = parseInt(parts[0]) || 1;
        const p2 = parseInt(parts[1]) || 1;
        
        if (p1 > 12) {
          day = p1;
          month = p2 - 1;
        } else if (p2 > 12) {
          month = p1 - 1;
          day = p2;
        } else {
          // Default to US format (MM/DD/YYYY)
          month = p1 - 1;
          day = p2;
        }

        const baseIdx = yearIdx === 2 ? 3 : 2;
        if (parts.length > baseIdx) hour = parseInt(parts[baseIdx]) || 0;
        if (parts.length > baseIdx + 1) minute = parseInt(parts[baseIdx + 1]) || 0;
        if (parts.length > baseIdx + 2) second = parseInt(parts[baseIdx + 2]) || 0;
      }
    }

    // Check for am/pm
    if (/p\.?m\.?/i.test(cleaned) && hour < 12) {
      hour += 12;
    } else if (/a\.?m\.?/i.test(cleaned) && hour === 12) {
      hour = 0;
    }

    const d = new Date(year, month, day, hour, minute, second);
    const time = d.getTime();
    return isNaN(time) ? 0 : time;
  } catch (err) {
    console.error("Failed custom parsing of date string on iPad:", dateStr, err);
    return 0;
  }
}

const inMemoryCache = new Map<string, any>();

// --- ROCK-SOLID INDEXEDDB PERSISTENCE LAYER ---
// Protects all ledgers, historical quotes, active sessions, and multi-photo uploads
// from browser localStorage 5MB quota restrictions. IndexedDB supports gigabytes of storage.
const DB_NAME = 'gr_jewelry_app_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_storage';

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbGet<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function idbSet(key: string, value: any): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB Notice] Failed to persist ${key}:`, err);
  }
}

export async function idbGetAll(): Promise<Record<string, any>> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      const results: Record<string, any> = {};
      req.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          results[cursor.key as string] = cursor.value;
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => resolve({});
    });
  } catch {
    return {};
  }
}

/**
 * Hydrates app storage from IndexedDB on startup and backs up any existing
 * localStorage data into IndexedDB so no ledgers or photos are ever lost.
 */
export async function hydrateFromIndexedDb(): Promise<Record<string, any>> {
  const keysToSync = [
    'gr_app_settings',
    'gr_wholesale_profiles',
    'gr_quote_ledger',
    'gr_wholesale_ledger',
    'gr_scrap_ledger',
    'gr_cuban_estimates',
    'gr_jumpring_estimates',
    'gr_active_retail_session',
    'gr_active_wholesale_session'
  ];

  // 1. Back up whatever is currently in localStorage into IndexedDB
  for (const k of keysToSync) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!inMemoryCache.has(k)) {
          inMemoryCache.set(k, parsed);
        }
        const existingInIdb = await idbGet(k);
        if (!existingInIdb) {
          await idbSet(k, parsed);
        }
      }
    } catch {}
  }

  // 2. Read all items from IndexedDB and populate inMemoryCache
  const idbData = await idbGetAll();
  for (const [k, val] of Object.entries(idbData)) {
    inMemoryCache.set(k, val);
  }

  return idbData;
}

export function safeGetLocalStorage<T = any>(key: string): T | null {
  if (inMemoryCache.has(key)) {
    return inMemoryCache.get(key);
  }
  try {
    const item = localStorage.getItem(key);
    if (item !== null) {
      const parsed = JSON.parse(item);
      inMemoryCache.set(key, parsed);
      return parsed;
    }
  } catch {}
  try {
    const item = sessionStorage.getItem(key);
    if (item !== null) {
      const parsed = JSON.parse(item);
      inMemoryCache.set(key, parsed);
      return parsed;
    }
  } catch {}
  return null;
}

/**
 * Persists data with rock-solid resilience across IndexedDB, in-memory cache, and localStorage.
 * NEVER deletes or strips the user's saved ledgers or pictures under storage pressure.
 */
export function safeSetLocalStorage(key: string, data: any): void {
  // 1. Always update in-memory cache as immediate zero-latency access
  inMemoryCache.set(key, data);

  // 2. Asynchronously persist full, pristine data to IndexedDB (virtually unlimited quota)
  idbSet(key, data).catch(err => {
    console.warn(`[IndexedDB write notice] ${key}:`, err);
  });

  // 3. Backup to sessionStorage
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {}

  // 4. Mirror to localStorage for instant synchronous reboot
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return;
  } catch {
    // Browser 5MB localStorage quota limit reached.
    // Data is 100% preserved in IndexedDB and in-memory cache.
    // We intentionally NEVER delete ledgers or strip photos!
    console.info(`[Storage Notice] Browser localStorage 5MB quota reached. "${key}" is preserved in IndexedDB and memory cache.`);
  }
}

/**
 * Safely merges wholesale profiles by ID, updating existing profiles
 * while ensuring no profiles are ever lost during device sync.
 */
export function mergeWholesaleProfiles<T extends { id: string; name?: string; settings?: any }>(existing: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  (existing || []).forEach(p => {
    if (p && p.id) {
      map.set(p.id, p);
    }
  });
  (incoming || []).forEach(p => {
    if (p && p.id) {
      const current = map.get(p.id);
      if (current) {
        map.set(p.id, {
          ...current,
          ...p,
          settings: { ...(current.settings || {}), ...(p.settings || {}) }
        });
      } else {
        map.set(p.id, p);
      }
    }
  });
  return Array.from(map.values());
}

export interface TennisEstimateResult {
  estStones: number;
  estGrams: number;
  caratPerStone: number;
}

/**
 * Calculates 7-inch base metal gram weight for Tennis Bracelets/Chains
 * based on empirical jeweler real-world benchmarks:
 * - 1.8mm: 3.9g for 6.5"  -> 4.20g for 7.0"
 * - 2.0mm: 6.5g for 6.5"  -> 7.00g for 7.0"
 * - 2.2mm: 5.5g for 7.0"  -> 5.50g for 7.0"
 * - 3.0mm: 7.98g for 6.5" -> 8.5938g for 7.0"
 * - 4.0mm: 16.0g for 18.5cm (7.2835") -> 15.3774g for 7.0"
 * - 5.0mm: 20.0g for 7.0" -> 20.00g for 7.0"
 */
export function getTennisBaseGrams(smm: number): number {
  if (smm <= 0) return 0;
  
  const anchors = [
    { smm: 0.0, bg: 0.0 },
    { smm: 1.8, bg: 4.20 },
    { smm: 2.0, bg: 7.00 },
    { smm: 2.2, bg: 5.50 },
    { smm: 3.0, bg: 8.5938 },
    { smm: 4.0, bg: 15.3774 },
    { smm: 5.0, bg: 20.00 },
  ];

  if (smm <= anchors[0].smm) return 0;
  if (smm >= anchors[anchors.length - 1].smm) {
    const last = anchors[anchors.length - 1];
    const prev = anchors[anchors.length - 2];
    const slope = (last.bg - prev.bg) / (last.smm - prev.smm);
    return last.bg + (smm - last.smm) * slope;
  }

  for (let i = 0; i < anchors.length - 1; i++) {
    const a1 = anchors[i];
    const a2 = anchors[i + 1];
    if (smm >= a1.smm && smm <= a2.smm) {
      const t = (smm - a1.smm) / (a2.smm - a1.smm);
      return a1.bg + t * (a2.bg - a1.bg);
    }
  }

  return smm * 4;
}

export function getTennisEstimates(r: JewelryItem): TennisEstimateResult {
  let smm = 0;
  let cps = 0;
  if (r.tbShape === 'Round') {
    smm = Number(r.tbSizeRound) || 2.0;
    cps = ROUND_MELEE[String(r.tbSizeRound)] || 0.03;
  } else {
    const shape = r.tbShape || 'Princess';
    const aF = FANCY_SHAPES[shape] || FANCY_SHAPES['Princess'];
    const fd = aF[r.tbSizeIdx || 0] || aF[0];
    smm = parseFloat(fd.label) || 2.0;
    cps = fd.carat || 0.05;
  }
  
  if (!smm) return { estStones: 0, estGrams: 0, caratPerStone: 0 };
  
  const bs = Math.round(177.8 / (smm + 0.4));
  const bg = getTennisBaseGrams(smm);
  const lm = Number(r.tbLength || 7.0) / 7.0;
  
  let dm = 1.0;
  if (r.material === 'gold') {
    const densitiesGold = DENSITIES.gold as Record<number, number>;
    dm = (densitiesGold[r.goldKarat] || 13.1) / 13.1;
  } else if (r.material === 'platinum') {
    dm = DENSITIES.platinum / 13.1;
  } else if (r.material === 'silver') {
    dm = DENSITIES.silver / 13.1;
  }
  
  return {
    estStones: Math.round(bs * lm),
    estGrams: Number((bg * lm * dm).toFixed(2)),
    caratPerStone: cps
  };
}

export function calculateBandWeight(r: JewelryItem): string {
  if (r.category === 'mensBand') {
    const sz = Number(r.mbSize) || 8.0;
    const w = Number(r.mbWidth) || 5.0;
    const tk = Number(r.mbThickness) || 1.7;
    
    if (sz && w && tk) {
      const d = 11.63 + (0.8128 * sz);
      let v = (w * tk * Math.PI * (d + tk)) / 1000;
      
      // Apply profile volume multiplier
      const profile = r.mbProfile || 'Flat';
      let multiplier = 1.0;
      if (profile === 'Dome') {
        multiplier = 0.75;
      } else if (profile === 'HalfRound') {
        multiplier = 0.70;
      } else if (profile === 'Comfort') {
        multiplier = 0.85;
      } else if (profile === 'Beveled') {
        multiplier = 0.90;
      } else if (profile === 'KnifeEdge') {
        multiplier = 0.55;
      } else if (profile === 'Concave') {
        multiplier = 0.80;
      } else if (profile === 'StepEdge') {
        multiplier = 0.88;
      } else if (profile === 'Inlay') {
        multiplier = 0.82;
      }
      
      v = v * multiplier;

      let den = 13.1;
      if (r.material === 'gold') {
        const densitiesGold = DENSITIES.gold as Record<number, number>;
        den = densitiesGold[r.goldKarat] || 13.1;
      } else if (r.material === 'silver') {
        den = DENSITIES.silver;
      } else if (r.material === 'platinum') {
        den = DENSITIES.platinum;
      }
      return (v * den).toFixed(2);
    }
  } else if (r.category === 'customRing' || r.category === 'weddingBand') {
    const sz = Number(r.cRingSize) || 6.5;
    const w = Number(r.cBandWidth) || 2.0;
    const tk = Number(r.cBandThickness) || 1.5;
    
    if (sz && w && tk) {
      const d = 11.63 + (0.8128 * sz);
      let v = (w * tk * Math.PI * (d + tk)) / 1000;
      
      if (r.category === 'customRing') {
        v += 0.12; // head volume
      }
      
      const bandStyle = r.bandStyle || 'ChannelSet';
      let multiplier = 1.0;
      if (bandStyle === 'ChannelSet') multiplier = 1.00;
      else if (bandStyle === 'FrenchPave') multiplier = 1.02;
      else if (bandStyle === 'HoneycombPave') multiplier = 1.10;
      else if (bandStyle === 'ProngBasket') multiplier = 0.98;
      else if (bandStyle === 'SingleRowPave') multiplier = 1.04;
      else if (bandStyle === 'UCutPave') multiplier = 0.96;
      else if (bandStyle === 'ThreadGrain') multiplier = 1.05;
      
      v = v * multiplier;

      let den = 13.1;
      if (r.material === 'gold') {
        const densitiesGold = DENSITIES.gold as Record<number, number>;
        den = densitiesGold[r.goldKarat] || 13.1;
      } else if (r.material === 'silver') {
        den = DENSITIES.silver;
      } else if (r.material === 'platinum') {
        den = DENSITIES.platinum;
      }
      return (v * den).toFixed(2);
    }
  }
  return r.goldGrams;
}

export function hasRingData(r: JewelryItem): boolean {
  if (!r) return false;
  if (r.category === 'repair') {
    return true;
  }
  if (typeof r.overridePrice === 'number' && !isNaN(r.overridePrice) && r.overridePrice !== null) {
    return true;
  }
  const isImgValid = (str: any) => typeof str === 'string' && str.trim().length > 15 && !str.includes('omitted') && (str.startsWith('data:') || str.startsWith('http') || str.startsWith('blob:') || str.startsWith('<svg'));
  const hasSketches = (Array.isArray(r.referenceSketches) && r.referenceSketches.some(isImgValid)) || isImgValid(r.referenceSketch);
  const hasPhotos = (Array.isArray(r.referencePhotos) && r.referencePhotos.some(isImgValid)) || isImgValid(r.referencePhoto);

  return !!(
    Number(r.goldGrams) > 0 ||
    (r.centerStones && r.centerStones.some(cs => Number(cs.carats) > 0)) ||
    Number(r.centerStone?.carats) > 0 ||
    Number(r.centerStone2?.carats) > 0 ||
    (r.fancy && r.fancy.some(f => Number(f.qty) > 0)) ||
    (r.melee && r.melee.some(m => Number(m.qty) > 0)) ||
    (r.addons && r.addons.some(a => Number(a.fee) > 0)) ||
    (r.clientStones && r.clientStones.some(c => Number(c.qty) > 0)) ||
    Number(r.tbManualStones) > 0 ||
    hasSketches ||
    hasPhotos ||
    (r.designNotes && r.designNotes.length > 0) ||
    (r.showEngraving && !!r.engravingText)
  );
}

export function calculateWholesaleRingCost(r: JewelryItem, settings: AppSettings, spotPrices: { gold: number, silver: number, platinum: number }, overridePrices?: { gold?: number, silver?: number, platinum?: number }, wholesaleProfileId?: string): number {
  if (!r) return 0;
  if (r.category === 'repair') {
    const repairsTotal = (r.repairs || []).reduce((acc, rep) => acc + (Number(rep.customPrice !== undefined ? rep.customPrice : rep.price) || 0), 0);
    const addonsTotal = r.addons.reduce((acc, a) => acc + (Number(a.fee) || 0), 0);
    return repairsTotal + addonsTotal;
  }
  let c = 0;
  const w = (wholesaleProfileId && settings.wholesaleProfiles?.find(p => p.id === wholesaleProfileId)?.settings)
            || settings.wholesale;
  let g = Number(r.goldGrams) || 0;
  if (r.category === 'tennisBracelet' && !g) {
    g = getTennisEstimates(r).estGrams;
  }
  
  const sPGold = Number(overridePrices?.gold ?? spotPrices.gold);
  const sPPlat = Number(overridePrices?.platinum ?? spotPrices.platinum);
  const sPSilv = Number(overridePrices?.silver ?? spotPrices.silver);
  
  if (r.material === 'gold') {
    c += g * (((sPGold + Number(w.goldSpotPremium)) / TROY_ONCE_GRAMS) * (Number(r.goldKarat) / 24));
  } else if (r.material === 'platinum') {
    c += g * (((sPPlat + Number(w.goldSpotPremium)) / TROY_ONCE_GRAMS) * 0.95);
  } else if (r.material === 'silver') {
    c += g * (((sPSilv + Number(w.goldSpotPremium)) / TROY_ONCE_GRAMS) * 0.925);
  }
  
  // fab labor
  c += g * Number(w.laborPerGram);
  
  if (r.category === 'tennisBracelet') {
    const est = getTennisEstimates(r);
    const fs = Number(r.tbManualStones) || est.estStones;
    const fc = Number(r.tbManualCarats) || (fs * est.caratPerStone);
    
    const ppc = r.tbShape === 'Round' 
      ? (w.meleeRates?.[r.tbSizeRound || '2.0'] ?? settings.rawCostRates.melee ?? 350) 
      : (w.fancyRates?.[r.tbShape || 'Princess'] ?? settings.rawCostRates.fancy ?? 450);
      
    const settingFee = r.tbShape === 'Round'
      ? Number(w.settingMelee || 5)
      : Number(w.settingFancy || 8);
      
    if (r.stoneSource !== 'customer') {
      c += (fc * ppc) + (fs * settingFee);
    }
  } else {
    // setting & supplying melee stones
    let mQ = 0;
    let mC = 0;
    r.melee.forEach(m => {
      const q = Number(m.qty) || 0;
      const rate = Number(w.meleeRates?.[m.size] ?? 400);
      mQ += q;
      mC += q * Number(m.carat) * rate;
    });
    c += (mQ * Number(w.settingMelee)) + mC;
    
    // setting & supplying fancy stones
    let fQ = 0;
    let fC = 0;
    r.fancy.forEach(f => {
      const aF = FANCY_SHAPES[f.shape] || [];
      const fd = aF[f.sizeIdx] || { carat: 0, label: '' };
      const q = Number(f.qty) || 0;
      const key = fd.label ? `${f.shape}-${fd.label}` : '';
      const rate = Number((key && w.fancyRates?.[key]) ?? w.fancyRates?.[f.shape] ?? 500);
      fQ += q;
      fC += q * Number(fd.carat) * rate;
    });
    c += (fQ * Number(w.settingFancy)) + fC;

    // center stones setting & supply
    if (r.centerStones && r.centerStones.length > 0) {
      r.centerStones.forEach(cs => {
        if (!cs.carats) return;
        const cCt = parseFloat(cs.carats) || 0;
        if (cCt > 0) {
          c += Number(w.settingCenter);
          if (r.stoneSource !== 'customer') {
            const rate = settings.centerStoneRates?.[cs.type]?.[cs.origin] ?? 1000;
            c += cCt * rate;
          }
        }
      });
    } else {
      if (r.centerStone?.carats) {
        const cCt = parseFloat(r.centerStone.carats) || 0;
        if (cCt > 0) {
          c += Number(w.settingCenter);
          if (r.stoneSource !== 'customer') {
            const rate = settings.centerStoneRates?.[r.centerStone.type]?.[r.centerStone.origin] ?? 1000;
            c += cCt * rate;
          }
        }
      }
      if (r.centerStone2?.carats) {
        const cCt = parseFloat(r.centerStone2.carats) || 0;
        if (cCt > 0) {
          c += Number(w.settingCenter);
          if (r.stoneSource !== 'customer') {
            const rate = settings.centerStoneRates?.[r.centerStone2.type]?.[r.centerStone2.origin] ?? 1000;
            c += cCt * rate;
          }
        }
      }
    }
  }
  
  // Client Stones setting fee
  r.clientStones.forEach(cs => {
    const q = Number(cs.qty) || 0;
    if (cs.type === 'Center') {
      c += q * Number(w.settingCenter);
    } else if (cs.type === 'Fancy') {
      c += q * Number(w.settingFancy);
    } else {
      c += q * Number(w.settingMelee);
    }
  });
  
  if (r.applyDesignFee) {
    c += Number(w.designFee);
  }
  
  r.addons.forEach(a => {
    c += Number(a.fee) || 0;
  });
  
  return c;
}

export function calculateRingCost(r: JewelryItem, settings: AppSettings, spotPrices: { gold: number, silver: number, platinum: number }, mode: 'retail' | 'wholesale' = 'retail', overridePrices?: { gold?: number, silver?: number, platinum?: number }, wholesaleProfileId?: string): number {
  if (!r) return 0;
  if (r.category === 'repair') {
    const repairsTotal = (r.repairs || []).reduce((acc, rep) => acc + (Number(rep.customPrice !== undefined ? rep.customPrice : rep.price) || 0), 0);
    const addonsTotal = r.addons.reduce((acc, a) => acc + (Number(a.fee) || 0), 0);
    return repairsTotal + addonsTotal;
  }
  if (mode === 'wholesale') {
    return calculateWholesaleRingCost(r, settings, spotPrices, overridePrices, wholesaleProfileId);
  }
  
  let cM = 0;
  let g = Number(r.goldGrams) || 0;
  if (r.category === 'tennisBracelet' && !g) {
    g = getTennisEstimates(r).estGrams;
  }
  const aS = r.addons.reduce((acc, a) => acc + (Number(a.fee) || 0), 0);
  
  const sPGold = Number(overridePrices?.gold ?? spotPrices.gold);
  const sPPlat = Number(overridePrices?.platinum ?? spotPrices.platinum);
  const sPSilv = Number(overridePrices?.silver ?? spotPrices.silver);

  const rGoldPrem = Number(settings.retailGoldPremium !== undefined ? settings.retailGoldPremium : 100);
  const rSilverPrem = Number(settings.retailSilverPremium !== undefined ? settings.retailSilverPremium : 20);
  const rPlatPrem = Number(settings.retailPlatinumPremium !== undefined ? settings.retailPlatinumPremium : 100);

  if (['mensBand', 'customRing', 'weddingBand', 'pendant'].includes(r.category)) {
    if (['customRing', 'weddingBand'].includes(r.category) && r.pricingMethod === 'tiered') {
      cM = calculateTierPrice(r.selectedTier || 'simple', r, settings, spotPrices, overridePrices);
    } else if (r.material === 'gold') {
      const karat = Number(r.goldKarat) || 14;
      const rate = r.category === 'mensBand'
        ? Number(settings.mensBandGoldPricesPerGram?.[karat] ?? settings.goldPricesPerGram?.[karat] ?? (((sPGold + rGoldPrem) / 31.1034768) * (karat / 24)))
        : Number(settings.goldPricesPerGram?.[karat] ?? (((sPGold + rGoldPrem) / 31.1034768) * (karat / 24)));
      cM = g * rate;
    } else if (r.material === 'platinum') {
      const rate = r.category === 'mensBand'
        ? Number(settings.mensBandPlatinumPricePerGram ?? settings.platinumPricePerGram ?? (((sPPlat + rPlatPrem) / 31.1034768) * 0.95))
        : Number(settings.platinumPricePerGram ?? (((sPPlat + rPlatPrem) / 31.1034768) * 0.95));
      cM = g * rate;
    } else if (r.material === 'silver') {
      const rate = r.category === 'mensBand'
        ? Number(settings.mensBandSilverPricePerGram ?? settings.silverPricePerGram ?? (((sPSilv + rSilverPrem) / 31.1034768) * 0.925))
        : Number(settings.silverPricePerGram ?? (((sPSilv + rSilverPrem) / 31.1034768) * 0.925));
      cM = g * rate;
    }
  } else {
    if (r.material === 'gold') {
      const karat = Number(r.goldKarat) || 14;
      cM = g * (((sPGold + rGoldPrem) / 31.1034768) * (karat / 24));
    } else if (r.material === 'platinum') {
      const rate = Number(settings.platinumPricePerGram ?? (((sPPlat + rPlatPrem) / 31.1034768) * 0.95));
      cM = g * rate;
    } else if (r.material === 'silver') {
      const rate = Number(settings.silverPricePerGram ?? (((sPSilv + rSilverPrem) / 31.1034768) * 0.925));
      cM = g * rate;
    }
  }

  if (r.category === 'tennisBracelet') {
    let smm = 0;
    if (r.tbShape === 'Round') {
      smm = Number(r.tbSizeRound) || 2.0;
    } else {
      const shape = r.tbShape || 'Princess';
      const aF = FANCY_SHAPES[shape] || FANCY_SHAPES['Princess'];
      const fd = aF[r.tbSizeIdx || 0] || aF[0];
      smm = parseFloat(fd.label) || 2.0;
    }

    const multipliers = settings.tennisMultipliers || [
      { minWidth: 1.0, maxWidth: 1.9, multiplier: 1.6 },
      { minWidth: 2.0, maxWidth: 4.0, multiplier: 1.4 }
    ];

    const sortedRanges = [...multipliers].sort((a, b) => a.minWidth - b.minWidth);
    const match = sortedRanges.find(m => smm >= m.minWidth && smm <= m.maxWidth);
    let tennisMult = 1.0;
    if (match) {
      tennisMult = match.multiplier;
    } else if (sortedRanges.length > 0) {
      if (smm < sortedRanges[0].minWidth) {
        tennisMult = sortedRanges[0].multiplier;
      } else if (smm > sortedRanges[sortedRanges.length - 1].maxWidth) {
        tennisMult = sortedRanges[sortedRanges.length - 1].multiplier;
      }
    }
    cM = cM * tennisMult;
  }
  
  let cS = 0;
  if (r.category === 'tennisBracelet') {
    const est = getTennisEstimates(r);
    const fs = Number(r.tbManualStones) || est.estStones;
    const fc = Number(r.tbManualCarats) || (fs * est.caratPerStone);
    const ppc = settings.tennisDiamondPricePerCt !== undefined
      ? Number(settings.tennisDiamondPricePerCt)
      : (r.tbShape === 'Round' 
          ? Number(settings.tennisMeleePricePerCt) 
          : Number(settings.tennisFancyPricePerCt));
      
    if (r.stoneSource !== 'customer') {
      cS = (fc * ppc) + (fs * Number(settings.tennisLaborRetail || 0));
    }
  } else {
    const mR = r.category === 'earrings' 
      ? Number(settings.earringMeleePricePerCt) 
      : Number(settings.meleePricePerCt);
    const fR = r.category === 'earrings' 
      ? Number(settings.earringFancyPricePerCt) 
      : Number(settings.fancyPricePerCt);
      
    let mc = 0;
    r.melee.forEach(m => {
      mc += (Number(m.qty) || 0) * Number(m.carat);
    });
    const cMc = mc * mR;
    
    let fc = 0;
    r.fancy.forEach(f => {
      const aF = FANCY_SHAPES[f.shape] || [];
      const fd = aF[f.sizeIdx] || { carat: 0 };
      fc += (Number(f.qty) || 0) * Number(fd.carat) * fR;
    });
    
    let cC = 0;
    if (['customRing', 'pendant', 'earrings'].includes(r.category)) {
      if (r.centerStones && r.centerStones.length > 0) {
        r.centerStones.forEach(cs => {
          if (cs.carats) {
            const cts = Number(cs.carats);
            if (cs.type && cs.origin) {
              cC += cts * Number(settings.centerStoneRates[cs.type]?.[cs.origin] ?? 1000);
            }
          }
        });
      } else {
        if (r.centerStone?.carats) {
          const cts = Number(r.centerStone.carats);
          if (r.centerStone.type && r.centerStone.origin) {
            cC += cts * Number(settings.centerStoneRates[r.centerStone.type]?.[r.centerStone.origin] ?? 1000);
          }
        }
        if (r.category === 'earrings' && r.centerStone2?.carats) {
          const cts = Number(r.centerStone2.carats);
          if (r.centerStone2.type && r.centerStone2.origin) {
            cC += cts * Number(settings.centerStoneRates[r.centerStone2.type]?.[r.centerStone2.origin] ?? 1000);
          }
        }
      }
    }
    
    cS = cMc + (fc) + cC;
  }
  
  let cCF = 0;
  r.clientStones.forEach(c => {
    if (c.type === 'Center') {
      cCF += (Number(c.carats) || 0) * Number(settings.settingFeeCenterPerCt);
    } else if (c.type === 'Fancy') {
      cCF += (Number(c.qty) || 0) * Number(settings.settingFeeFancyPerSt !== undefined ? settings.settingFeeFancyPerSt : 25);
    } else {
      cCF += (Number(c.qty) || 0) * Number(settings.settingFeeMeleePerSt);
    }
  });
  
  return cM + cS + cCF + aS;
}

export function calculateRawCost(r: JewelryItem, settings: AppSettings, spotPrices: { gold: number, silver: number, platinum: number }): number {
  if (!r) return 0;
  if (r.category === 'repair') {
    return 0;
  }
  const s = Number(spotPrices[r.material]) / TROY_ONCE_GRAMS;
  const pf = r.material === 'gold' 
    ? (Number(r.goldKarat) / 24) 
    : (r.material === 'silver' ? 0.925 : 0.950);
  let g = Number(r.goldGrams) || 0;
  if (['customRing', 'weddingBand'].includes(r.category) && r.pricingMethod === 'tiered') {
    g = getAdjustedTierGrams(r.selectedTier, r.material, r.goldKarat, settings);
  } else if (r.category === 'tennisBracelet' && !g) {
    g = getTennisEstimates(r).estGrams;
  }
  const rM = g * s * pf;
  
  if (r.stoneSource === 'customer') return rM;
  
  if (r.category === 'tennisBracelet') {
    const est = getTennisEstimates(r);
    const fs = Number(r.tbManualStones) || est.estStones;
    const fc = Number(r.tbManualCarats) || (fs * est.caratPerStone);
    const ppcr = r.tbShape === 'Round' 
      ? Number(settings.tennisMeleePricePerCtRaw || settings.rawCostRates.melee) 
      : Number(settings.tennisFancyPricePerCtRaw || settings.rawCostRates.fancy);
    return (fs > 0 && fc > 0) ? (fc * ppcr) + rM : rM;
  }
  
  let rMc = 0;
  r.melee.forEach(m => {
    const q = Number(m.qty) || 0;
    const rate = Number(settings.rawMeleeRates?.[m.size] ?? settings.rawCostRates.melee);
    rMc += q * Number(m.carat) * rate;
  });
  
  let fc = 0;
  r.fancy.forEach(f => {
    const aF = FANCY_SHAPES[f.shape] || [];
    const fd = aF[f.sizeIdx] || { carat: 0, label: '' };
    const q = Number(f.qty) || 0;
    const key = fd.label ? `${f.shape}-${fd.label}` : '';
    const rate = Number((key && settings.rawFancyRates?.[key]) ?? settings.rawFancyRates?.[f.shape] ?? settings.rawCostRates.fancy);
    fc += q * Number(fd.carat) * rate;
  });
  
  let rC = 0;
  if (['customRing', 'pendant', 'earrings'].includes(r.category)) {
    if (r.centerStones && r.centerStones.length > 0) {
      r.centerStones.forEach(cs => {
        if (cs.carats) {
          const cts = Number(cs.carats);
          if (cs.type && cs.origin) {
            rC += cts * Number(settings.centerStoneRawRates[cs.type]?.[cs.origin] ?? 500);
          } else {
            rC += cts * Number(settings.rawCostRates.center);
          }
        }
      });
    } else {
      if (r.centerStone?.carats) {
        const cts = Number(r.centerStone.carats);
        if (r.centerStone.type && r.centerStone.origin) {
          rC += cts * Number(settings.centerStoneRawRates[r.centerStone.type]?.[r.centerStone.origin] ?? 500);
        } else {
          rC += cts * Number(settings.rawCostRates.center);
        }
      }
      if (r.category === 'earrings' && r.centerStone2?.carats) {
        const cts = Number(r.centerStone2.carats);
        if (r.centerStone2.type && r.centerStone2.origin) {
          rC += cts * Number(settings.centerStoneRawRates[r.centerStone2.type]?.[r.centerStone2.origin] ?? 500);
        } else {
          rC += cts * Number(settings.rawCostRates.center);
        }
      }
    }
  }
  
  return rMc + fc + rC + rM;
}

export function calculateScrapItemValue(item: ScrapItem, spotPrices: { gold: number, silver: number, platinum: number }): number {
  const w = Number(item.weight) || 0;
  const r = Number(item.rate) || 0;
  if (!w) return 0;
  const s = (spotPrices[item.material] || 0) / TROY_ONCE_GRAMS;
  const purityNum = Number(item.purity) || 0;
  const pf = purityNum / 100;
  return w * pf * s * (r / 100);
}

export function calculateScrapTotal(scrapItems: ScrapItem[], spotPrices: { gold: number, silver: number, platinum: number }, stoneRemovalQty: string): number {
  const payout = scrapItems.reduce((total, item) => total + calculateScrapItemValue(item, spotPrices), 0);
  return Math.max(0, payout - (Number(stoneRemovalQty || 0) * 5));
}

export function getDemoQuoteSession(): QuoteSession {
  const engId = genId();
  const wedId = genId();
  const menId = genId();

  // 1. Engagement Ring
  const engagementRing: JewelryItem = {
    id: engId,
    category: 'customRing',
    stoneSource: 'our',
    custCenterCt: '1.50',
    custMeleeCount: '16',
    material: 'gold',
    metalColor: 'White',
    goldKarat: 18,
    goldGrams: '4.8',
    cRingSize: '6.5',
    cBandWidth: '2.2',
    cBandThickness: '1.8',
    bandStyle: 'Pavé Accent Shank (6 Claw Solitaire)',
    fancy: [],
    melee: [{ qty: '16', carat: '0.015', size: '1.5' }],
    clientStones: [],
    addons: [{ fee: '250', desc: 'Custom 3D CAD modeling and wax printing fee' }],
    showEngraving: true,
    engravingText: 'Forever Yours',
    engravingFont: "'Times New Roman', Times, serif",
    designNotes: [
      { text: 'Center: 1.50ct Round Lab Diamond (Excellent cut, VVS2, E colour).' },
      { text: 'Setting: Extra secure 6-claw wire basket prongs, low-profile.' },
      { text: 'Ensure perfect contour match with companion wedding band.' }
    ],
    discount: '',
    discountType: '$',
    applyDesignFee: true,
    referenceSketches: [
      `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%25" height="100%25" style="background:%230b0f19"><circle cx="100" cy="115" r="45" fill="none" stroke="%2338bdf8" stroke-width="2" stroke-dasharray="3,3" opacity="0.6"/><circle cx="100" cy="115" r="40" fill="none" stroke="%23e2e8f0" stroke-width="4"/><path d="M100 75 L85 45 L100 25 L115 45 Z" fill="none" stroke="%23fbbf24" stroke-width="2"/><line x1="85" y1="45" x2="115" y2="45" stroke="%23fbbf24" stroke-width="1"/><line x1="100" y1="75" x2="100" y2="25" stroke="%2338bdf8" stroke-width="1" stroke-dasharray="2,2"/><circle cx="100" cy="115" r="4" fill="none" stroke="%23f43f5e" stroke-width="1.5"/><text x="100" y="180" fill="%2364748b" font-size="10" font-family="monospace" text-anchor="middle">CAD: ORTHO_FRONT_1</text></svg>`
    ],
    referencePhotos: [
      `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%25" height="100%25" style="background:%230f172a"><circle cx="100" cy="115" r="42" fill="none" stroke="%23475569" stroke-width="6"/><circle cx="100" cy="115" r="39" fill="none" stroke="%23f8fafc" stroke-width="1.5"/><path d="M100 73 L90 52 L100 35 L110 52 Z" fill="%23f8fafc" stroke="%2338bdf8" stroke-width="1"/><circle cx="100" cy="115" r="5" fill="%23f43f5e" opacity="0.5"/><text x="100" y="180" fill="%23e2e8f0" font-size="9" font-family="sans-serif" text-anchor="middle">3D RENDERING: MODEL_V1</text></svg>`
    ],
    centerStone: { carats: '1.50', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' }
  };

  // 2. Wedding Band
  const weddingBand: JewelryItem = {
    id: wedId,
    category: 'weddingBand',
    stoneSource: 'our',
    custCenterCt: '',
    custMeleeCount: '20',
    material: 'gold',
    metalColor: 'White',
    goldKarat: 18,
    goldGrams: '3.5',
    cRingSize: '6.5',
    cBandWidth: '2.0',
    cBandThickness: '1.6',
    bandStyle: 'Contoured Curved Eternity (Half-Loop)',
    fancy: [],
    melee: [{ qty: '20', carat: '0.01', size: '1.3' }],
    clientStones: [],
    addons: [],
    showEngraving: true,
    engravingText: '04.07.2026',
    engravingFont: "'Times New Roman', Times, serif",
    designNotes: [
      { text: 'Contoured slight bend of 1.2mm depth in center to nest neatly under engagement ring basket.' },
      { text: 'U-cut micro-pave setting on the accent stones.' },
      { text: 'Ensure heights match perfectly with Engagement shank.' }
    ],
    discount: '',
    discountType: '$',
    applyDesignFee: false,
    referenceSketches: [
      `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%25" height="100%25" style="background:%230b0f19"><path d="M50 115 C50 115 100 135 150 115" fill="none" stroke="%23e2e8f0" stroke-width="4"/><path d="M48 114 C48 114 100 137 152 114" fill="none" stroke="%2338bdf8" stroke-width="1.5" stroke-dasharray="2,2"/><circle cx="100" cy="126" r="3" fill="%23fbbf24"/><circle cx="85" cy="124" r="2.5" fill="%23fbbf24"/><circle cx="115" cy="124" r="2.5" fill="%23fbbf24"/><circle cx="70" cy="121" r="2.5" fill="%23fbbf24"/><circle cx="130" cy="121" r="2.5" fill="%23fbbf24"/><text x="100" y="180" fill="%2364748b" font-size="10" font-family="monospace" text-anchor="middle">CAD: MATCHING_BAND</text></svg>`
    ],
    referencePhotos: [],
    centerStone: { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' }
  };

  // 3. Men's Beveled Band
  const mensBand: JewelryItem = {
    id: menId,
    category: 'mensBand',
    stoneSource: 'our',
    custCenterCt: '',
    custMeleeCount: '',
    material: 'gold',
    metalColor: 'Yellow',
    goldKarat: 14,
    goldGrams: '7.2',
    mbSize: '10.0',
    mbWidth: '6.0',
    mbThickness: '2.0',
    mbProfile: 'Beveled',
    bandStyle: 'Step Edge Beveled - Comfort Fit Dual Finish',
    fancy: [],
    melee: [],
    clientStones: [],
    addons: [],
    showEngraving: true,
    engravingText: 'A.R. & J.L. Forever',
    engravingFont: "'Times New Roman', Times, serif",
    designNotes: [
      { text: 'Dual finish style: high-polished beveled edges with heavy sandblast matte center portion.' },
      { text: 'Shank interior must be Comfort-Fit with generous rounded corners.' },
      { text: 'Inner engraving centered on back of shank.' }
    ],
    discount: '',
    discountType: '$',
    applyDesignFee: false,
    referenceSketches: [
      `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%25" height="100%25" style="background:%230b0f19"><rect x="50" y="80" width="100" height="40" rx="3" fill="none" stroke="%2338bdf8" stroke-width="1.5" stroke-dasharray="2,2"/><path d="M50 84 L150 84 M50 116 L150 116" stroke="%23fbbf24" stroke-width="1.5"/><rect x="55" y="88" width="90" height="24" fill="%231e293b" opacity="0.8"/><text x="100" y="103" fill="%2394a3b8" font-size="8" font-family="sans-serif" text-anchor="middle" letter-spacing="1">MATTE CENTER</text><text x="100" y="180" fill="%2364748b" font-size="10" font-family="monospace" text-anchor="middle">CAD: MENS_BEVEL_6MM</text></svg>`
    ],
    referencePhotos: [],
    centerStone: { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' }
  };

  return {
    id: 'demo-set-wedding-quote',
    cName: 'Alexander Ross',
    cPhone: '604-555-0145',
    cEmail: 'alexander.ross@gmail.com',
    jobNum: 'GR-2026-904',
    jobDesc: 'Custom 3-Piece Wedding Set: 1.5ct Solitaire Engagement Ring, Matching Contoured Wave Wedding Band & Men\'s Comfort Bevel Step Band',
    applyTax: true,
    notes: 'Premium custom order. Specially prepared for CAD production blueprint evaluation.',
    activeSubTab: engId,
    rings: [engagementRing, weddingBand, mensBand],
    scrapCredit: 0,
    signatureImg: null,
    referenceSketch: null,
    referencePhoto: null,
    discount: '',
    discountType: '$'
  };
}

/**
 * Formats a phone number into the standard North American format: 000-000-0000
 */
export function formatPhoneNumber(value: string | undefined | null): string {
  if (!value) return '';
  let digits = String(value).replace(/\D/g, '');
  if (!digits) return '';

  // If 11 digits starting with 1 (country code), strip leading 1 for standard 10-digit format
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }

  const limited = digits.slice(0, 10);
  if (limited.length <= 3) {
    return limited;
  }
  if (limited.length <= 6) {
    return `${limited.slice(0, 3)}-${limited.slice(3)}`;
  }
  return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6, 10)}`;
}

export interface SessionPieceCost {
  cost: number;
  discVal: number;
  discDeduction: number;
  calculatedFinalCost: number;
  effectiveCost: number;
  effectiveFinalCost: number;
  isOverridden: boolean;
  overridePrice?: number | null;
}

export interface CompiledSessionCost {
  grossTotal: number;
  totalDiscount: number;
  postDiscountTotal: number;
  scrapCredit: number;
  subtotal: number;
  tax: number;
  calculatedGrandTotal: number;
  isOverridden: boolean;
  grandTotal: number;
  targetPiecesTotal: number;
  pieceCosts: Record<string, SessionPieceCost>;
  sessionDiscountVal: number;
  sessionDiscountDeduction: number;
}

/**
 * Calculates complete session totals and individual piece costs,
 * calculating each piece separately and supporting per-piece price overrides.
 */
export function compileSessionCost(
  session: QuoteSession,
  settings: AppSettings,
  spotPrices: { gold: number; silver: number; platinum: number },
  isWholesale: boolean = false
): CompiledSessionCost {
  const rings = session.rings || [];
  
  let grossTotal = 0;
  let totalDiscount = 0;
  let postDiscountTotal = 0;
  let calculatedGrossTotal = 0;
  let calculatedTotalDiscount = 0;
  let calculatedPostDiscountTotal = 0;
  const pieceCosts: Record<string, SessionPieceCost> = {};

  rings.forEach((r, idx) => {
    const cost = calculateRingCost(
      r,
      settings,
      spotPrices,
      isWholesale ? 'wholesale' : 'retail',
      session.overridePrices,
      isWholesale ? session.wholesaleProfileId : undefined
    );
    const discVal = parseFloat(r.discount) || 0;
    const calculatedDiscDeduction = r.discountType === '%' ? cost * (discVal / 100) : discVal;
    const calculatedFinalCost = Math.max(0, cost - calculatedDiscDeduction);

    calculatedGrossTotal += cost;
    calculatedTotalDiscount += calculatedDiscDeduction;
    calculatedPostDiscountTotal += calculatedFinalCost;

    // Per-piece price override replaces the base piece price; any piece discount applies to the overridden price
    const hasPieceOverride = typeof r.overridePrice === 'number' && !isNaN(r.overridePrice) && r.overridePrice !== null;
    const effectiveCost = hasPieceOverride ? Math.max(0, Number(r.overridePrice)) : cost;
    const discDeduction = r.discountType === '%' ? effectiveCost * (discVal / 100) : discVal;
    const effectiveFinalCost = Math.max(0, effectiveCost - discDeduction);

    grossTotal += effectiveCost;
    totalDiscount += discDeduction;
    postDiscountTotal += effectiveFinalCost;

    const pc: SessionPieceCost = {
      cost,
      discVal,
      discDeduction,
      calculatedFinalCost,
      effectiveCost,
      effectiveFinalCost,
      isOverridden: hasPieceOverride,
      overridePrice: hasPieceOverride ? Number(r.overridePrice) : null
    };

    pieceCosts[r.id] = pc;
    pieceCosts[String(idx)] = pc;
  });

  const scrapCredit = Number(session.scrapCredit) || 0;

  // Session-wide discount (Order/Quote discount on total estimate)
  const sessionDiscVal = parseFloat(session.discount || '0') || 0;
  const sessionDiscDeduction = session.discountType === '%'
    ? (postDiscountTotal * (sessionDiscVal / 100))
    : sessionDiscVal;
  const calculatedSessionDiscDeduction = session.discountType === '%'
    ? (calculatedPostDiscountTotal * (sessionDiscVal / 100))
    : sessionDiscVal;

  const effectivePostDiscountTotal = Math.max(0, postDiscountTotal - sessionDiscDeduction);
  const effectiveCalculatedPostDiscountTotal = Math.max(0, calculatedPostDiscountTotal - calculatedSessionDiscDeduction);

  totalDiscount += sessionDiscDeduction;
  calculatedTotalDiscount += calculatedSessionDiscDeduction;

  const netBeforeTax = effectivePostDiscountTotal - scrapCredit;
  const taxableSubtotal = Math.max(0, netBeforeTax);
  const calculatedTax = session.applyTax ? taxableSubtotal * 0.12 : 0;
  const calculatedGrandTotal = (effectiveCalculatedPostDiscountTotal - scrapCredit) + (session.applyTax ? Math.max(0, effectiveCalculatedPostDiscountTotal - scrapCredit) * 0.12 : 0);

  const hasAnyPieceOverride = rings.some(r => typeof r.overridePrice === 'number' && !isNaN(r.overridePrice) && r.overridePrice !== null);
  // In retail custom quote mode, overrides are strictly on a per-piece basis.
  // Session-wide customGrandTotal is only used for wholesale single repair tickets.
  const hasSessionOverride = isWholesale && typeof session.customGrandTotal === 'number' && !isNaN(session.customGrandTotal) && session.customGrandTotal !== null;
  const isOverridden = hasAnyPieceOverride || hasSessionOverride;

  let subtotal = netBeforeTax;
  let tax = calculatedTax;
  let grandTotal = netBeforeTax + calculatedTax;

  // If a session-level grand total override exists (only for wholesale repair ticket mode)
  if (hasSessionOverride) {
    const customVal = session.customGrandTotal as number;
    if (session.customGrandTotalIsInclusive) {
      if (session.applyTax) {
        grandTotal = customVal;
        subtotal = customVal / 1.12;
        tax = customVal - subtotal;
      } else {
        grandTotal = customVal;
        subtotal = customVal;
        tax = 0;
      }
    } else {
      subtotal = customVal;
      tax = session.applyTax ? Math.max(0, customVal) * 0.12 : 0;
      grandTotal = subtotal + tax;
    }
  }

  const targetPiecesTotal = Math.max(0, subtotal + scrapCredit);

  return {
    grossTotal,
    totalDiscount,
    postDiscountTotal: effectivePostDiscountTotal,
    scrapCredit,
    subtotal,
    tax,
    calculatedGrandTotal,
    isOverridden,
    grandTotal,
    targetPiecesTotal,
    pieceCosts,
    sessionDiscountVal: sessionDiscVal,
    sessionDiscountDeduction: sessionDiscDeduction
  };
}

