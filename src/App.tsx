/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Coins, FileCheck, Landmark, Library, Settings, RefreshCw, 
  HelpCircle, Sparkles, Scale, Info, AlertCircle, ExternalLink, Printer, X, CircleDot 
} from 'lucide-react';

// Types & Constants
import { 
  QuoteSession, ScrapTransaction, QuoteTransaction, AppSettings, 
  ScrapItem, JewelryItem, WholesaleProfile 
} from './types';
import { DEFAULT_SETTINGS, TROY_ONCE_GRAMS, FANCY_SHAPES, ROUND_MELEE } from './constants';
import { getEmptyQuoteSession, upgradeRingData, calculateRingCost, getDemoQuoteSession, safeSetLocalStorage, safeGetLocalStorage, safeParseDate, genId, getTennisBaseGrams, calculateScrapItemValue, formatPhoneNumber, compileSessionCost, hydrateFromIndexedDb, mergeWholesaleProfiles } from './utils';

// Modular Components
import ScrapCalculator from './components/ScrapCalculator';
import QuoteCalculator from './components/QuoteCalculator';
import LedgerView from './components/LedgerView';
import SettingsView from './components/SettingsView';
import Sketchpad from './components/Sketchpad';
import PhotoEditorModal from './components/PhotoEditorModal';
import SpotPriceView from './components/SpotPriceView';
import CubanBraceletBuilder from './components/CubanBraceletBuilder';
import WholesaleRepairView from './components/WholesaleRepairView';
import JumpRingEstimator from './components/JumpRingEstimator';

// Firebase cloud sync helpers
import {
  listenCollection,
  saveDocument,
  deleteDocument,
  syncLocalToCloud,
  fetchCollectionOnce,
  isDocumentDeleted,
  markDocumentDeleted,
  isQuotaError
} from './firebase';

// Tactile Click Audio Feedback Utility
import { playClickSound } from './utils/audio';

export default function App() {
  // iPad specific cross-origin iframe check (for print optimization)
  const isIframe = window.self !== window.top;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'scrap' | 'quote' | 'wholesale' | 'spot' | 'cuban' | 'jumpring' | 'ledger' | 'settings'>('scrap');

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Spot Rates & API credentials
  const [spotPrices, setSpotPrices] = useState({ gold: 2350, silver: 30, platinum: 1050 });
  const [lastUpdated, setLastUpdated] = useState('Manual Default');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [goldApiKey, setGoldApiKey] = useState('');

  // Quick Calculator state
  const [quickPurity, setQuickPurity] = useState('gold_14');
  const [quickGrams, setQuickGrams] = useState('');

  // Ledger Transactions (Firestore backed, loaded dynamically via real-time sync listeners)
  const [scrapTransactions, setScrapTransactions] = useState<ScrapTransaction[]>(() => {
    try {
      const raw = localStorage.getItem('gr_scrap_ledger');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [ringQuoteTransactions, setRingQuoteTransactions] = useState<QuoteTransaction[]>(() => {
    try {
      const raw = localStorage.getItem('gr_quote_ledger');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [wholesaleTransactions, setWholesaleTransactions] = useState<QuoteTransaction[]>(() => {
    try {
      const raw = localStorage.getItem('gr_wholesale_ledger');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [cubanEstimates, setCubanEstimates] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('gr_cuban_estimates');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Master settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = safeGetLocalStorage<AppSettings>('gr_app_settings');
      const savedProfiles = safeGetLocalStorage<WholesaleProfile[]>('gr_wholesale_profiles');
      if (raw && typeof raw === 'object') {
        const merged = { ...DEFAULT_SETTINGS, ...raw };
        if (Array.isArray(savedProfiles) && savedProfiles.length > 0) {
          merged.wholesaleProfiles = mergeWholesaleProfiles(merged.wholesaleProfiles || [], savedProfiles);
        }
        return merged;
      } else if (Array.isArray(savedProfiles) && savedProfiles.length > 0) {
        return { ...DEFAULT_SETTINGS, wholesaleProfiles: savedProfiles };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });

  // Active custom quote sessions
  const [retailSession, setRetailSession] = useState<QuoteSession>(() => {
    try {
      const parsed = safeGetLocalStorage<any>('gr_active_retail_session');
      if (parsed && Array.isArray(parsed.rings)) {
        parsed.rings = parsed.rings.map(upgradeRingData);
        parsed.customGrandTotal = null;
        parsed.customGrandTotalIsInclusive = false;
        return parsed;
      }
      return getEmptyQuoteSession();
    } catch {
      return getEmptyQuoteSession();
    }
  });
  const [wholesaleSession, setWholesaleSession] = useState<QuoteSession>(() => {
    try {
      const parsed = safeGetLocalStorage<any>('gr_active_wholesale_session');
      if (parsed && Array.isArray(parsed.rings)) {
        parsed.rings = parsed.rings.map(upgradeRingData);
        return parsed;
      }
      return getEmptyQuoteSession();
    } catch {
      return getEmptyQuoteSession();
    }
  });

  // Real-time synchronization is kept local only for current active sessions to avoid hitting database limits on every keystroke
  const lastRetailLocalChangeTimeRef = useRef<number>(0);
  const lastWholesaleLocalChangeTimeRef = useRef<number>(0);

  const updateRetailSessionLocal = (newSessionOrUpdater: QuoteSession | ((prev: QuoteSession) => QuoteSession), _immediate = false) => {
    lastRetailLocalChangeTimeRef.current = Date.now();
    setRetailSession(prev => {
      const next = typeof newSessionOrUpdater === 'function' ? newSessionOrUpdater(prev) : newSessionOrUpdater;
      safeSetLocalStorage('gr_active_retail_session', next);
      return next;
    });
  };

  const updateWholesaleSessionLocal = (newSessionOrUpdater: QuoteSession | ((prev: QuoteSession) => QuoteSession), _immediate = false) => {
    lastWholesaleLocalChangeTimeRef.current = Date.now();
    setWholesaleSession(prev => {
      const next = typeof newSessionOrUpdater === 'function' ? newSessionOrUpdater(prev) : newSessionOrUpdater;
      safeSetLocalStorage('gr_active_wholesale_session', next);
      return next;
    });
  };
  const [editingScrapTx, setEditingScrapTx] = useState<ScrapTransaction | null>(null);

  // Sketchpad state triggers
  const [isSketching, setIsSketching] = useState(false);
  const [editingImageType, setEditingImageType] = useState<'sketch' | 'photo'>('sketch');
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);

  // iPad specific cross-origin iframe print helper state
  const [showIframePrintDialog, setShowIframePrintDialog] = useState(false);
  const [pendingPrintFn, setPendingPrintFn] = useState<(() => void) | null>(null);

  // Trigger optimized printing inside iframes (such as the AI Studio dev preview)
  const handleTriggerPrint = (printFn: () => void) => {
    if (isIframe) {
      setPendingPrintFn(() => printFn);
      setShowIframePrintDialog(true);
    } else {
      printFn();
    }
  };

  const isLoadedRef = useRef(true);
  const lastLocalChangeTimeRef = useRef<number>(0);
  const lastCloudSettingsRef = useRef<string>("");
  const pendingCloudSettingsRef = useRef<any>(null);
  const [isPersistenceLoaded, setIsPersistenceLoaded] = useState(true);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [loadedFullCloudHistory, setLoadedFullCloudHistory] = useState<{ retail: boolean; wholesale: boolean; scrap: boolean }>({
    retail: false,
    wholesale: false,
    scrap: false
  });
  const [loadingOlderCloud, setLoadingOlderCloud] = useState<{ retail: boolean; wholesale: boolean; scrap: boolean }>({
    retail: false,
    wholesale: false,
    scrap: false
  });
  const quotaNoticeShownRef = useRef(false);
  const prevWholesaleProfilesMapRef = useRef<Map<string, string>>(new Map());

  // Request persistent storage on load (Safari/Chrome/iOS support to prevent auto-eviction)
  useEffect(() => {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(granted => {
        if (granted) {
          console.log("iOS/Browser Storage marked as PERSISTENT. History will not be cleared under storage pressure.");
        } else {
          console.log("iOS/Browser Storage marked as BEST-EFFORT. User should run main production domains.");
        }
      });
    }
  }, []);

  // Set up global tactile click feedback listener for all buttons, tabs, dropdowns, and checkboxes
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Detect closest clickable element up the DOM tree
      const clickable = target.closest('button, select, [role="button"], [role="tab"], .cursor-pointer, input[type="radio"], input[type="checkbox"], input[type="submit"]');
      if (!clickable) return;

      const text = clickable.textContent?.toLowerCase() || '';
      const html = clickable.innerHTML.toLowerCase();

      // Check if it's a delete/destructive action
      const isDelete = html.includes('trash') || 
                       html.includes('delete') || 
                       text.includes('delete') || 
                       text.includes('remove') ||
                       clickable.classList.contains('text-red-600') ||
                       clickable.classList.contains('bg-red-600');

      // Check if it's a clear/reset action
      const isClear = text.includes('clear') || text.includes('reset');

      // Check if it's a tab or sub-navigation tab
      const isTab = clickable.getAttribute('role') === 'tab' ||
                    clickable.classList.contains('px-5') && clickable.classList.contains('py-3') ||
                    text.includes('scrap buyback') ||
                    text.includes('custom quote') ||
                    text.includes('spot price') ||
                    text.includes('manufacturing') ||
                    text.includes('handmade cubans') ||
                    text.includes('ledger histories') ||
                    text.includes('master parameters') ||
                    text.includes('subtab');

      if (isDelete) {
        playClickSound('delete');
      } else if (isClear) {
        playClickSound('clear');
      } else if (isTab) {
        playClickSound('tab');
      } else {
        playClickSound('click');
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  // Load remaining fast-parsing keys on initialization & hydrate from IndexedDB
  useEffect(() => {
    isLoadedRef.current = true;
    setIsPersistenceLoaded(true);

    hydrateFromIndexedDb().then(idbData => {
      if (idbData) {
        const idbSettings = idbData['gr_app_settings'];
        const idbProfiles: WholesaleProfile[] = idbData['gr_wholesale_profiles'] || idbSettings?.wholesaleProfiles || [];
        if (idbSettings || (Array.isArray(idbProfiles) && idbProfiles.length > 0)) {
          setSettings(prev => {
            const mergedProfiles = mergeWholesaleProfiles(prev.wholesaleProfiles || [], idbProfiles);
            return {
              ...prev,
              ...(idbSettings || {}),
              wholesaleProfiles: mergedProfiles
            };
          });
        }
        if (Array.isArray(idbData['gr_quote_ledger']) && idbData['gr_quote_ledger'].length > 0) {
          setRingQuoteTransactions(prev => (idbData['gr_quote_ledger'].length >= prev.length ? idbData['gr_quote_ledger'] : prev));
        }
        if (Array.isArray(idbData['gr_wholesale_ledger']) && idbData['gr_wholesale_ledger'].length > 0) {
          setWholesaleTransactions(prev => (idbData['gr_wholesale_ledger'].length >= prev.length ? idbData['gr_wholesale_ledger'] : prev));
        }
        if (Array.isArray(idbData['gr_scrap_ledger']) && idbData['gr_scrap_ledger'].length > 0) {
          setScrapTransactions(prev => (idbData['gr_scrap_ledger'].length >= prev.length ? idbData['gr_scrap_ledger'] : prev));
        }
        if (Array.isArray(idbData['gr_cuban_estimates']) && idbData['gr_cuban_estimates'].length > 0) {
          setCubanEstimates(prev => (idbData['gr_cuban_estimates'].length >= prev.length ? idbData['gr_cuban_estimates'] : prev));
        }
      }
    }).catch(err => {
      console.warn("Storage hydration notice:", err);
    });
  }, []);

  // Shared helper to apply master settings from Firebase cloud updates
  const applyCloudSettings = (cleanMasterDoc: any) => {
    const cloudSettingsStr = JSON.stringify(cleanMasterDoc);
    lastCloudSettingsRef.current = cloudSettingsStr;
    
    setSettings(prev => {
      const incomingProfiles = Array.isArray(cleanMasterDoc.wholesaleProfiles) ? cleanMasterDoc.wholesaleProfiles : [];
      // Protect existing profiles from being wiped if cloud master doc has empty array or missing profiles
      const mergedProfiles = mergeWholesaleProfiles(prev.wholesaleProfiles || [], incomingProfiles);
      
      const merged = {
        ...prev,
        ...cleanMasterDoc,
        wholesale: { ...prev.wholesale, ...(cleanMasterDoc.wholesale || {}) },
        wholesaleProfiles: mergedProfiles,
        centerStoneRates: { ...prev.centerStoneRates, ...(cleanMasterDoc.centerStoneRates || {}) },
        centerStoneRawRates: { ...prev.centerStoneRawRates, ...(cleanMasterDoc.centerStoneRawRates || {}) },
        cubanMultipliers: cleanMasterDoc.cubanMultipliers || prev.cubanMultipliers,
        tennisMultipliers: cleanMasterDoc.tennisMultipliers || prev.tennisMultipliers,
      };
      
      safeSetLocalStorage('gr_app_settings', merged);
      safeSetLocalStorage('gr_wholesale_profiles', mergedProfiles);

      if (JSON.stringify(prev) === JSON.stringify(merged)) {
        return prev;
      }
      return merged;
    });
  };

  // Periodically check and apply pending cloud settings when the user is inactive
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingCloudSettingsRef.current) {
        const timeSinceLocalChange = Date.now() - lastLocalChangeTimeRef.current;
        if (timeSinceLocalChange >= 2500) {
          console.log("Applying pending cloud settings sync after 2.5 seconds of user inactivity...", pendingCloudSettingsRef.current);
          applyCloudSettings(pendingCloudSettingsRef.current);
          pendingCloudSettingsRef.current = null;
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Save settings explicitly to both local state and Firebase
  const handleSaveSettings = (newSettings: AppSettings) => {
    lastLocalChangeTimeRef.current = Date.now();
    setSettings(newSettings);
    
    // 1. Immediately persist to localStorage and IndexedDB (offline-first & permanent)
    safeSetLocalStorage('gr_app_settings', newSettings);
    if (Array.isArray(newSettings.wholesaleProfiles)) {
      safeSetLocalStorage('gr_wholesale_profiles', newSettings.wholesaleProfiles);
    }

    // 2. Sync to cloud Firestore immediately on manual save/profile operations
    saveDocument('app_settings', 'master', newSettings).catch(err => {
      console.warn("Could not sync app_settings to cloud, saved locally:", err?.message || err);
    });

    // 3. Sync ONLY new or modified wholesale profiles to the dedicated cloud collection
    // (avoids redundant writes & listener echoes when saving unrelated settings)
    if (Array.isArray(newSettings.wholesaleProfiles)) {
      const prevMap = prevWholesaleProfilesMapRef.current;
      const nextMap = new Map<string, string>();
      for (const profile of newSettings.wholesaleProfiles) {
        if (profile && profile.id) {
          const serialized = JSON.stringify(profile);
          nextMap.set(profile.id, serialized);
          if (prevMap.get(profile.id) !== serialized) {
            saveDocument('wholesale_profiles', profile.id, profile).catch(err => {
              console.warn(`Could not sync profile ${profile.name} to cloud:`, err?.message || err);
            });
          }
        }
      }
      prevWholesaleProfilesMapRef.current = nextMap;
    }
  };

  const handleDeleteWholesaleProfile = (profileId: string) => {
    lastLocalChangeTimeRef.current = Date.now();
    deleteDocument('wholesale_profiles', profileId).catch(err => {
      console.warn(`Cloud delete failed for profile ${profileId}:`, err);
    });
  };

  // Firestore server synchronization & real-time updates
  useEffect(() => {
    if (!isPersistenceLoaded) return;

    let active = true;
    let unsubScrap: (() => void) | null = null;
    let unsubRetail: (() => void) | null = null;
    let unsubWholesale: (() => void) | null = null;
    let unsubSettings: (() => void) | null = null;
    let unsubCuban: (() => void) | null = null;
    let unsubProfiles: (() => void) | null = null;
    let unsubDeletedDocs: (() => void) | null = null;

    const runSyncAndListen = async () => {
      try {
        console.log("Starting server synchronization...");

        if (!active) return;

        const notifyQuotaOnce = (err: unknown) => {
          if (isQuotaError(err) && !quotaNoticeShownRef.current) {
            quotaNoticeShownRef.current = true;
            showToast("Daily free cloud limit reached — using your saved local records.", "info");
          }
        };

        // Helper: safely merge a bounded recent cloud snapshot WITH existing locally cached
        // or previously loaded older records without ever erasing older local history.
        const mergeRecentCloudWithLocal = <T extends { id: string; syncPending?: boolean; timestamp?: any; date?: string }>(
          cloudDocs: any[],
          storageKey: string,
          isCuban = false
        ): T[] => {
          const localItems: T[] = (() => {
            try {
              const raw = localStorage.getItem(storageKey);
              return raw ? JSON.parse(raw) : [];
            } catch {
              return [];
            }
          })();

          const byId = new Map<string, T>();
          // 1. Preserve existing non-deleted local records (including older history beyond top 30)
          for (const localItem of localItems) {
            if (localItem && localItem.id && !isDocumentDeleted(localItem.id)) {
              byId.set(localItem.id, localItem);
            }
          }

          // 2. Overlay fresh cloud records from the live recent-30 snapshot
          for (const cloudDoc of cloudDocs) {
            if (!cloudDoc || !cloudDoc.id || isDocumentDeleted(cloudDoc.id)) continue;
            const existing = byId.get(cloudDoc.id);
            // If a local edit is actively pending upload, keep it until sync completes
            if (existing && existing.syncPending) continue;
            byId.set(cloudDoc.id, cloudDoc as T);
          }

          const merged = Array.from(byId.values());
          const sorted = merged.sort((a, b) => {
            if (isCuban) {
              const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
              const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
              return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
            }
            const tA = a.timestamp || (a.date ? safeParseDate(a.date) : 0);
            const tB = b.timestamp || (b.date ? safeParseDate(b.date) : 0);
            return tB - tA; // Newest first
          });

          safeSetLocalStorage(storageKey, sorted);
          return sorted;
        };

        // 0. Set up bounded real-time listener for recent deleted document tombstones
        unsubDeletedDocs = listenCollection(
          'deleted_doc_ids',
          (docs) => {
            if (!active) return;
            let changed = false;
            docs.forEach(d => {
              if (d && d.id) {
                if (!isDocumentDeleted(d.id)) {
                  markDocumentDeleted(d.id);
                  changed = true;
                }
              }
            });
            if (changed) {
              setScrapTransactions(prev => {
                const next = prev.filter(t => !isDocumentDeleted(t.id));
                safeSetLocalStorage('gr_scrap_ledger', next);
                return next;
              });
              setRingQuoteTransactions(prev => {
                const next = prev.filter(t => !isDocumentDeleted(t.id));
                safeSetLocalStorage('gr_quote_ledger', next);
                return next;
              });
              setWholesaleTransactions(prev => {
                const next = prev.filter(t => !isDocumentDeleted(t.id));
                safeSetLocalStorage('gr_wholesale_ledger', next);
                return next;
              });
              setCubanEstimates(prev => {
                const next = prev.filter(t => !isDocumentDeleted(t.id));
                safeSetLocalStorage('gr_cuban_estimates', next);
                return next;
              });
            }
          },
          notifyQuotaOnce,
          { orderByField: 'deletedAt', limitCount: 100 }
        );

        // Upload ONLY offline pending items (0 cloud reads when nothing is pending!)
        const localScrap = (() => {
          try {
            const raw = localStorage.getItem('gr_scrap_ledger');
            return raw ? JSON.parse(raw) : [];
          } catch { return []; }
        })();
        const localRetail = (() => {
          try {
            const raw = localStorage.getItem('gr_quote_ledger');
            return raw ? JSON.parse(raw) : [];
          } catch { return []; }
        })();
        const localWholesale = (() => {
          try {
            const raw = localStorage.getItem('gr_wholesale_ledger');
            return raw ? JSON.parse(raw) : [];
          } catch { return []; }
        })();
        const localCuban = (() => {
          try {
            const raw = localStorage.getItem('gr_cuban_estimates');
            return raw ? JSON.parse(raw) : [];
          } catch { return []; }
        })();
        const localProfiles = (() => {
          try {
            const raw = localStorage.getItem('gr_wholesale_profiles');
            return raw ? JSON.parse(raw) : [];
          } catch { return []; }
        })();

        const syncResults = await Promise.all([
          syncLocalToCloud('scrap_ledger', localScrap),
          syncLocalToCloud('retail_ledger', localRetail),
          syncLocalToCloud('wholesale_ledger', localWholesale),
          syncLocalToCloud('cuban_estimates', localCuban),
          syncLocalToCloud('wholesale_profiles', localProfiles)
        ]).catch(err => {
          console.warn("Offline local-to-cloud sync warning:", err);
          return null;
        });

        // Clear syncPending flags locally for any items successfully uploaded on boot
        if (active && syncResults) {
          const [scrapRes, retailRes, wholesaleRes, cubanRes] = syncResults;
          if (scrapRes?.uploadedIds?.length) {
            const uploadedSet = new Set(scrapRes.uploadedIds);
            setScrapTransactions(prev => {
              const next = prev.map(t => uploadedSet.has(t.id) ? { ...t, syncPending: false } : t);
              safeSetLocalStorage('gr_scrap_ledger', next);
              return next;
            });
          }
          if (retailRes?.uploadedIds?.length) {
            const uploadedSet = new Set(retailRes.uploadedIds);
            setRingQuoteTransactions(prev => {
              const next = prev.map(t => uploadedSet.has(t.id) ? { ...t, syncPending: false } : t);
              safeSetLocalStorage('gr_quote_ledger', next);
              return next;
            });
          }
          if (wholesaleRes?.uploadedIds?.length) {
            const uploadedSet = new Set(wholesaleRes.uploadedIds);
            setWholesaleTransactions(prev => {
              const next = prev.map(t => uploadedSet.has(t.id) ? { ...t, syncPending: false } : t);
              safeSetLocalStorage('gr_wholesale_ledger', next);
              return next;
            });
          }
          if (cubanRes?.uploadedIds?.length) {
            const uploadedSet = new Set(cubanRes.uploadedIds);
            setCubanEstimates(prev => {
              const next = prev.map(t => uploadedSet.has(t.id) ? { ...t, syncPending: false } : t);
              safeSetLocalStorage('gr_cuban_estimates', next);
              return next;
            });
          }
        }

        // 1. Set up recent-30 real-time listener for Scrap Buyback Ledger
        unsubScrap = listenCollection(
          'scrap_ledger',
          (docs) => {
            if (!active) return;
            const sorted = mergeRecentCloudWithLocal<ScrapTransaction>(docs, 'gr_scrap_ledger');
            setScrapTransactions(sorted);
          },
          notifyQuotaOnce,
          { orderByField: 'timestamp', limitCount: 30 }
        );

        // 2. Set up recent-30 real-time listener for Retail Quote Ledger
        unsubRetail = listenCollection(
          'retail_ledger',
          (docs) => {
            if (!active) return;
            const sorted = mergeRecentCloudWithLocal<QuoteTransaction>(docs, 'gr_quote_ledger');
            setRingQuoteTransactions(sorted);
          },
          notifyQuotaOnce,
          { orderByField: 'timestamp', limitCount: 30 }
        );

        // 3. Set up recent-30 real-time listener for Wholesale Ledger
        unsubWholesale = listenCollection(
          'wholesale_ledger',
          (docs) => {
            if (!active) return;
            const sorted = mergeRecentCloudWithLocal<QuoteTransaction>(docs, 'gr_wholesale_ledger');
            setWholesaleTransactions(sorted);
          },
          notifyQuotaOnce,
          { orderByField: 'timestamp', limitCount: 30 }
        );

        // 4. Set up bounded real-time listener for Cuban Estimates
        unsubCuban = listenCollection(
          'cuban_estimates',
          (docs) => {
            if (!active) return;
            const sorted = mergeRecentCloudWithLocal<any>(docs, 'gr_cuban_estimates', true);
            setCubanEstimates(sorted);
          },
          notifyQuotaOnce,
          { limitCount: 30 }
        );

        // 5. Set up real-time listener for Master App Settings (cached locally via persistentLocalCache)
        unsubSettings = listenCollection(
          'app_settings',
          (docs) => {
            if (!active) return;

            const masterDoc = docs.find(d => d.id === 'master');
            if (masterDoc) {
              const cleanMasterDoc = { ...masterDoc };
              delete cleanMasterDoc.id; // remove Firestore id prop

              // Protect active edits from being overwritten by incoming cloud sync
              const timeSinceLocalChange = Date.now() - lastLocalChangeTimeRef.current;
              if (timeSinceLocalChange < 2500) {
                console.log("Ignoring cloud settings sync to protect recent local edits. Storing in pending...");
                pendingCloudSettingsRef.current = cleanMasterDoc;
              } else {
                pendingCloudSettingsRef.current = null;
                applyCloudSettings(cleanMasterDoc);
              }
            }

            const apiKeyDoc = docs.find(d => d.id === 'gold_api_key');
            if (apiKeyDoc) {
              setGoldApiKey(apiKeyDoc.key || '');
            }

            const wholesaleDoc = docs.find(d => d.id === 'active_wholesale_session');
            if (wholesaleDoc) {
              const cleanWholesale = { ...wholesaleDoc };
              delete cleanWholesale.id;
              const timeSinceLocalChange = Date.now() - lastWholesaleLocalChangeTimeRef.current;
              if (timeSinceLocalChange >= 2500) {
                setWholesaleSession(cleanWholesale as QuoteSession);
                safeSetLocalStorage('gr_active_wholesale_session', cleanWholesale as QuoteSession);
              }
            }
          },
          notifyQuotaOnce
        );

        // 5b. Set up real-time listener for dedicated Wholesale Client Profiles
        unsubProfiles = listenCollection(
          'wholesale_profiles',
          (docs) => {
            if (!active) return;
            const validDocs = docs.filter(d => d && d.id && !isDocumentDeleted(d.id));
            if (validDocs.length === 0) return;

            setSettings(prev => {
              const merged = mergeWholesaleProfiles(prev.wholesaleProfiles || [], validDocs as any);
              const nextMap = new Map<string, string>();
              merged.forEach(p => { if (p && p.id) nextMap.set(p.id, JSON.stringify(p)); });
              prevWholesaleProfilesMapRef.current = nextMap;
              safeSetLocalStorage('gr_wholesale_profiles', merged);
              const updatedSettings = { ...prev, wholesaleProfiles: merged };
              safeSetLocalStorage('gr_app_settings', updatedSettings);
              return updatedSettings;
            });
          },
          notifyQuotaOnce
        );

        setIsCloudSynced(true);
        console.log("Server synchronization initialized successfully.");
      } catch (err) {
        console.error("Error setting up server synchronization:", err);
      }
    };

    runSyncAndListen();

    return () => {
      active = false;
      if (unsubScrap) unsubScrap();
      if (unsubRetail) unsubRetail();
      if (unsubWholesale) unsubWholesale();
      if (unsubSettings) unsubSettings();
      if (unsubProfiles) unsubProfiles();
      if (unsubCuban) unsubCuban();
      if (unsubDeletedDocs) unsubDeletedDocs();
    };
  }, [isPersistenceLoaded]);

  // Fetch GoldAPI CAD Spot Indices
  const fetchLivePrices = async () => {
    const trimmedKey = goldApiKey ? goldApiKey.trim() : '';
    if (!trimmedKey || trimmedKey === 'INSERT_YOUR_NEW_KEY_HERE') {
      alert("Please configure a valid GoldAPI.io Access Token in the Master Settings panel first.");
      return;
    }

    setSyncStatus("Syncing...");
    try {
      const headers = {
        'x-access-token': trimmedKey,
        'Content-Type': 'application/json'
      };

      const results = await Promise.all(
        ['XAU', 'XAG', 'XPT'].map(async (metal) => {
          try {
            const res = await fetch(`https://www.goldapi.io/api/${metal}/CAD`, { headers });
            const data = await res.json();
            return { metal, status: res.status, data };
          } catch (e: any) {
            return { metal, error: e.message || 'Network request failed' };
          }
        })
      );

      const xau = results.find(r => r.metal === 'XAU');
      const xag = results.find(r => r.metal === 'XAG');
      const xpt = results.find(r => r.metal === 'XPT');

      const priceGold = xau?.data?.price;
      const priceSilver = xag?.data?.price;
      const pricePlatinum = xpt?.data?.price;

      // Verify that values are returned and not error codes
      if (priceGold && priceSilver && pricePlatinum) {
        const spot = {
          gold: priceGold,
          silver: priceSilver,
          platinum: pricePlatinum
        };
        setSpotPrices(spot);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastUpdated(timeStr);
        setSyncStatus(`Synced at ${timeStr}`);
      } else {
        // Build detailed error report from responses
        const errors: string[] = [];
        results.forEach(res => {
          const metalLabel = res.metal === 'XAU' ? 'Gold' : res.metal === 'XAG' ? 'Silver' : 'Platinum';
          if ('error' in res) {
            errors.push(`${metalLabel}: ${res.error}`);
          } else {
            const d = res.data;
            if (!d) {
              errors.push(`${metalLabel}: Received empty response`);
            } else if (d.error) {
              errors.push(`${metalLabel}: ${d.error}`);
            } else if (d.message) {
              errors.push(`${metalLabel}: ${d.message}`);
            } else if (d.error_code) {
              errors.push(`${metalLabel}: ${d.error_code}`);
            } else if (!d.price) {
              // Sometimes APIs return text like "Unauthenticated" as string if the content-type is wrong, or standard error objects
              const keys = typeof d === 'object' && d !== null ? Object.keys(d).join(', ') : 'non-object';
              errors.push(`${metalLabel}: Price missing. Fields returned: [${keys}]`);
            }
          }
        });

        const detailedMsg = errors.length > 0 
          ? errors.join('\n') 
          : "Unknown error. Price keys not returned by GoldAPI.";
        throw new Error(`GoldAPI returned validation/quota issues:\n\n${detailedMsg}`);
      }
    } catch (err: any) {
      setSyncStatus("Error");
      alert("Failed to sync live prices: " + err.message);
    }
  };

  // Quick metal estimator computation
  const computeQuickEstimate = (): string => {
    const grams = parseFloat(quickGrams);
    if (!grams || isNaN(grams)) return "0.00";
    const [metal, purity] = quickPurity.split('_');
    const factor = parseFloat(purity);
    
    let spotPrice = spotPrices.gold;
    if (metal === 'silver') spotPrice = spotPrices.silver;
    else if (metal === 'platinum') spotPrice = spotPrices.platinum;

    const gramsSpotPrice = spotPrice / TROY_ONCE_GRAMS;
    const purityFactor = metal === 'gold' ? factor / 24 : factor;

    return (grams * gramsSpotPrice * purityFactor).toFixed(2);
  };

  // PERSISTENCE MUTATORS
  const handleSaveScrap = (
    data: {
      name: string;
      phone: string;
      address: string;
      driversLicense: string;
      employeeId?: string;
      stoneRemovalQty: string;
      items: ScrapItem[];
      image: string | null;
      goldImage?: string | null;
      signature: string | null;
      customTotal?: string;
    },
    existingId?: string
  ): ScrapTransaction => {
    const logStr = data.items.map(i => {
      const pLabel = `${i.purity}%`;
      return `${i.weight}g ${i.material} (${pLabel})`;
    }).join(', ');

    const totalVal = data.items.reduce((total, item) => {
      return total + calculateScrapItemValue(item, spotPrices);
    }, 0);
    const calculatedTotal = Math.max(0, totalVal - (Number(data.stoneRemovalQty || 0) * 5)).toFixed(2);
    const finalTotal = (data.customTotal !== undefined && data.customTotal !== '' && !isNaN(parseFloat(data.customTotal))) 
      ? parseFloat(data.customTotal).toFixed(2) 
      : calculatedTotal;

    if (existingId) {
      const original = scrapTransactions.find(t => t.id === existingId);
      const updatedTx: ScrapTransaction = {
        id: existingId,
        date: original ? original.date : new Date().toLocaleString(),
        timestamp: original ? (original.timestamp || Date.now()) : Date.now(),
        name: data.name,
        phone: data.phone,
        address: data.address,
        driversLicense: data.driversLicense,
        employeeId: data.employeeId || '',
        stoneRemovalQty: data.stoneRemovalQty,
        spotPrices: {
          gold: Number(spotPrices.gold) || (original?.spotPrices?.gold ?? 2350),
          silver: Number(spotPrices.silver) || (original?.spotPrices?.silver ?? 30),
          platinum: Number(spotPrices.platinum) || (original?.spotPrices?.platinum ?? 1050),
        },
        items: data.items,
        summary: logStr,
        total: finalTotal,
        image: data.image,
        goldImage: data.goldImage !== undefined ? data.goldImage : (original?.goldImage || null),
        signature: data.signature,
        syncPending: true
      };

      setScrapTransactions(prev => {
        const updated = prev.map(t => t.id === existingId ? updatedTx : t);
        safeSetLocalStorage('gr_scrap_ledger', updated);
        return updated;
      });

      // Sync to cloud Firestore with callbacks
      saveDocument('scrap_ledger', existingId, updatedTx)
        .then((syncRes) => {
          if (syncRes && !syncRes.offline && !syncRes.quotaExceeded) {
            setScrapTransactions(prev => {
              const next = prev.map(t => t.id === existingId ? { ...t, syncPending: false } : t);
              safeSetLocalStorage('gr_scrap_ledger', next);
              return next;
            });
            playClickSound('success');
            showToast("Scrap payout adjusted and synced to cloud ledger!", "success");
          } else {
            playClickSound('success');
            showToast("Scrap payout adjusted locally (cloud sync queued)!", "info");
          }
        })
        .catch(err => {
          console.error("Cloud sync failed on scrap edit:", err);
          showToast("Scrap payout adjusted locally (sync pending)!", "info");
        });

      setEditingScrapTx(null);
      return updatedTx;
    } else {
      const newTx: ScrapTransaction = {
        id: Math.random().toString(36).substring(2, 11),
        date: new Date().toLocaleString(),
        timestamp: Date.now(),
        name: data.name,
        phone: data.phone,
        address: data.address,
        driversLicense: data.driversLicense,
        employeeId: data.employeeId || '',
        stoneRemovalQty: data.stoneRemovalQty,
        spotPrices: { ...spotPrices },
        items: data.items,
        summary: logStr,
        total: finalTotal,
        image: data.image,
        goldImage: data.goldImage || null,
        signature: data.signature,
        syncPending: true
      };

      setScrapTransactions(prev => {
        const updated = [newTx, ...prev];
        safeSetLocalStorage('gr_scrap_ledger', updated);
        return updated;
      });

      // Sync to cloud Firestore with callbacks
      saveDocument('scrap_ledger', newTx.id, newTx)
        .then((syncRes) => {
          if (syncRes && !syncRes.offline && !syncRes.quotaExceeded) {
            setScrapTransactions(prev => {
              const next = prev.map(t => t.id === newTx.id ? { ...t, syncPending: false } : t);
              safeSetLocalStorage('gr_scrap_ledger', next);
              return next;
            });
            playClickSound('success');
            showToast("Scrap payout logged and synced to cloud ledger!", "success");
          } else {
            playClickSound('success');
            showToast("Scrap payout logged locally (cloud sync queued)!", "info");
          }
        })
        .catch(err => {
          console.error("Cloud sync failed on scrap save:", err);
          showToast("Scrap payout logged locally (sync pending)!", "info");
        });

      return newTx;
    }
  };

  const handleSaveQuote = async (isWholesale: boolean, resetSessionAfterSave = true) => {
    const activeSession = isWholesale ? wholesaleSession : retailSession;
    if (!activeSession.cName && !isWholesale) {
      alert("Please enter customer name inside the 'Summary & Tax' subtab first.");
      return;
    }

    let grossTotal = 0;
    let totalDiscount = 0;
    activeSession.rings.forEach(r => {
      // Calculate costs using standard utilities
      const cost = r.goldGrams || r.category === 'tennisBracelet' ? (
        isWholesale ? (
          // Wholesale Pricing
          r.goldGrams ? (
            parseFloat(r.goldGrams) * 100 // placeholder inside calculations helper
          ) : 100
        ) : 100
      ) : 0;
    });

    // Re-verify actual prices
    let retailTotal = 0;
    activeSession.rings.forEach(r => {
      const finalItemPrice = r.goldGrams || r.category === 'tennisBracelet' ? 100 : 0;
    });

    const l: Record<string, string> = { customRing: 'Ring', weddingBand: 'Band', mensBand: "Men's", pendant: 'Pend', tennisBracelet: 'Tennis', earrings: 'Earrings' };
    const sum = activeSession.rings.map(r => `${r.customTitle?.trim() || l[r.category] || 'Item'}: ${r.goldGrams || 'Est'}g`).join(' | ') || (isWholesale ? "Wholesale Contract" : "Retail Consultation");

    // Recalculate accurate final sum using compileSessionCost
    const totals = compileSessionCost(activeSession, settings, spotPrices, isWholesale);
    const finalInvoiceAmount = totals.grandTotal;

    const formattedTotal = finalInvoiceAmount < 0 
      ? `-$${Math.abs(finalInvoiceAmount).toFixed(2)}` 
      : `$${finalInvoiceAmount.toFixed(2)}`;

    const nameToLog = activeSession.cName || (activeSession.jobNum ? `Job #${activeSession.jobNum}` : 'Wholesale Client');

    const list = isWholesale ? wholesaleTransactions : ringQuoteTransactions;
    const safeTxId = (activeSession.id && activeSession.id !== 'undefined') ? activeSession.id : genId();
    const existingTx = list.find(q => q.id === safeTxId);

    const sanitizedSession = JSON.parse(JSON.stringify(activeSession));
    sanitizedSession.id = safeTxId;

    const effectiveSpot = {
      gold: Number(activeSession.overridePrices?.gold) > 0 
        ? Number(activeSession.overridePrices?.gold) 
        : (Number(spotPrices.gold) || 0),
      silver: Number(activeSession.overridePrices?.silver) > 0 
        ? Number(activeSession.overridePrices?.silver) 
        : (Number(spotPrices.silver) || 0),
      platinum: Number(activeSession.overridePrices?.platinum) > 0 
        ? Number(activeSession.overridePrices?.platinum) 
        : (Number(spotPrices.platinum) || 0),
    };
    sanitizedSession.overridePrices = effectiveSpot;

    const newTx: QuoteTransaction = {
      id: safeTxId,
      date: existingTx ? existingTx.date : new Date().toLocaleString(),
      timestamp: existingTx ? (existingTx.timestamp || Date.now()) : Date.now(),
      name: nameToLog,
      phone: activeSession.cPhone,
      employeeId: activeSession.employeeId || undefined,
      summary: sum,
      total: formattedTotal,
      fullData: sanitizedSession,
      isWholesale,
      spotPrices: effectiveSpot,
      syncPending: true
    };

    if (isWholesale) {
      const idx = wholesaleTransactions.findIndex(q => q.id === safeTxId);
      let updated: QuoteTransaction[];
      if (idx >= 0) {
        updated = [...wholesaleTransactions];
        updated[idx] = newTx;
      } else {
        updated = [newTx, ...wholesaleTransactions];
      }

      safeSetLocalStorage('gr_wholesale_ledger', updated);
      setWholesaleTransactions(updated);

      try {
        const syncRes = await saveDocument('wholesale_ledger', newTx.id, newTx);
        if (syncRes && !syncRes.offline && !syncRes.quotaExceeded) {
          setWholesaleTransactions(prev => {
            const next = prev.map(t => t.id === newTx.id ? { ...t, syncPending: false } : t);
            safeSetLocalStorage('gr_wholesale_ledger', next);
            return next;
          });
        }
        if (resetSessionAfterSave) {
          updateWholesaleSessionLocal(getEmptyQuoteSession(), true);
        }
        playClickSound('success');
        if (syncRes && syncRes.quotaExceeded) {
          showToast("Wholesale order saved to ledger! (Offline mode - all pictures preserved)", "success");
        } else {
          showToast("Wholesale job order successfully saved and synced!", "success");
        }
      } catch (err: any) {
        console.warn("Cloud sync notice on wholesale save:", err);
        if (resetSessionAfterSave) {
          updateWholesaleSessionLocal(getEmptyQuoteSession(), true);
        }
        playClickSound('success');
        const errMsg = err?.message || String(err);
        if (errMsg.toLowerCase().includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          showToast("Wholesale order saved to ledger! (Offline mode - all pictures preserved)", "success");
        } else {
          showToast("Wholesale order saved to local ledger! (Cloud sync queued)", "info");
        }
      }
    } else {
      const idx = ringQuoteTransactions.findIndex(q => q.id === safeTxId);
      let updated: QuoteTransaction[];
      if (idx >= 0) {
        updated = [...ringQuoteTransactions];
        updated[idx] = newTx;
      } else {
        updated = [newTx, ...ringQuoteTransactions];
      }

      safeSetLocalStorage('gr_quote_ledger', updated);
      setRingQuoteTransactions(updated);

      try {
        const syncRes = await saveDocument('retail_ledger', newTx.id, newTx);
        if (syncRes && !syncRes.offline && !syncRes.quotaExceeded) {
          setRingQuoteTransactions(prev => {
            const next = prev.map(t => t.id === newTx.id ? { ...t, syncPending: false } : t);
            safeSetLocalStorage('gr_quote_ledger', next);
            return next;
          });
        }
        if (resetSessionAfterSave) {
          updateRetailSessionLocal(getEmptyQuoteSession(), true);
        }
        playClickSound('success');
        if (syncRes && syncRes.quotaExceeded) {
          showToast("Retail custom quote saved to ledger! (Offline mode - all pictures preserved)", "success");
        } else {
          showToast("Retail custom quote saved and synced successfully!", "success");
        }
      } catch (err: any) {
        console.warn("Cloud sync notice on retail save:", err);
        if (resetSessionAfterSave) {
          updateRetailSessionLocal(getEmptyQuoteSession(), true);
        }
        playClickSound('success');
        const errMsg = err?.message || String(err);
        if (errMsg.toLowerCase().includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          showToast("Retail custom quote saved to ledger! (Offline mode - all pictures preserved)", "success");
        } else {
          showToast("Retail custom quote saved to local ledger! (Cloud sync queued)", "info");
        }
      }
    }
  };

  const getTennisEstimates = (r: JewelryItem) => {
    let smm = 0;
    let cps = 0;
    if (r.tbShape === 'Round') {
      smm = parseFloat(r.tbSizeRound || '') || 2.0;
      cps = ROUND_MELEE[String(r.tbSizeRound)] || 0.03;
    } else {
      const shape = r.tbShape || 'Princess';
      const aF = FANCY_SHAPES[shape] || FANCY_SHAPES['Princess'];
      const fd = aF[r.tbSizeIdx || 0] || aF[0];
      smm = parseFloat(fd.label) || 2.0;
      cps = fd.carat || 0.05;
    }
    const bs = Math.round(177.8 / (smm + 0.4));
    const bg = getTennisBaseGrams(smm);
    const lm = parseFloat(String(r.tbLength || 7.0)) / 7.0;
    return { estStones: Math.round(bs * lm), caratPerStone: cps };
  };

  // Loader into Active Calculator Editors
  const handleLoadQuote = (id: string, isWholesale: boolean) => {
    const list = isWholesale ? wholesaleTransactions : ringQuoteTransactions;
    const item = list.find(q => q.id === id);
    if (!item) return;

    const fullData = JSON.parse(JSON.stringify(item.fullData)) as QuoteSession;
    fullData.rings = (fullData.rings || []).map(upgradeRingData);
    if (fullData.discount === undefined) fullData.discount = '';
    if (!fullData.discountType) fullData.discountType = '$';

    // Ensure active piece subtab exists so sketches and parameters render immediately
    if (fullData.rings.length > 0) {
      const ringExists = fullData.rings.some(r => r.id === fullData.activeSubTab);
      if (!ringExists && fullData.activeSubTab !== 'summary') {
        fullData.activeSubTab = fullData.rings[0].id;
      }
    }

    // Restore original gold, silver, and platinum prices from when the job was entered
    const loggedGold = Number(fullData.overridePrices?.gold ?? (item as any).spotPrices?.gold ?? 0);
    const loggedSilver = Number(fullData.overridePrices?.silver ?? (item as any).spotPrices?.silver ?? 0);
    const loggedPlatinum = Number(fullData.overridePrices?.platinum ?? (item as any).spotPrices?.platinum ?? 0);

    const hasLoggedSpot = (loggedGold > 0) || (loggedSilver > 0) || (loggedPlatinum > 0);

    if (hasLoggedSpot) {
      const restoredSpot = {
        gold: loggedGold > 0 ? loggedGold : spotPrices.gold,
        silver: loggedSilver > 0 ? loggedSilver : spotPrices.silver,
        platinum: loggedPlatinum > 0 ? loggedPlatinum : spotPrices.platinum,
      };

      // 1. Update the application's global spot prices
      setSpotPrices(restoredSpot);
      setLastUpdated(`Loaded from ${isWholesale ? 'Wholesale Job' : 'Quote'} (${item.date || 'Record'})`);

      // 2. Ensure session overridePrices matches these exact prices
      fullData.overridePrices = {
        gold: restoredSpot.gold,
        silver: restoredSpot.silver,
        platinum: restoredSpot.platinum,
      };
    }

    if (isWholesale) {
      updateWholesaleSessionLocal(fullData, true);
      setActiveTab('wholesale');
      const goldDisplay = loggedGold > 0 ? `$${loggedGold.toFixed(2)}/oz` : '';
      showToast(`Loaded wholesale order #${fullData.jobNum || item.id} with original spot prices ${goldDisplay ? `(Gold: ${goldDisplay})` : ''}`, 'info');
    } else {
      updateRetailSessionLocal(fullData, true);
      setActiveTab('quote');
      const goldDisplay = loggedGold > 0 ? `$${loggedGold.toFixed(2)}/oz` : '';
      showToast(`Loaded quote into editor with original spot prices ${goldDisplay ? `(Gold: ${goldDisplay})` : ''}`, 'info');
    }
  };

  const handleLoadScrap = (id: string) => {
    const item = scrapTransactions.find(t => t.id === id);
    if (!item) return;

    if (item.spotPrices) {
      const g = Number(item.spotPrices.gold);
      const s = Number(item.spotPrices.silver);
      const p = Number(item.spotPrices.platinum);
      if ((!isNaN(g) && g > 0) || (!isNaN(s) && s > 0) || (!isNaN(p) && p > 0)) {
        setSpotPrices(prev => ({
          gold: !isNaN(g) && g > 0 ? g : prev.gold,
          silver: !isNaN(s) && s > 0 ? s : prev.silver,
          platinum: !isNaN(p) && p > 0 ? p : prev.platinum,
        }));
        setLastUpdated(`Loaded from Scrap Buyback (${item.date || 'Record'})`);
      }
    }

    setEditingScrapTx(item);
    setActiveTab('scrap');
    const goldDisplay = item.spotPrices?.gold ? `$${Number(item.spotPrices.gold).toFixed(2)}/oz` : '';
    showToast(`Loaded scrap buyback record with original spot prices ${goldDisplay ? `(Gold: ${goldDisplay})` : ''}`, 'info');
  };

  const handleApplyScrapToQuote = (scrapId: string, isWholesale: boolean) => {
    const scrapTx = scrapTransactions.find(t => t.id === scrapId);
    if (!scrapTx) return;

    const payout = parseFloat(scrapTx.total) || 0;
    if (isWholesale) {
      updateWholesaleSessionLocal({
        ...wholesaleSession,
        scrapCredit: payout,
        cName: wholesaleSession.cName || scrapTx.name || '',
        cPhone: formatPhoneNumber(wholesaleSession.cPhone || scrapTx.phone || '')
      }, true);
      setActiveTab('wholesale');
      playClickSound('success');
      showToast(`Applied $${payout.toFixed(2)} scrap credit to Wholesale order!`, 'success');
    } else {
      updateRetailSessionLocal({
        ...retailSession,
        scrapCredit: payout,
        cName: retailSession.cName || scrapTx.name || '',
        cPhone: formatPhoneNumber(retailSession.cPhone || scrapTx.phone || '')
      }, true);
      setActiveTab('quote');
      playClickSound('success');
      showToast(`Applied $${payout.toFixed(2)} scrap credit to Retail quote!`, 'success');
    }
  };

  // Exporters
  const handleExportCsv = (type: 'scrap' | 'retail' | 'wholesale') => {
    let csv = "";
    if (type === 'scrap') {
      csv = "ID,Date,Name,Phone,Employee ID,Summary,Total paid\n";
      scrapTransactions.forEach(t => {
        csv += `"${t.id}","${t.date}","${t.name}","${t.phone}","${(t.employeeId || '').replace(/"/g, '""')}","${t.summary.replace(/"/g, '""')}","${t.total}"\n`;
      });
    } else if (type === 'retail') {
      csv = "ID,Date,Client,Phone,Pieces Summary,Total Due\n";
      ringQuoteTransactions.forEach(t => {
        csv += `"${t.id}","${t.date}","${t.name}","${t.phone}","${t.summary.replace(/"/g, '""')}","${t.total}"\n`;
      });
    } else {
      csv = "ID,Date,Client,Phone,Pieces Summary,Total Due\n";
      wholesaleTransactions.forEach(t => {
        csv += `"${t.id}","${t.date}","${t.name}","${t.phone}","${t.summary.replace(/"/g, '""')}","${t.total}"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GoldAndRose_${type}_ledger.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // LEDGER CLEAR HISTORY UTILITY
  const handleClearHistory = async (range: 'all' | '365' | 'custom', startDate?: string, endDate?: string) => {
    let fS = [...scrapTransactions];
    let fR = [...ringQuoteTransactions];
    let fW = [...wholesaleTransactions];

    let removedS: ScrapTransaction[] = [];
    let removedR: QuoteTransaction[] = [];
    let removedW: QuoteTransaction[] = [];

    if (range === 'all') {
      removedS = fS;
      removedR = fR;
      removedW = fW;
      fS = [];
      fR = [];
      fW = [];
    } else if (range === '365') {
      const cut = new Date();
      cut.setDate(cut.getDate() - 365);
      removedS = scrapTransactions.filter(t => new Date(t.date) <= cut);
      removedR = ringQuoteTransactions.filter(t => new Date(t.date) <= cut);
      removedW = wholesaleTransactions.filter(t => new Date(t.date) <= cut);
      fS = scrapTransactions.filter(t => new Date(t.date) > cut);
      fR = ringQuoteTransactions.filter(t => new Date(t.date) > cut);
      fW = wholesaleTransactions.filter(t => new Date(t.date) > cut);
    } else if (range === 'custom' && startDate && endDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);

      removedS = scrapTransactions.filter(tx => { const d = new Date(tx.date); return d >= s && d <= e; });
      removedR = ringQuoteTransactions.filter(tx => { const d = new Date(tx.date); return d >= s && d <= e; });
      removedW = wholesaleTransactions.filter(tx => { const d = new Date(tx.date); return d >= s && d <= e; });

      fS = scrapTransactions.filter(tx => { const d = new Date(tx.date); return d < s || d > e; });
      fR = ringQuoteTransactions.filter(tx => { const d = new Date(tx.date); return d < s || d > e; });
      fW = wholesaleTransactions.filter(tx => { const d = new Date(tx.date); return d < s || d > e; });
    }

    setScrapTransactions(fS);
    setRingQuoteTransactions(fR);
    setWholesaleTransactions(fW);

    safeSetLocalStorage('gr_scrap_ledger', fS);
    safeSetLocalStorage('gr_quote_ledger', fR);
    safeSetLocalStorage('gr_wholesale_ledger', fW);

    // Delete purged items from Firestore cloud
    for (const item of removedS) {
      if (item?.id) {
        markDocumentDeleted(item.id);
        deleteDocument('scrap_ledger', item.id).catch(() => {});
      }
    }
    for (const item of removedR) {
      if (item?.id) {
        markDocumentDeleted(item.id);
        deleteDocument('retail_ledger', item.id).catch(() => {});
      }
    }
    for (const item of removedW) {
      if (item?.id) {
        markDocumentDeleted(item.id);
        deleteDocument('wholesale_ledger', item.id).catch(() => {});
      }
    }
  };

  const handleDeleteLedgerItem = async (type: 'scrap' | 'retail' | 'wholesale', id: string) => {
    if (!window.confirm("Permanently delete this transaction record?")) return;

    markDocumentDeleted(id);

    if (type === 'scrap') {
      setScrapTransactions(prev => {
        const updated = prev.filter(t => t.id !== id);
        safeSetLocalStorage('gr_scrap_ledger', updated);
        return updated;
      });
      await deleteDocument('scrap_ledger', id).catch(err => console.error("Scrap cloud delete error:", err));
    } else if (type === 'retail') {
      setRingQuoteTransactions(prev => {
        const updated = prev.filter(t => t.id !== id);
        safeSetLocalStorage('gr_quote_ledger', updated);
        return updated;
      });
      await deleteDocument('retail_ledger', id).catch(err => console.error("Retail cloud delete error:", err));
    } else {
      setWholesaleTransactions(prev => {
        const updated = prev.filter(t => t.id !== id);
        safeSetLocalStorage('gr_wholesale_ledger', updated);
        return updated;
      });
      await deleteDocument('wholesale_ledger', id).catch(err => console.error("Wholesale cloud delete error:", err));
    }
  };

  const handleCreateDemoTransaction = () => {
    const demoSession = getDemoQuoteSession();
    
    // If already exists, regenerate with fresh ID to allow multiple test lines if desired, or select/alert
    const hasExisting = ringQuoteTransactions.some(q => q.id === demoSession.id);
    if (hasExisting) {
      demoSession.id = `demo-set-wedding-quote-${Math.random().toString(36).substring(2, 6)}`;
    }

    const totals = compileSessionCost(demoSession, settings, spotPrices, false);
    const finalInvoiceAmount = totals.grandTotal;
    const demoTotal = finalInvoiceAmount < 0 
      ? `-$${Math.abs(finalInvoiceAmount).toFixed(2)}` 
      : `$${finalInvoiceAmount.toFixed(2)}`;

    const demoTx: QuoteTransaction = {
      id: demoSession.id,
      date: new Date().toLocaleString(),
      timestamp: Date.now(),
      name: demoSession.cName,
      phone: demoSession.cPhone,
      summary: "Ring: 4.8g | Band: 3.5g | Men's: 7.2g",
      total: demoTotal,
      fullData: {
        ...demoSession,
        overridePrices: { ...spotPrices }
      },
      isWholesale: false,
      spotPrices: { ...spotPrices }
    };

    setRingQuoteTransactions(prev => {
      const updated = [demoTx, ...prev];
      safeSetLocalStorage('gr_quote_ledger', updated);
      return updated;
    });

    alert("Success! Added custom wedding set demo quote with Engagement, Band, and Men's Bevel Band to your Retail Ledger.");
  };

  const handleManualSync = async () => {
    if (isManualSyncing) return;
    setIsManualSyncing(true);
    showToast("Checking pending records for cloud sync...", "info");
    try {
      const localScrap = (() => {
        try {
          const raw = localStorage.getItem('gr_scrap_ledger');
          return raw ? JSON.parse(raw) : [];
        } catch { return []; }
      })();
      const localRetail = (() => {
        try {
          const raw = localStorage.getItem('gr_quote_ledger');
          return raw ? JSON.parse(raw) : [];
        } catch { return []; }
      })();
      const localWholesale = (() => {
        try {
          const raw = localStorage.getItem('gr_wholesale_ledger');
          return raw ? JSON.parse(raw) : [];
        } catch { return []; }
      })();
      const localCuban = (() => {
        try {
          const raw = localStorage.getItem('gr_cuban_estimates');
          return raw ? JSON.parse(raw) : [];
        } catch { return []; }
      })();

      const [scrapRes, retailRes, wholesaleRes, cubanRes] = await Promise.all([
        syncLocalToCloud('scrap_ledger', localScrap),
        syncLocalToCloud('retail_ledger', localRetail),
        syncLocalToCloud('wholesale_ledger', localWholesale),
        syncLocalToCloud('cuban_estimates', localCuban)
      ]);

      if (scrapRes.uploadedIds.length > 0) {
        const uploadedSet = new Set(scrapRes.uploadedIds);
        setScrapTransactions(prev => {
          const next = prev.map(t => uploadedSet.has(t.id) ? { ...t, syncPending: false } : t);
          safeSetLocalStorage('gr_scrap_ledger', next);
          return next;
        });
      }
      if (retailRes.uploadedIds.length > 0) {
        const uploadedSet = new Set(retailRes.uploadedIds);
        setRingQuoteTransactions(prev => {
          const next = prev.map(t => uploadedSet.has(t.id) ? { ...t, syncPending: false } : t);
          safeSetLocalStorage('gr_quote_ledger', next);
          return next;
        });
      }
      if (wholesaleRes.uploadedIds.length > 0) {
        const uploadedSet = new Set(wholesaleRes.uploadedIds);
        setWholesaleTransactions(prev => {
          const next = prev.map(t => uploadedSet.has(t.id) ? { ...t, syncPending: false } : t);
          safeSetLocalStorage('gr_wholesale_ledger', next);
          return next;
        });
      }
      if (cubanRes.uploadedIds.length > 0) {
        const uploadedSet = new Set(cubanRes.uploadedIds);
        setCubanEstimates(prev => {
          const next = prev.map(t => uploadedSet.has(t.id) ? { ...t, syncPending: false } : t);
          safeSetLocalStorage('gr_cuban_estimates', next);
          return next;
        });
      }

      const anyQuota = scrapRes.quotaExceeded || retailRes.quotaExceeded || wholesaleRes.quotaExceeded || cubanRes.quotaExceeded;
      const totalUploaded = scrapRes.uploadedCount + retailRes.uploadedCount + wholesaleRes.uploadedCount + cubanRes.uploadedCount;

      if (anyQuota) {
        showToast("Daily free cloud limit reached — your records are safely saved locally.", "info");
      } else if (totalUploaded === 0) {
        showToast("All records are already synced with the cloud!", "success");
      } else {
        showToast(`Synced ${totalUploaded} pending record${totalUploaded === 1 ? '' : 's'} to the cloud!`, "success");
      }
    } catch (err: any) {
      console.error("Manual sync failed:", err);
      if (isQuotaError(err)) {
        showToast("Daily free cloud limit reached — your records are safely saved locally.", "info");
      } else {
        const errMsg = err?.message || String(err);
        showToast(`Sync failed: ${errMsg.substring(0, 60)}`, "error");
      }
    } finally {
      setIsManualSyncing(false);
    }
  };

  // On-demand loader for older historical records beyond the default last-30 window
  const handleLoadOlderCloudRecords = async (type: 'retail' | 'wholesale' | 'scrap') => {
    if (loadingOlderCloud[type]) return;
    setLoadingOlderCloud(prev => ({ ...prev, [type]: true }));

    const collectionName = type === 'retail' ? 'retail_ledger' : type === 'wholesale' ? 'wholesale_ledger' : 'scrap_ledger';
    const storageKey = type === 'retail' ? 'gr_quote_ledger' : type === 'wholesale' ? 'gr_wholesale_ledger' : 'gr_scrap_ledger';

    try {
      const res = await fetchCollectionOnce(collectionName);
      if (res.quotaExceeded) {
        showToast("Daily free cloud read limit reached — older cloud history can be loaded once quota resets or plan is upgraded.", "info");
        return;
      }

      const validCloudDocs = res.docs.filter(d => d && d.id && !isDocumentDeleted(d.id));
      let addedCount = 0;

      const mergeAndSort = <T extends { id: string; syncPending?: boolean; timestamp?: any; date?: string }>(prev: T[]): T[] => {
        const byId = new Map<string, T>();
        for (const item of prev) {
          if (item && item.id && !isDocumentDeleted(item.id)) {
            byId.set(item.id, item);
          }
        }
        const beforeSize = byId.size;
        for (const cloudDoc of validCloudDocs) {
          const existing = byId.get(cloudDoc.id);
          if (existing && existing.syncPending) continue;
          byId.set(cloudDoc.id, cloudDoc as T);
        }
        addedCount = Math.max(0, byId.size - beforeSize);
        const sorted = Array.from(byId.values()).sort((a, b) => {
          const tA = a.timestamp || (a.date ? safeParseDate(a.date) : 0);
          const tB = b.timestamp || (b.date ? safeParseDate(b.date) : 0);
          return tB - tA;
        });
        safeSetLocalStorage(storageKey, sorted);
        return sorted;
      };

      if (type === 'retail') {
        setRingQuoteTransactions(prev => mergeAndSort<QuoteTransaction>(prev));
      } else if (type === 'wholesale') {
        setWholesaleTransactions(prev => mergeAndSort<QuoteTransaction>(prev));
      } else {
        setScrapTransactions(prev => mergeAndSort<ScrapTransaction>(prev));
      }

      setLoadedFullCloudHistory(prev => ({ ...prev, [type]: true }));
      if (addedCount > 0) {
        showToast(`Loaded ${addedCount} older record${addedCount === 1 ? '' : 's'} from cloud history!`, "success");
      } else {
        showToast("All cloud records for this ledger are already loaded.", "success");
      }
    } catch (err: any) {
      console.error("Failed loading older cloud records:", err);
      if (isQuotaError(err)) {
        showToast("Daily free cloud read limit reached — showing your local records.", "info");
      } else {
        showToast("Could not load older cloud records right now.", "error");
      }
    } finally {
      setLoadingOlderCloud(prev => ({ ...prev, [type]: false }));
    }
  };

  // Sketchpad trigger handlers
  const handleSketchSave = (dataUrl: string) => {
    const isWholesale = activeTab === 'wholesale';
    const onChange = isWholesale ? updateWholesaleSessionLocal : updateRetailSessionLocal;

    onChange(prev => ({
      ...prev,
      rings: prev.rings.map(r => {
        if (r.id === prev.activeSubTab) {
          const fieldSingle = editingImageType === 'sketch' ? 'referenceSketch' : 'referencePhoto';
          const fieldArr = editingImageType === 'sketch' ? 'referenceSketches' : 'referencePhotos';

          const currentArr = Array.isArray(r[fieldArr]) ? [...r[fieldArr]!] : (r[fieldSingle] ? [r[fieldSingle]!] : []);
          let updatedArr = [...currentArr];

          if (editingImageIndex !== null && editingImageIndex !== undefined && editingImageIndex >= 0 && editingImageIndex < currentArr.length) {
            updatedArr[editingImageIndex] = dataUrl;
          } else {
            updatedArr.push(dataUrl);
          }

          return {
            ...r,
            [fieldSingle]: updatedArr[0] || null,
            [fieldArr]: updatedArr
          };
        }
        return r;
      })
    }), true);

    setIsSketching(false);
    setEditingImageIndex(null);
  };

  // Active sketchpad image source loader
  const getActiveSketchSrc = (): string | null => {
    const isWholesale = activeTab === 'wholesale';
    const session = isWholesale ? wholesaleSession : retailSession;
    const ring = session.rings.find(r => r.id === session.activeSubTab);
    if (!ring) return null;

    const fieldSingle = editingImageType === 'sketch' ? 'referenceSketch' : 'referencePhoto';
    const fieldArr = editingImageType === 'sketch' ? 'referenceSketches' : 'referencePhotos';

    const currentArr = Array.isArray(ring[fieldArr]) ? ring[fieldArr]! : (ring[fieldSingle] ? [ring[fieldSingle]!] : []);

    if (editingImageIndex !== null && editingImageIndex !== undefined && editingImageIndex >= 0 && editingImageIndex < currentArr.length) {
      return currentArr[editingImageIndex];
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-100 text-brand-800 flex flex-col font-sans selection:bg-brand-gold selection:text-brand-900 pb-12">
      
      {/* Print-blocking iframe warning banner */}
      {isIframe && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs py-2.5 px-4 font-sans flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn print:hidden shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-brand-gold shrink-0 animate-pulse" />
            <span>
              <strong>Safari/iPad Print Block:</strong> Browsers block or freeze when printing inside website frames. Open the app in a <strong>New Tab</strong> to print <strong>instantly</strong> with zero delay! (Live sync preserves all your changes).
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              playClickSound('click');
              window.open(window.location.href, '_blank');
            }}
            className="bg-brand-gold hover:bg-brand-400 text-brand-950 font-black px-4 py-1.5 rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm shrink-0 border border-brand-300 cursor-pointer"
          >
            <ExternalLink size={11} />
            Open in New Tab
          </button>
        </div>
      )}

      {/* 1. TOP BRANDING NAV HEADER */}
      <header className="bg-brand-900 text-white shadow-md border-b border-brand-800 py-4 px-6 sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-brand-gold text-brand-900 p-2 rounded-xl shadow-md rotate-3 font-serif italic text-lg font-black">
              G&R
            </div>
            <div>
              <h1 className="font-serif italic font-black text-xl tracking-wide text-brand-gold">Gold & Rose Jewellery Corp</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-brand-300 font-mono tracking-widest uppercase">Executive Dashboard Suite</p>
                {isCloudSynced ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[8px] px-1.5 py-0.5 rounded-md font-mono font-bold tracking-wider uppercase scale-90 origin-left">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Cloud Sync
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-950/80 text-amber-400 border border-amber-800 text-[8px] px-1.5 py-0.5 rounded-md font-mono font-bold tracking-wider uppercase scale-90 origin-left">
                    <span className="w-1 h-1 rounded-full bg-amber-400 animate-bounce"></span>
                    Syncing...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SPOT BAR & SETTINGS BUTTON */}
          <div className="flex items-center justify-between md:justify-end gap-3.5 w-full md:w-auto">
            <div className="flex flex-wrap items-center gap-3 bg-brand-950 px-4 py-2 rounded-2xl border border-brand-800 text-xs font-mono">
              <div className="flex gap-4 text-brand-200">
                <div>AU: <span className="text-brand-gold font-bold">${spotPrices.gold.toFixed(2)}</span></div>
                <div>AG: <span className="text-brand-gold font-bold">${spotPrices.silver.toFixed(2)}</span></div>
                <div>PT: <span className="text-brand-gold font-bold">${spotPrices.platinum.toFixed(2)}</span></div>
              </div>
              <button
                type="button"
                onClick={fetchLivePrices}
                className="bg-brand-900 hover:bg-brand-850 border border-brand-800 p-1.5 rounded-lg text-brand-gold transition-all shrink-0"
                title="Sync CAD GoldAPI spot rates"
              >
                <RefreshCw size={12} className={syncStatus === "Syncing..." ? "animate-spin" : ""} />
              </button>
              {syncStatus && <span className="text-[9px] text-brand-400 font-bold uppercase hidden sm:inline">{syncStatus}</span>}
            </div>

            {window.self !== window.top && (
              <button
                type="button"
                onClick={() => {
                  playClickSound('click');
                  window.open(window.location.href, '_blank');
                }}
                className="bg-brand-gold text-brand-950 hover:bg-brand-400 font-bold px-3 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shrink-0 border border-brand-300 cursor-pointer"
                title="Open app in a separate browser tab to print instantly without iPad delay"
              >
                <ExternalLink size={14} />
                <span className="hidden sm:inline">Open in New Tab</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              title="Master Parameters"
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center shadow-md border shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-brand-gold text-brand-900 border-brand-gold shadow-lg shadow-brand-gold/10'
                  : 'bg-brand-800 text-brand-gold border-brand-700 hover:bg-brand-750'
              }`}
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN HUB MODULE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Floating Quick spot weight metal calculator desk */}
        {activeTab === 'scrap' && (
          <div className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm flex flex-wrap gap-4 items-center justify-between print:hidden">
            <div className="flex items-center gap-2 text-brand-700">
              <Scale size={16} className="text-brand-gold" />
              <span className="text-xs font-black uppercase tracking-wider">Quick Spot Weight Estimator</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="number"
                placeholder="Grams (g)"
                className="bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-xl text-xs font-bold no-spinner w-24"
                value={quickGrams}
                onChange={(e) => setQuickGrams(e.target.value)}
              />
              <select
                className="bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-xl text-xs font-bold w-28 outline-none"
                value={quickPurity}
                onChange={(e) => setQuickPurity(e.target.value)}
              >
                <option value="gold_10">Gold 10k</option>
                <option value="gold_14">Gold 14k</option>
                <option value="gold_18">Gold 18k</option>
                <option value="gold_19">Gold 19k</option>
                <option value="gold_22">Gold 22k</option>
                <option value="gold_24">Gold 24k</option>
                <option value="silver_0.925">Silver 92.5%</option>
                <option value="silver_0.999">Silver 99.9%</option>
                <option value="platinum_0.95">Platinum 95%</option>
              </select>
              <div className="bg-green-50 text-green-700 px-4 py-1.5 rounded-xl border border-green-200 font-mono text-xs font-black flex items-center gap-1">
                <span>Value:</span>
                <span>CAD ${computeQuickEstimate()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Global tab rails */}
        <div className="flex overflow-x-auto hide-scrollbar whitespace-nowrap gap-1.5 border-b border-brand-200 pb-2 print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('scrap')}
            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm border ${activeTab === 'scrap' ? 'bg-brand-900 text-brand-gold border-brand-900' : 'bg-white text-brand-600 border-brand-100 hover:border-brand-300'}`}
          >
            <Coins size={14} />
            Scrap Buyback
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quote')}
            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm border ${activeTab === 'quote' ? 'bg-brand-900 text-brand-gold border-brand-900' : 'bg-white text-brand-600 border-brand-100 hover:border-brand-300'}`}
          >
            <FileCheck size={14} />
            Retail Custom Quote
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('spot')}
            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm border ${activeTab === 'spot' ? 'bg-brand-900 text-brand-gold border-brand-900' : 'bg-white text-brand-600 border-brand-100 hover:border-brand-300'}`}
          >
            <Coins size={14} />
            Spot Price Desk
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wholesale')}
            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm border ${activeTab === 'wholesale' ? 'bg-brand-900 text-brand-gold border-brand-900' : 'bg-white text-brand-600 border-brand-100 hover:border-brand-300'}`}
          >
            <Landmark size={14} />
            Wholesale
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cuban')}
            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm border ${activeTab === 'cuban' ? 'bg-brand-900 text-brand-gold border-brand-900' : 'bg-white text-brand-600 border-brand-100 hover:border-brand-300'}`}
          >
            <Sparkles size={14} className="text-brand-gold shrink-0" />
            Handmade Cubans
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('jumpring')}
            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm border ${activeTab === 'jumpring' ? 'bg-brand-900 text-brand-gold border-brand-900' : 'bg-white text-brand-600 border-brand-100 hover:border-brand-300'}`}
          >
            <CircleDot size={14} className="text-amber-500 shrink-0" />
            Jump Ring Estimator
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm border ${activeTab === 'ledger' ? 'bg-brand-900 text-brand-gold border-brand-900' : 'bg-white text-brand-600 border-brand-100 hover:border-brand-300'}`}
          >
            <Library size={14} />
            Ledger histories
          </button>
        </div>

        {/* ACTIVE MODULE CONTAINER */}
        <div className="min-h-[500px]">
          <div className={activeTab === 'scrap' ? "" : "hidden"}>
            <ScrapCalculator
              spotPrices={spotPrices}
              onUpdateSpotPrices={setSpotPrices}
              onSaveTransaction={handleSaveScrap}
              syncStatus={syncStatus}
              onFetchLivePrices={fetchLivePrices}
              editingTransaction={editingScrapTx}
              onCancelEdit={() => setEditingScrapTx(null)}
              onTriggerPrint={handleTriggerPrint}
              isIframe={isIframe}
              settings={settings}
            />
          </div>

          <div className={activeTab === 'spot' ? "" : "hidden"}>
            <SpotPriceView
              spotPrices={spotPrices}
              onUpdateSpotPrices={setSpotPrices}
              syncStatus={syncStatus}
              onFetchLivePrices={fetchLivePrices}
            />
          </div>

          <div className={activeTab === 'jumpring' ? "" : "hidden"}>
            <JumpRingEstimator
              spotPrices={spotPrices}
              settings={settings}
              onTriggerPrint={handleTriggerPrint}
              isIframe={isIframe}
              showToast={showToast}
            />
          </div>

          <div className={activeTab === 'cuban' ? "" : "hidden"}>
            <CubanBraceletBuilder
              spotPrices={spotPrices}
              settings={settings}
              estimates={cubanEstimates}
              onSaveEstimate={async (newEst) => {
                const estWithSync = { ...newEst, syncPending: true };
                const updated = [estWithSync, ...cubanEstimates.filter(e => e.id !== newEst.id)];
                setCubanEstimates(updated);
                safeSetLocalStorage('gr_cuban_estimates', updated);
                try {
                  const syncRes = await saveDocument('cuban_estimates', estWithSync.id, estWithSync);
                  if (syncRes && !syncRes.offline && !syncRes.quotaExceeded) {
                    setCubanEstimates(prev => {
                      const next = prev.map(e => e.id === estWithSync.id ? { ...e, syncPending: false } : e);
                      safeSetLocalStorage('gr_cuban_estimates', next);
                      return next;
                    });
                    playClickSound('success');
                    showToast("Cuban estimate saved and synced to cloud ledger!", "success");
                  } else {
                    playClickSound('success');
                    showToast("Cuban estimate saved locally (cloud sync queued)!", "info");
                  }
                } catch (err) {
                  console.error("Cloud sync failed on Cuban save:", err);
                  showToast("Cuban estimate saved locally (sync pending)!", "info");
                }
              }}
              onDeleteEstimate={async (id) => {
                if (!window.confirm("Permanently delete this Cuban estimate?")) return;
                const updated = cubanEstimates.filter(e => e.id !== id);
                setCubanEstimates(updated);
                safeSetLocalStorage('gr_cuban_estimates', updated);
                try {
                  await deleteDocument('cuban_estimates', id);
                  playClickSound('click');
                  showToast("Cuban estimate deleted successfully!", "success");
                } catch (err) {
                  console.error("Cloud delete failed:", err);
                  showToast("Estimate deleted locally (delete pending)!", "info");
                }
              }}
            />
          </div>

          <div className={activeTab === 'quote' ? "" : "hidden"}>
            <QuoteCalculator
              session={retailSession}
              onChangeSession={updateRetailSessionLocal}
              onSaveQuote={() => handleSaveQuote(false, true)}
              onSaveQuoteNoReset={() => handleSaveQuote(false, false)}
              onLaunchSketch={(type, index = null) => {
                setEditingImageType(type);
                setEditingImageIndex(index);
                setIsSketching(true);
              }}
              settings={settings}
              spotPrices={spotPrices}
              isWholesale={false}
              scrapTransactions={scrapTransactions}
              onTriggerPrint={handleTriggerPrint}
              isIframe={isIframe}
            />
          </div>

          <div className={activeTab === 'wholesale' ? "" : "hidden"}>
            <QuoteCalculator
              session={wholesaleSession}
              onChangeSession={updateWholesaleSessionLocal}
              onSaveQuote={() => handleSaveQuote(true, true)}
              onSaveQuoteNoReset={() => handleSaveQuote(true, false)}
              onLaunchSketch={(type, index = null) => {
                setEditingImageType(type);
                setEditingImageIndex(index);
                setIsSketching(true);
              }}
              settings={settings}
              spotPrices={spotPrices}
              isWholesale={true}
              scrapTransactions={scrapTransactions}
              onTriggerPrint={handleTriggerPrint}
              isIframe={isIframe}
            />
          </div>

          <div className={activeTab === 'ledger' ? "" : "hidden"}>
            <LedgerView
              scrapTransactions={scrapTransactions}
              ringQuoteTransactions={ringQuoteTransactions}
              wholesaleTransactions={wholesaleTransactions}
              onDeleteTransaction={handleDeleteLedgerItem}
              onLoadIntoEditor={handleLoadQuote}
              onLoadScrapIntoEditor={handleLoadScrap}
              onApplyScrapToQuote={handleApplyScrapToQuote}
              settings={settings}
              spotPrices={spotPrices}
              onAddDemoTransaction={handleCreateDemoTransaction}
              onTriggerPrint={handleTriggerPrint}
              isIframe={isIframe}
              onRefreshLedger={handleManualSync}
              isSyncingLedger={isManualSyncing}
              onLoadOlderRecords={handleLoadOlderCloudRecords}
              loadedFullCloudHistory={loadedFullCloudHistory}
              loadingOlderCloud={loadingOlderCloud}
            />
          </div>

          <div className={activeTab === 'settings' ? "" : "hidden"}>
            <SettingsView
              settings={settings}
              onSaveSettings={handleSaveSettings}
              goldApiKey={goldApiKey}
              onSaveApiKey={(key) => { 
                const trimmed = key.trim(); 
                setGoldApiKey(trimmed); 
                saveDocument('app_settings', 'gold_api_key', { key: trimmed }).catch(err => {
                  console.warn("Could not sync gold_api_key to cloud, saved locally:", err?.message || err);
                }); 
              }}
              onExportCsv={handleExportCsv}
              onClearHistory={handleClearHistory}
              spotPrices={spotPrices}
              onUpdateSpotPrices={setSpotPrices}
              onNotifyLocalChange={() => { lastLocalChangeTimeRef.current = Date.now(); }}
              scrapTransactions={scrapTransactions}
              ringQuoteTransactions={ringQuoteTransactions}
              wholesaleTransactions={wholesaleTransactions}
              cubanEstimates={cubanEstimates}
              onDeleteWholesaleProfile={handleDeleteWholesaleProfile}
            />
          </div>
        </div>
      </main>

      {/* 3. INTERACTIVE GEOMETRIC SKETCHPAD & PHOTO EDITOR OVERLAY */}
      {isSketching && (
        <Sketchpad
          initialImage={getActiveSketchSrc()}
          onSave={handleSketchSave}
          onCancel={() => {
            setIsSketching(false);
            setEditingImageIndex(null);
          }}
          title={editingImageType === 'photo' ? "Reference Photo" : "Interactive Design Sketchpad"}
        />
      )}

      {/* 4. IPAD PRINT OPTIMIZATION MODAL */}
      {showIframePrintDialog && (
        <div className="fixed inset-0 bg-brand-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn print:hidden">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-brand-100 flex flex-col relative text-center">
            <button
              type="button"
              onClick={() => {
                playClickSound('click');
                setShowIframePrintDialog(false);
                setPendingPrintFn(null);
              }}
              className="absolute top-4 right-4 text-brand-400 hover:text-brand-700 p-1 cursor-pointer container-close-btn"
            >
              <X size={20} />
            </button>

            <div className="mx-auto bg-amber-50 text-brand-gold p-3 rounded-2xl mb-4 border border-amber-100 w-12 h-12 flex items-center justify-center">
              <Printer size={24} className="text-brand-gold animate-bounce" />
            </div>

            <h3 className="font-serif text-lg font-bold italic text-brand-900 mb-2">
              Bypass iPad Print Block
            </h3>
            
            <p className="text-xs text-brand-600 mb-6 leading-relaxed">
              Safari on iPad blocks and delays printing from inside website frames, showing the warning <strong>"website has been blocked from automatically printing"</strong>.
              <br /><br />
              Since your Gold & Rose app features <strong>Live Cloud Sync</strong>, your calculations are saved instantly. Simply open the app in a standalone tab to print with zero delay!
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  playClickSound('click');
                  window.open(window.location.href, '_blank');
                  setShowIframePrintDialog(false);
                  setPendingPrintFn(null);
                }}
                className="w-full bg-brand-gold hover:bg-brand-400 text-brand-950 font-black py-3.5 px-6 rounded-xl text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all border border-brand-300"
              >
                <ExternalLink size={14} />
                Open in New Tab & Print Flawlessly
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound('click');
                  setShowIframePrintDialog(false);
                  setPendingPrintFn(null);
                }}
                className="w-full bg-brand-50 hover:bg-brand-100 text-brand-800 font-bold py-3 px-6 rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer border border-brand-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. LUXURIOUS NON-BLOCKING TOAST NOTIFICATION OVERLAY */}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] animate-fadeIn print:hidden">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-xs font-black uppercase tracking-wider transition-all duration-300 ${
            toast.type === 'error' 
              ? 'bg-red-50 border-red-200 text-red-800' 
              : toast.type === 'info'
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <span className="w-2 h-2 rounded-full animate-pulse bg-current" />
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
