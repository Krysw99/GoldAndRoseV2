/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Coins, FileCheck, Landmark, Library, Settings, RefreshCw, 
  HelpCircle, Sparkles, Scale, Info, AlertCircle, ExternalLink, Printer, X 
} from 'lucide-react';

// Types & Constants
import { 
  QuoteSession, ScrapTransaction, QuoteTransaction, AppSettings, 
  ScrapItem, JewelryItem 
} from './types';
import { DEFAULT_SETTINGS, TROY_ONCE_GRAMS, FANCY_SHAPES, ROUND_MELEE } from './constants';
import { getEmptyQuoteSession, upgradeRingData, calculateRingCost, getDemoQuoteSession, safeSetLocalStorage, safeParseDate } from './utils';

// Modular Components
import ScrapCalculator from './components/ScrapCalculator';
import QuoteCalculator from './components/QuoteCalculator';
import LedgerView from './components/LedgerView';
import SettingsView from './components/SettingsView';
import Sketchpad from './components/Sketchpad';
import SpotPriceView from './components/SpotPriceView';
import CubanBraceletBuilder from './components/CubanBraceletBuilder';
import WholesaleRepairView from './components/WholesaleRepairView';

// Firebase cloud sync helpers
import { listenCollection, saveDocument, deleteDocument, syncLocalToCloud } from './firebase';

// Tactile Click Audio Feedback Utility
import { playClickSound } from './utils/audio';

export default function App() {
  // iPad specific cross-origin iframe check (for print optimization)
  const isIframe = window.self !== window.top;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'scrap' | 'quote' | 'wholesale' | 'spot' | 'cuban' | 'ledger' | 'settings'>('scrap');

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
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Active custom quote sessions
  const [retailSession, setRetailSession] = useState<QuoteSession>(() => {
    try {
      const raw = localStorage.getItem('gr_active_retail_session');
      return raw ? JSON.parse(raw) : getEmptyQuoteSession();
    } catch {
      return getEmptyQuoteSession();
    }
  });
  const [wholesaleSession, setWholesaleSession] = useState<QuoteSession>(() => {
    try {
      const raw = localStorage.getItem('gr_active_wholesale_session');
      return raw ? JSON.parse(raw) : getEmptyQuoteSession();
    } catch {
      return getEmptyQuoteSession();
    }
  });

  // Real-time synchronization refs and helpers for in-progress quote calculators
  const lastRetailLocalChangeTimeRef = useRef<number>(0);
  const lastWholesaleLocalChangeTimeRef = useRef<number>(0);
  const retailSaveTimeoutRef = useRef<any>(null);
  const wholesaleSaveTimeoutRef = useRef<any>(null);

  const syncRetailSessionImmediately = (session: QuoteSession) => {
    if (retailSaveTimeoutRef.current) clearTimeout(retailSaveTimeoutRef.current);
    saveDocument('app_settings', 'active_retail_session', session);
  };

  const syncWholesaleSessionImmediately = (session: QuoteSession) => {
    if (wholesaleSaveTimeoutRef.current) clearTimeout(wholesaleSaveTimeoutRef.current);
    saveDocument('app_settings', 'active_wholesale_session', session);
  };

  const saveRetailSessionDebounced = (session: QuoteSession) => {
    if (retailSaveTimeoutRef.current) clearTimeout(retailSaveTimeoutRef.current);
    retailSaveTimeoutRef.current = setTimeout(() => {
      saveDocument('app_settings', 'active_retail_session', session);
    }, 1500);
  };

  const saveWholesaleSessionDebounced = (session: QuoteSession) => {
    if (wholesaleSaveTimeoutRef.current) clearTimeout(wholesaleSaveTimeoutRef.current);
    wholesaleSaveTimeoutRef.current = setTimeout(() => {
      saveDocument('app_settings', 'active_wholesale_session', session);
    }, 1500);
  };

  const updateRetailSessionLocal = (newSessionOrUpdater: QuoteSession | ((prev: QuoteSession) => QuoteSession), immediate = false) => {
    lastRetailLocalChangeTimeRef.current = Date.now();
    setRetailSession(prev => {
      const next = typeof newSessionOrUpdater === 'function' ? newSessionOrUpdater(prev) : newSessionOrUpdater;
      safeSetLocalStorage('gr_active_retail_session', next);
      if (immediate) {
        syncRetailSessionImmediately(next);
      } else {
        saveRetailSessionDebounced(next);
      }
      return next;
    });
  };

  const updateWholesaleSessionLocal = (newSessionOrUpdater: QuoteSession | ((prev: QuoteSession) => QuoteSession), immediate = false) => {
    lastWholesaleLocalChangeTimeRef.current = Date.now();
    setWholesaleSession(prev => {
      const next = typeof newSessionOrUpdater === 'function' ? newSessionOrUpdater(prev) : newSessionOrUpdater;
      safeSetLocalStorage('gr_active_wholesale_session', next);
      if (immediate) {
        syncWholesaleSessionImmediately(next);
      } else {
        saveWholesaleSessionDebounced(next);
      }
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

  // Load remaining fast-parsing keys on initialization
  useEffect(() => {
    isLoadedRef.current = true;
    setIsPersistenceLoaded(true);
  }, []);

  // Shared helper to apply master settings from Firebase cloud updates
  const applyCloudSettings = (cleanMasterDoc: any) => {
    const cloudSettingsStr = JSON.stringify(cleanMasterDoc);
    lastCloudSettingsRef.current = cloudSettingsStr;
    
    setSettings(prev => {
      const cloudProfiles = cleanMasterDoc.wholesaleProfiles || prev.wholesaleProfiles || [];
      const merged = {
        ...prev,
        ...cleanMasterDoc,
        wholesale: { ...prev.wholesale, ...(cleanMasterDoc.wholesale || {}) },
        wholesaleProfiles: cloudProfiles,
        centerStoneRates: { ...prev.centerStoneRates, ...(cleanMasterDoc.centerStoneRates || {}) },
        centerStoneRawRates: { ...prev.centerStoneRawRates, ...(cleanMasterDoc.centerStoneRawRates || {}) },
        cubanMultipliers: cleanMasterDoc.cubanMultipliers || prev.cubanMultipliers,
        tennisMultipliers: cleanMasterDoc.tennisMultipliers || prev.tennisMultipliers,
      };
      
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
    // Sync to cloud Firestore immediately on manual save/profile operations
    saveDocument('app_settings', 'master', newSettings);
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

    const runSyncAndListen = async () => {
      try {
        console.log("Starting server synchronization...");

        if (!active) return;

        // Sync any offline local items to cloud on boot
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

        await Promise.all([
          syncLocalToCloud('scrap_ledger', localScrap),
          syncLocalToCloud('retail_ledger', localRetail),
          syncLocalToCloud('wholesale_ledger', localWholesale),
          syncLocalToCloud('cuban_estimates', localCuban)
        ]).catch(err => {
          console.warn("Offline local-to-cloud sync warning:", err);
        });

        // 1. Set up real-time listener for Scrap Buyback Ledger
        unsubScrap = listenCollection('scrap_ledger', (docs) => {
          if (!active) return;
          const cloudIds = new Set(docs.map(d => d.id));
          const localItems = (() => {
            try {
              const raw = localStorage.getItem('gr_scrap_ledger');
              return raw ? JSON.parse(raw) : [];
            } catch { return []; }
          })();
          
          const merged = [...docs];
          const fifteenMinutes = 15 * 60 * 1000;
          for (const localItem of localItems) {
            if (localItem && localItem.id && !cloudIds.has(localItem.id)) {
              const localTime = localItem.timestamp || (localItem.date ? safeParseDate(localItem.date) : Date.now());
              const ageMs = Date.now() - localTime;
              if (ageMs < fifteenMinutes) {
                merged.push(localItem);
              }
            }
          }

          const sorted = merged.sort((a, b) => {
            const tA = a.timestamp || (a.date ? safeParseDate(a.date) : 0);
            const tB = b.timestamp || (b.date ? safeParseDate(b.date) : 0);
            return tB - tA; // Newest first
          });
          setScrapTransactions(sorted);
          safeSetLocalStorage('gr_scrap_ledger', sorted);
        });

        // 2. Set up real-time listener for Retail Quote Ledger
        unsubRetail = listenCollection('retail_ledger', (docs) => {
          if (!active) return;
          const cloudIds = new Set(docs.map(d => d.id));
          const localItems = (() => {
            try {
              const raw = localStorage.getItem('gr_quote_ledger');
              return raw ? JSON.parse(raw) : [];
            } catch { return []; }
          })();

          const merged = [...docs];
          const fifteenMinutes = 15 * 60 * 1000;
          for (const localItem of localItems) {
            if (localItem && localItem.id && !cloudIds.has(localItem.id)) {
              const localTime = localItem.timestamp || (localItem.date ? safeParseDate(localItem.date) : Date.now());
              const ageMs = Date.now() - localTime;
              if (ageMs < fifteenMinutes) {
                merged.push(localItem);
              }
            }
          }

          const sorted = merged.sort((a, b) => {
            const tA = a.timestamp || (a.date ? safeParseDate(a.date) : 0);
            const tB = b.timestamp || (b.date ? safeParseDate(b.date) : 0);
            return tB - tA; // Newest first
          });
          setRingQuoteTransactions(sorted);
          safeSetLocalStorage('gr_quote_ledger', sorted);
        });

        // 3. Set up real-time listener for Wholesale Ledger
        unsubWholesale = listenCollection('wholesale_ledger', (docs) => {
          if (!active) return;
          const cloudIds = new Set(docs.map(d => d.id));
          const localItems = (() => {
            try {
              const raw = localStorage.getItem('gr_wholesale_ledger');
              return raw ? JSON.parse(raw) : [];
            } catch { return []; }
          })();

          const merged = [...docs];
          const fifteenMinutes = 15 * 60 * 1000;
          for (const localItem of localItems) {
            if (localItem && localItem.id && !cloudIds.has(localItem.id)) {
              const localTime = localItem.timestamp || (localItem.date ? safeParseDate(localItem.date) : Date.now());
              const ageMs = Date.now() - localTime;
              if (ageMs < fifteenMinutes) {
                merged.push(localItem);
              }
            }
          }

          const sorted = merged.sort((a, b) => {
            const tA = a.timestamp || (a.date ? safeParseDate(a.date) : 0);
            const tB = b.timestamp || (b.date ? safeParseDate(b.date) : 0);
            return tB - tA; // Newest first
          });
          setWholesaleTransactions(sorted);
          safeSetLocalStorage('gr_wholesale_ledger', sorted);
        });

        // 4. Set up real-time listener for Cuban Estimates
        unsubCuban = listenCollection('cuban_estimates', (docs) => {
          if (!active) return;
          const cloudIds = new Set(docs.map(d => d.id));
          const localItems = (() => {
            try {
              const raw = localStorage.getItem('gr_cuban_estimates');
              return raw ? JSON.parse(raw) : [];
            } catch { return []; }
          })();

          const merged = [...docs];
          const fifteenMinutes = 15 * 60 * 1000;
          for (const localItem of localItems) {
            if (localItem && localItem.id && !cloudIds.has(localItem.id)) {
              const localTime = localItem.timestamp ? new Date(localItem.timestamp).getTime() : Date.now();
              const ageMs = Date.now() - localTime;
              if (ageMs < fifteenMinutes) {
                merged.push(localItem);
              }
            }
          }

          const sorted = merged.sort((a, b) => {
            const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return tB - tA;
          });
          setCubanEstimates(sorted);
          safeSetLocalStorage('gr_cuban_estimates', sorted);
        });

                  // 5. Set up real-time listener for Master App Settings (including Wholesale Client Profiles and Google API key)
         unsubSettings = listenCollection('app_settings', (docs) => {
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

           const retailDoc = docs.find(d => d.id === 'active_retail_session');
           if (retailDoc) {
             const cleanRetail = { ...retailDoc };
             delete cleanRetail.id;
             const timeSinceLocalChange = Date.now() - lastRetailLocalChangeTimeRef.current;
             if (timeSinceLocalChange >= 2500) {
               setRetailSession(cleanRetail as QuoteSession);
               safeSetLocalStorage('gr_active_retail_session', cleanRetail as QuoteSession);
             }
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
         });

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
      if (unsubCuban) unsubCuban();
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
      stoneRemovalQty: string;
      items: ScrapItem[];
      image: string | null;
      signature: string | null;
    },
    existingId?: string
  ): ScrapTransaction => {
    const logStr = data.items.map(i => `${i.weight}g ${i.material} (${i.purity}${i.material==='gold'?'k':''})`).join(', ');
    const totalVal = data.items.reduce((total, item) => {
      const w = parseFloat(item.weight) || 0;
      const s = (spotPrices[item.material] || 0) / TROY_ONCE_GRAMS;
      const pf = item.material === 'gold' ? item.purity / 24 : item.purity;
      return total + (w * pf * s * (item.rate / 100));
    }, 0);
    const finalTotal = Math.max(0, totalVal - (Number(data.stoneRemovalQty || 0) * 5)).toFixed(2);

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
        stoneRemovalQty: data.stoneRemovalQty,
        spotPrices: original ? original.spotPrices : { ...spotPrices },
        items: data.items,
        summary: logStr,
        total: finalTotal,
        image: data.image,
        signature: data.signature
      };

      setScrapTransactions(prev => {
        const updated = prev.map(t => t.id === existingId ? updatedTx : t);
        localStorage.setItem('gr_scrap_ledger', JSON.stringify(updated));
        return updated;
      });

      // Sync to cloud Firestore with callbacks
      saveDocument('scrap_ledger', existingId, updatedTx)
        .then(() => {
          playClickSound('success');
          showToast("Scrap payout adjusted and synced to cloud ledger!", "success");
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
        stoneRemovalQty: data.stoneRemovalQty,
        spotPrices: { ...spotPrices },
        items: data.items,
        summary: logStr,
        total: finalTotal,
        image: data.image,
        signature: data.signature
      };

      setScrapTransactions(prev => {
        const updated = [newTx, ...prev];
        localStorage.setItem('gr_scrap_ledger', JSON.stringify(updated));
        return updated;
      });

      // Sync to cloud Firestore with callbacks
      saveDocument('scrap_ledger', newTx.id, newTx)
        .then(() => {
          playClickSound('success');
          showToast("Scrap payout logged and synced to cloud ledger!", "success");
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
    const sum = activeSession.rings.map(r => `${l[r.category] || 'Item'}: ${r.goldGrams || 'Est'}g`).join(' | ') || (isWholesale ? "Wholesale Contract" : "Retail Consultation");

    // Recalculate accurate final sum
    let gT = 0;
    let tD = 0;
    activeSession.rings.forEach(r => {
      const cost = calculateRingCost(r, settings, spotPrices, isWholesale ? 'wholesale' : 'retail', activeSession.overridePrices, isWholesale ? activeSession.wholesaleProfileId : undefined);
      gT += cost;
      const val = parseFloat(r.discount) || 0;
      tD += r.discountType === '%' ? cost * (val / 100) : val;
    });

    // Subtotal subtraction scrap
    const sub = Math.max(0, gT - tD - Number(activeSession.scrapCredit));
    const finalInvoiceAmount = sub + (activeSession.applyTax ? sub * 0.12 : 0);

    const nameToLog = activeSession.cName || (activeSession.jobNum ? `Job #${activeSession.jobNum}` : 'Wholesale Client');

    const list = isWholesale ? wholesaleTransactions : ringQuoteTransactions;
    const existingTx = list.find(q => q.id === activeSession.id);

    const newTx: QuoteTransaction = {
      id: activeSession.id,
      date: existingTx ? existingTx.date : new Date().toLocaleString(),
      timestamp: existingTx ? (existingTx.timestamp || Date.now()) : Date.now(),
      name: nameToLog,
      phone: activeSession.cPhone,
      summary: sum,
      total: `$${finalInvoiceAmount.toFixed(2)}`,
      fullData: JSON.parse(JSON.stringify(activeSession)),
      isWholesale
    };

    if (isWholesale) {
      const idx = wholesaleTransactions.findIndex(q => q.id === activeSession.id);
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
        await saveDocument('wholesale_ledger', newTx.id, newTx);
        if (resetSessionAfterSave) {
          updateWholesaleSessionLocal(getEmptyQuoteSession(), true);
        }
        playClickSound('success');
        showToast("Wholesale job order successfully saved and synced!", "success");
      } catch (err) {
        console.error("Cloud sync failed on wholesale save:", err);
        if (resetSessionAfterSave) {
          updateWholesaleSessionLocal(getEmptyQuoteSession(), true);
        }
        playClickSound('success');
        showToast("Job order saved locally (sync pending/offline)!", "info");
      }
    } else {
      const idx = ringQuoteTransactions.findIndex(q => q.id === activeSession.id);
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
        await saveDocument('retail_ledger', newTx.id, newTx);
        if (resetSessionAfterSave) {
          updateRetailSessionLocal(getEmptyQuoteSession(), true);
        }
        playClickSound('success');
        showToast("Retail custom quote saved and synced successfully!", "success");
      } catch (err) {
        console.error("Cloud sync failed on retail save:", err);
        if (resetSessionAfterSave) {
          updateRetailSessionLocal(getEmptyQuoteSession(), true);
        }
        playClickSound('success');
        showToast("Quote saved locally (sync pending/offline)!", "info");
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
    const bg = (smm * 5) + 1;
    const lm = parseFloat(String(r.tbLength || 7.0)) / 7.0;
    return { estStones: Math.round(bs * lm), caratPerStone: cps };
  };

  // Loader into Active Calculator Editors
  const handleLoadQuote = (id: string, isWholesale: boolean) => {
    const list = isWholesale ? wholesaleTransactions : ringQuoteTransactions;
    const item = list.find(q => q.id === id);
    if (!item) return;

    const fullData = JSON.parse(JSON.stringify(item.fullData)) as QuoteSession;
    fullData.rings = fullData.rings.map(upgradeRingData);

    if (isWholesale) {
      updateWholesaleSessionLocal(fullData, true);
      setActiveTab('wholesale');
    } else {
      updateRetailSessionLocal(fullData, true);
      setActiveTab('quote');
    }
  };

  const handleLoadScrap = (id: string) => {
    const item = scrapTransactions.find(t => t.id === id);
    if (!item) return;

    setEditingScrapTx(item);
    setActiveTab('scrap');
  };

  // Exporters
  const handleExportCsv = (type: 'scrap' | 'retail' | 'wholesale') => {
    let csv = "";
    if (type === 'scrap') {
      csv = "ID,Date,Name,Phone,Summary,Total paid\n";
      scrapTransactions.forEach(t => {
        csv += `"${t.id}","${t.date}","${t.name}","${t.phone}","${t.summary.replace(/"/g, '""')}","${t.total}"\n`;
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
  const handleClearHistory = (range: 'all' | '365' | 'custom', startDate?: string, endDate?: string) => {
    let fS = [...scrapTransactions];
    let fR = [...ringQuoteTransactions];
    let fW = [...wholesaleTransactions];

    if (range === 'all') {
      fS = [];
      fR = [];
      fW = [];
    } else if (range === '365') {
      const cut = new Date();
      cut.setDate(cut.getDate() - 365);
      fS = scrapTransactions.filter(t => new Date(t.date) > cut);
      fR = ringQuoteTransactions.filter(t => new Date(t.date) > cut);
      fW = wholesaleTransactions.filter(t => new Date(t.date) > cut);
    } else if (range === 'custom' && startDate && endDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);

      const filterByDate = (txList: any[]) => txList.filter(tx => {
        const d = new Date(tx.date);
        return d < s || d > e;
      });

      fS = filterByDate(scrapTransactions);
      fR = filterByDate(ringQuoteTransactions);
      fW = filterByDate(wholesaleTransactions);
    }

    setScrapTransactions(fS);
    setRingQuoteTransactions(fR);
    setWholesaleTransactions(fW);

    localStorage.setItem('gr_scrap_ledger', JSON.stringify(fS));
    localStorage.setItem('gr_quote_ledger', JSON.stringify(fR));
    localStorage.setItem('gr_wholesale_ledger', JSON.stringify(fW));
  };

  const handleDeleteLedgerItem = (type: 'scrap' | 'retail' | 'wholesale', id: string) => {
    if (!window.confirm("Permanently delete this transaction record?")) return;

    if (type === 'scrap') {
      setScrapTransactions(prev => {
        const updated = prev.filter(t => t.id !== id);
        localStorage.setItem('gr_scrap_ledger', JSON.stringify(updated));
        return updated;
      });
      deleteDocument('scrap_ledger', id);
    } else if (type === 'retail') {
      setRingQuoteTransactions(prev => {
        const updated = prev.filter(t => t.id !== id);
        localStorage.setItem('gr_quote_ledger', JSON.stringify(updated));
        return updated;
      });
      deleteDocument('retail_ledger', id);
    } else {
      setWholesaleTransactions(prev => {
        const updated = prev.filter(t => t.id !== id);
        localStorage.setItem('gr_wholesale_ledger', JSON.stringify(updated));
        return updated;
      });
      deleteDocument('wholesale_ledger', id);
    }
  };

  const handleCreateDemoTransaction = () => {
    const demoSession = getDemoQuoteSession();
    
    // If already exists, regenerate with fresh ID to allow multiple test lines if desired, or select/alert
    const hasExisting = ringQuoteTransactions.some(q => q.id === demoSession.id);
    if (hasExisting) {
      demoSession.id = `demo-set-wedding-quote-${Math.random().toString(36).substring(2, 6)}`;
    }

    let gT = 0;
    let tD = 0;
    demoSession.rings.forEach(r => {
      const cost = calculateRingCost(r, settings, spotPrices, 'retail', demoSession.overridePrices);
      gT += cost;
      const val = parseFloat(r.discount) || 0;
      tD += r.discountType === '%' ? cost * (val / 100) : val;
    });
    const sub = Math.max(0, gT - tD - Number(demoSession.scrapCredit));
    const finalInvoiceAmount = sub + (demoSession.applyTax ? sub * 0.12 : 0);
    const demoTotal = `$${finalInvoiceAmount.toFixed(2)}`;

    const demoTx: QuoteTransaction = {
      id: demoSession.id,
      date: new Date().toLocaleString(),
      timestamp: Date.now(),
      name: demoSession.cName,
      phone: demoSession.cPhone,
      summary: "Ring: 4.8g | Band: 3.5g | Men's: 7.2g",
      total: demoTotal,
      fullData: demoSession,
      isWholesale: false
    };

    setRingQuoteTransactions(prev => {
      const updated = [demoTx, ...prev];
      localStorage.setItem('gr_quote_ledger', JSON.stringify(updated));
      return updated;
    });

    alert("Success! Added custom wedding set demo quote with Engagement, Band, and Men's Bevel Band to your Retail Ledger.");
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

          <div className={activeTab === 'cuban' ? "" : "hidden"}>
            <CubanBraceletBuilder
              spotPrices={spotPrices}
              settings={settings}
              estimates={cubanEstimates}
              onSaveEstimate={async (newEst) => {
                const updated = [newEst, ...cubanEstimates.filter(e => e.id !== newEst.id)];
                setCubanEstimates(updated);
                safeSetLocalStorage('gr_cuban_estimates', updated);
                try {
                  await saveDocument('cuban_estimates', newEst.id, newEst);
                  playClickSound('success');
                  showToast("Cuban estimate saved and synced to cloud ledger!", "success");
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
              settings={settings}
              onAddDemoTransaction={handleCreateDemoTransaction}
              onTriggerPrint={handleTriggerPrint}
              isIframe={isIframe}
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
                saveDocument('app_settings', 'gold_api_key', { key: trimmed }); 
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
            />
          </div>
        </div>
      </main>

      {/* 3. INTERACTIVE GEOMETRIC SKETCHPAD OVERLAY */}
      {isSketching && (
        <Sketchpad
          initialImage={getActiveSketchSrc()}
          onSave={handleSketchSave}
          onCancel={() => setIsSketching(false)}
          title={editingImageType === 'sketch' ? "Interactive Design Sketchpad" : "Configure Reference Background Photograph"}
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
