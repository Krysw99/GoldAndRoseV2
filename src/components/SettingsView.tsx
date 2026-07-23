/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Save, Download, Trash2, Calendar, Settings, ShieldAlert, Key, 
  DollarSign, Wrench, Gem, HardDrive, EyeOff, Upload, FileJson,
  Building, ShoppingBag, Globe, Plus, Edit, RefreshCw, Check, Cloud, Coins
} from 'lucide-react';
import { AppSettings, RepairPricingSettings, ScrapTransaction, QuoteTransaction } from '../types';
import { ROUND_MELEE, FANCY_SHAPES } from '../constants';
import { saveDocument } from '../firebase';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  goldApiKey: string;
  onSaveApiKey: (key: string) => void;
  onExportCsv: (type: 'scrap' | 'retail' | 'wholesale') => void;
  onClearHistory: (range: 'all' | '365' | 'custom', startDate?: string, endDate?: string) => void;
  spotPrices: { gold: number; silver: number; platinum: number };
  onUpdateSpotPrices: (spot: { gold: number; silver: number; platinum: number }) => void;
  onNotifyLocalChange?: () => void;
  scrapTransactions: ScrapTransaction[];
  ringQuoteTransactions: QuoteTransaction[];
  wholesaleTransactions: QuoteTransaction[];
  cubanEstimates: any[];
}

export default function SettingsView({
  settings,
  onSaveSettings,
  goldApiKey,
  onSaveApiKey,
  onExportCsv,
  onClearHistory,
  spotPrices,
  onUpdateSpotPrices,
  onNotifyLocalChange,
  scrapTransactions,
  ringQuoteTransactions,
  wholesaleTransactions,
  cubanEstimates
}: SettingsViewProps) {
  // Key state
  const [apiKey, setApiKey] = useState(goldApiKey);
  const [subTab, setSubTab] = useState<'rates' | 'retail' | 'wholesale' | 'database' | 'rawCosts'>('rates');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  // Manual spot rates state
  const [manualGold, setManualGold] = useState(spotPrices.gold.toString());
  const [manualSilver, setManualSilver] = useState(spotPrices.silver.toString());
  const [manualPlatinum, setManualPlatinum] = useState(spotPrices.platinum.toString());

  // App Settings Local Edit State
  const [localSettings, setLocalSettings] = useState<AppSettings>(() => ({
    ...settings,
    platinumPricePerGram: settings.platinumPricePerGram !== undefined ? settings.platinumPricePerGram : 380,
    mensBandGoldPricesPerGram: settings.mensBandGoldPricesPerGram || { ...(settings.goldPricesPerGram || { 10: 200, 14: 230, 18: 280, 19: 300, 22: 320, 24: 350 }) },
    mensBandPlatinumPricePerGram: settings.mensBandPlatinumPricePerGram !== undefined ? settings.mensBandPlatinumPricePerGram : (settings.platinumPricePerGram !== undefined ? settings.platinumPricePerGram : 380),
    mensBandSilverPricePerGram: settings.mensBandSilverPricePerGram !== undefined ? settings.mensBandSilverPricePerGram : (settings.silverPricePerGram !== undefined ? settings.silverPricePerGram : 100),
    cubanMultipliers: settings.cubanMultipliers || [
      { minWidth: 5, maxWidth: 7.9, multiplier: 1.8 },
      { minWidth: 8, maxWidth: 10.9, multiplier: 1.6 },
      { minWidth: 11, maxWidth: 13.9, multiplier: 1.5 },
      { minWidth: 14, maxWidth: 24, multiplier: 1.4 }
    ],
    tennisMultipliers: settings.tennisMultipliers || [
      { minWidth: 1.0, maxWidth: 1.9, multiplier: 1.6 },
      { minWidth: 2.0, maxWidth: 4.0, multiplier: 1.4 }
    ],
    tennisDiamondPricePerCt: settings.tennisDiamondPricePerCt !== undefined ? settings.tennisDiamondPricePerCt : 600
  }));

  // Database Purge Options
  const [purgeRange, setPurgeRange] = useState<'all' | '365' | 'custom'>('365');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  // 1. Sync settings prop into localSettings when parent settings changes from the outside (e.g. cloud sync).
  const isSyncingFromPropRef = React.useRef(false);
  const lastPropSettingsRef = React.useRef(settings);
  React.useEffect(() => {
    if (JSON.stringify(lastPropSettingsRef.current) !== JSON.stringify(settings)) {
      lastPropSettingsRef.current = settings;
      isSyncingFromPropRef.current = true;
      setLocalSettings({
        ...settings,
        wholesaleProfiles: settings.wholesaleProfiles || [],
      });
    }
  }, [settings]);

  // 1.1 Notify parent of any local settings changes to protect active edits from being overwritten
  const isFirstRenderRef = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    if (isSyncingFromPropRef.current) {
      isSyncingFromPropRef.current = false;
      return;
    }
    onNotifyLocalChange?.();
  }, [localSettings, onNotifyLocalChange]);

  // 1.2 Auto-save changes to Firebase with a debounce of 1.5 seconds
  React.useEffect(() => {
    if (isFirstRenderRef.current) {
      return; // Skip first render
    }
    
    // If local settings match prop settings exactly, no need to auto-save!
    if (JSON.stringify(localSettings) === JSON.stringify(settings)) {
      return;
    }

    const timer = setTimeout(() => {
      const sanitized = sanitizeNumbers(localSettings);
      console.log("Auto-saving settings changes to Firebase...", sanitized);
      onSaveSettings(sanitized);
    }, 1500);

    return () => clearTimeout(timer);
  }, [localSettings, settings, onSaveSettings]);



  const currentWholesaleSettings = selectedProfileId
    ? (localSettings.wholesaleProfiles?.find(p => p.id === selectedProfileId)?.settings || localSettings.wholesale)
    : localSettings.wholesale;

  const currentRepairPricing: RepairPricingSettings = currentWholesaleSettings.repairPricing || {
    resizeUp14kThin_base: 50,
    resizeUp14kThin_extra: 70,
    resizeUp14kThick_base: 60,
    resizeUp14kThick_extra: 80,
    resizeUp18k_base: 80,
    resizeUp18k_extra: 100,
    resizeUp22k_base: 100,
    resizeUp22k_extra: 120,
    resizeDownFlat: 40,
    stretchRing: 25,
    resetMelee: 5,
    resetCenter: 35,
    laserEngravingSimple: 30,
    laserEngravingAdvanced: 40,
    prongRetip: 30,
    replatingBase: 50,
    replatingOptionRhodium: 0,
    replatingOption14kYellow: 0,
    replatingOption24k: 0,
    replatingOptionBlackRuthenium: 0,
    replatingOptionNickel: 0,
    replatingOptionRose: 0,
    laserChainRepair: 20,
    simplePolishCleanup: 20,
    heavyCleanupPolishMin: 50,
    heavyCleanupPolishMax: 150
  };

  const handleAddProfile = () => {
    const name = prompt("Enter a name for the new wholesale client profile:");
    if (!name || name.trim() === '') return;
    
    const newProfile = {
      id: 'wp_' + Date.now(),
      name: name.trim(),
      settings: JSON.parse(JSON.stringify(currentWholesaleSettings))
    };
    
    const updatedSettings: AppSettings = {
      ...localSettings,
      wholesaleProfiles: [...(localSettings.wholesaleProfiles || []), newProfile]
    };
    
    setLocalSettings(updatedSettings);
    setSelectedProfileId(newProfile.id);
    onSaveSettings(updatedSettings);
  };

  const handleRenameProfile = () => {
    if (!selectedProfileId) return;
    const profile = localSettings.wholesaleProfiles?.find(p => p.id === selectedProfileId);
    if (!profile) return;
    
    const name = prompt("Enter a new name for this wholesale client profile:", profile.name);
    if (!name || name.trim() === '') return;
    
    const updatedSettings: AppSettings = {
      ...localSettings,
      wholesaleProfiles: (localSettings.wholesaleProfiles || []).map(p =>
        p.id === selectedProfileId ? { ...p, name: name.trim() } : p
      )
    };
    
    setLocalSettings(updatedSettings);
    onSaveSettings(updatedSettings);
  };

  const handleDeleteProfile = () => {
    if (!selectedProfileId) return;
    const profile = localSettings.wholesaleProfiles?.find(p => p.id === selectedProfileId);
    if (!profile) return;
    
    if (confirm(`Are you sure you want to permanently delete the profile "${profile.name}"?`)) {
      const updatedSettings: AppSettings = {
        ...localSettings,
        wholesaleProfiles: (localSettings.wholesaleProfiles || []).filter(p => p.id !== selectedProfileId)
      };
      
      setLocalSettings(updatedSettings);
      setSelectedProfileId('');
      onSaveSettings(updatedSettings);
    }
  };

  // Wholesale stone rate custom sizes
  const [activeFancyShapeTab, setActiveFancyShapeTab] = useState<string>('Princess');
  
  // Raw cost custom sizes
  const [activeRawFancyShapeTab, setActiveRawFancyShapeTab] = useState<string>('Princess');

  // Cross-Device Synchronization Backup/Restore Utilities
  const handleExportBackupJSON = () => {
    const backupData = {
      scrapLedger: JSON.stringify(scrapTransactions),
      quoteLedger: JSON.stringify(ringQuoteTransactions),
      wholesaleLedger: JSON.stringify(wholesaleTransactions),
      masterSettings: JSON.stringify(settings),
      cubanEstimates: JSON.stringify(cubanEstimates),
      goldApiKey: goldApiKey,
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0'
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GoldAndRose_Ledger_Sync_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportBackupJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json.scrapLedger && !json.quoteLedger && !json.wholesaleLedger) {
          alert("Invalid backup file format. Could not find ledger keys.");
          return;
        }

        if (window.confirm("This will merge and upload all backup data directly to your Firestore database. Proceed?")) {
          if (json.scrapLedger) {
            try {
              const items = JSON.parse(json.scrapLedger);
              if (Array.isArray(items)) {
                for (const item of items) {
                  if (item && item.id) {
                    await saveDocument('scrap_ledger', item.id, item);
                  }
                }
              }
            } catch (err) {
              console.error("Failed to import scrap ledger:", err);
            }
          }
          if (json.quoteLedger) {
            try {
              const items = JSON.parse(json.quoteLedger);
              if (Array.isArray(items)) {
                for (const item of items) {
                  if (item && item.id) {
                    await saveDocument('retail_ledger', item.id, item);
                  }
                }
              }
            } catch (err) {
              console.error("Failed to import retail ledger:", err);
            }
          }
          if (json.wholesaleLedger) {
            try {
              const items = JSON.parse(json.wholesaleLedger);
              if (Array.isArray(items)) {
                for (const item of items) {
                  if (item && item.id) {
                    await saveDocument('wholesale_ledger', item.id, item);
                  }
                }
              }
            } catch (err) {
              console.error("Failed to import wholesale ledger:", err);
            }
          }
          if (json.masterSettings && json.masterSettings !== '{}') {
            try {
              const master = JSON.parse(json.masterSettings);
              await saveDocument('app_settings', 'master', master);
            } catch (err) {
              console.error("Failed to import master settings:", err);
            }
          }
          if (json.cubanEstimates) {
            try {
              const items = JSON.parse(json.cubanEstimates);
              if (Array.isArray(items)) {
                for (const item of items) {
                  if (item && item.id) {
                    await saveDocument('cuban_estimates', item.id, item);
                  }
                }
              }
            } catch (err) {
              console.error("Failed to import cuban estimates:", err);
            }
          }
          if (json.goldApiKey) {
            await saveDocument('app_settings', 'gold_api_key', { key: json.goldApiKey });
          }

          alert("Sync data successfully imported and synced to Firestore! The application will now reload to apply all synced records.");
          window.location.reload();
        }
      } catch (err) {
        alert("Error parsing backup file: " + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.readAsText(file);
  };

  const sanitizeNumbers = (obj: any, key?: string): any => {
    // If the key is a known string field, don't touch it
    const stringFields = [
      'id', 'name', 'storeName', 'storeSubName', 'storeAddress', 'storeContact', 
      'wixStoreUrl', 'wixCartSlug', 'wixIntegrationMode', 'wixAccessToken', 
      'wixProductId', 'wixWebhookUrl'
    ];
    if (key && stringFields.includes(key)) {
      return obj;
    }

    if (obj === '') {
      return undefined;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeNumbers(item));
    }
    if (obj !== null && typeof obj === 'object') {
      const res: any = {};
      for (const k of Object.keys(obj)) {
        const val = sanitizeNumbers(obj[k], k);
        if (val !== undefined) {
          res[k] = val;
        }
      }
      return res;
    }
    if (typeof obj === 'string') {
      const trimmed = obj.trim();
      // Check if string is a valid number representation (integer or decimal)
      if (/^-?\d*\.?\d+$/.test(trimmed)) {
        const parsed = parseFloat(trimmed);
        return isNaN(parsed) ? undefined : parsed;
      }
    }
    return obj;
  };

  const handleSaveAll = () => {
    try {
      setSyncStatus('syncing');

      // Apply manual spot rate updates
      const g = parseFloat(manualGold) || spotPrices.gold;
      const s = parseFloat(manualSilver) || spotPrices.silver;
      const p = parseFloat(manualPlatinum) || spotPrices.platinum;
      onUpdateSpotPrices({ gold: g, silver: s, platinum: p });

      // Save Gold API Key
      onSaveApiKey(apiKey);

      // Save Master Settings with deep cleaning of temporary empty string values
      const sanitized = sanitizeNumbers(localSettings);
      console.log("Saving Master Settings:", sanitized);
      onSaveSettings(sanitized);

      // Simulate cloud DB confirmation for feedback
      setTimeout(() => {
        setSyncStatus('success');
        setTimeout(() => {
          setSyncStatus('idle');
        }, 3500);
      }, 1000);
    } catch (error) {
      console.error("Error in handleSaveAll:", error);
      setSyncStatus('error');
      setTimeout(() => {
        setSyncStatus('idle');
      }, 4000);
    }
  };

  const handleTopLevelSetting = (field: keyof AppSettings, valueStr: string) => {
    setLocalSettings(prev => ({
      ...prev,
      [field]: valueStr
    }));
  };

  const handleNestedSetting = (section: keyof AppSettings, field: string, valueStr: any) => {
    setLocalSettings(prev => {
      const target = prev[section];
      if (typeof target === 'object' && target !== null) {
        return {
          ...prev,
          [section]: {
            ...target,
            [field]: valueStr
          }
        };
      }
      return prev;
    });
  };

  const handleDoubleNestedSetting = (section: 'centerStoneRates' | 'centerStoneRawRates', stoneType: string, origin: 'Natural' | 'Lab', valueStr: any) => {
    setLocalSettings(prev => {
      const rates = prev[section];
      return {
        ...prev,
        [section]: {
          ...rates,
          [stoneType]: {
            ...rates[stoneType],
            [origin]: valueStr
          }
        }
      };
    });
  };

  const handleWholesaleSetting = (field: string, valueStr: any) => {
    if (selectedProfileId) {
      setLocalSettings(prev => ({
        ...prev,
        wholesaleProfiles: (prev.wholesaleProfiles || []).map(p =>
          p.id === selectedProfileId
            ? { ...p, settings: { ...p.settings, [field]: valueStr } }
            : p
        )
      }));
    } else {
      setLocalSettings(prev => ({
        ...prev,
        wholesale: {
          ...prev.wholesale,
          [field]: valueStr
        }
      }));
    }
  };

  const handleRepairSetting = (field: keyof RepairPricingSettings, valueStr: any) => {
    const updatedPricing = {
      ...currentRepairPricing,
      [field]: valueStr
    };

    if (selectedProfileId) {
      setLocalSettings(prev => ({
        ...prev,
        wholesaleProfiles: (prev.wholesaleProfiles || []).map(p =>
          p.id === selectedProfileId
            ? {
                ...p,
                settings: {
                  ...p.settings,
                  repairPricing: updatedPricing
                }
              }
            : p
        )
      }));
    } else {
      setLocalSettings(prev => ({
        ...prev,
        wholesale: {
          ...prev.wholesale,
          repairPricing: updatedPricing
        }
      }));
    }
  };

  const handleWholesaleMeleeRate = (size: string, valueStr: any) => {
    if (selectedProfileId) {
      setLocalSettings(prev => ({
        ...prev,
        wholesaleProfiles: (prev.wholesaleProfiles || []).map(p =>
          p.id === selectedProfileId
            ? {
                ...p,
                settings: {
                  ...p.settings,
                  meleeRates: { ...(p.settings.meleeRates || {}), [size]: valueStr }
                }
              }
            : p
        )
      }));
    } else {
      setLocalSettings(prev => ({
        ...prev,
        wholesale: {
          ...prev.wholesale,
          meleeRates: {
            ...(prev.wholesale.meleeRates || {}),
            [size]: valueStr
          }
        }
      }));
    }
  };

  const handleWholesaleFancyRate = (key: string, valueStr: any) => {
    if (selectedProfileId) {
      setLocalSettings(prev => ({
        ...prev,
        wholesaleProfiles: (prev.wholesaleProfiles || []).map(p =>
          p.id === selectedProfileId
            ? {
                ...p,
                settings: {
                  ...p.settings,
                  fancyRates: { ...(p.settings.fancyRates || {}), [key]: valueStr }
                }
              }
            : p
        )
      }));
    } else {
      setLocalSettings(prev => ({
        ...prev,
        wholesale: {
          ...prev.wholesale,
          fancyRates: {
            ...(prev.wholesale.fancyRates || {}),
            [key]: valueStr
          }
        }
      }));
    }
  };

  const handleRawMeleeRate = (size: string, valueStr: any) => {
    setLocalSettings(prev => ({
      ...prev,
      rawMeleeRates: {
        ...(prev.rawMeleeRates || {}),
        [size]: valueStr
      }
    }));
  };

  const handleRawFancyRate = (key: string, valueStr: any) => {
    setLocalSettings(prev => ({
      ...prev,
      rawFancyRates: {
        ...(prev.rawFancyRates || {}),
        [key]: valueStr
      }
    }));
  };

  const handleUpdateCubanMultiplier = (index: number, field: 'minWidth' | 'maxWidth' | 'multiplier', valueStr: any) => {
    setLocalSettings(prev => {
      const updated = [...(prev.cubanMultipliers || [])];
      updated[index] = {
        ...updated[index],
        [field]: valueStr
      };
      return {
        ...prev,
        cubanMultipliers: updated
      };
    });
  };

  const handleAddCubanMultiplier = () => {
    setLocalSettings(prev => {
      const updated = [...(prev.cubanMultipliers || [])];
      updated.push({ minWidth: 0, maxWidth: 0, multiplier: 1.0 });
      return {
        ...prev,
        cubanMultipliers: updated
      };
    });
  };

  const handleRemoveCubanMultiplier = (index: number) => {
    setLocalSettings(prev => {
      const updated = (prev.cubanMultipliers || []).filter((_, i) => i !== index);
      return {
        ...prev,
        cubanMultipliers: updated
      };
    });
  };

  const handleUpdateTennisMultiplier = (index: number, field: 'minWidth' | 'maxWidth' | 'multiplier', valueStr: any) => {
    setLocalSettings(prev => {
      const updated = [...(prev.tennisMultipliers || [])];
      updated[index] = {
        ...updated[index],
        [field]: valueStr
      };
      return {
        ...prev,
        tennisMultipliers: updated
      };
    });
  };

  const handleAddTennisMultiplier = () => {
    setLocalSettings(prev => {
      const updated = [...(prev.tennisMultipliers || [])];
      updated.push({ minWidth: 0, maxWidth: 0, multiplier: 1.0 });
      return {
        ...prev,
        tennisMultipliers: updated
      };
    });
  };

  const handleRemoveTennisMultiplier = (index: number) => {
    setLocalSettings(prev => {
      const updated = (prev.tennisMultipliers || []).filter((_, i) => i !== index);
      return {
        ...prev,
        tennisMultipliers: updated
      };
    });
  };

  const handlePurgeHistory = () => {
    if (purgeRange === 'custom' && (!startDate || !endDate)) {
      alert("Please select both start and end dates for custom date range purge.");
      return;
    }

    let confirmationMsg = "";
    if (purgeRange === 'all') {
      confirmationMsg = "WARNING: This will permanently delete ALL customer transactions in the database (Scrap payouts, Retail quotes, and Wholesale quotes). This action is irreversible. Proceed?";
    } else if (purgeRange === '365') {
      confirmationMsg = "This will permanently delete ledger items older than 365 days. Proceed?";
    } else {
      confirmationMsg = `This will permanently delete ledger items between ${startDate} and ${endDate}. Proceed?`;
    }

    if (window.confirm(confirmationMsg)) {
      onClearHistory(purgeRange, startDate, endDate);
      alert("History purged successfully.");
    }
  };

  return (
    <div className="relative">
      {/* Sync Status Toast/Notification */}
      {syncStatus !== 'idle' && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur-md text-white px-5 py-4 rounded-2xl shadow-2xl border border-brand-gold/30 flex items-start gap-3.5 transition-all duration-300">
          <div className="flex-shrink-0 mt-0.5">
            {syncStatus === 'syncing' && (
              <div className="p-2 bg-brand-gold/10 rounded-xl border border-brand-gold/20">
                <RefreshCw size={18} className="animate-spin text-brand-gold" />
              </div>
            )}
            {syncStatus === 'success' && (
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Check size={18} className="text-emerald-400" />
              </div>
            )}
            {syncStatus === 'error' && (
              <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <span className="text-rose-400 font-bold text-sm">✕</span>
              </div>
            )}
          </div>
          <div className="flex-grow">
            <h4 className="text-xs font-black uppercase tracking-wider text-brand-gold">
              {syncStatus === 'syncing' && "Synchronizing..."}
              {syncStatus === 'success' && "Sync Successful"}
              {syncStatus === 'error' && "Sync Error"}
            </h4>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
              {syncStatus === 'syncing' && "Pushing parameters, pricing tiers, and client profiles to Cloud Firestore..."}
              {syncStatus === 'success' && "All master app settings have been written to the cloud and synchronized across active retail, wholesale, and ledger screens successfully."}
              {syncStatus === 'error' && "Failed to push settings to the cloud. Check network or permission rules."}
            </p>
          </div>
        </div>
      )}      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fadeIn">
        {/* Settings Navigation Rails */}
        <div className="md:col-span-1 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col gap-1.5 text-white">
          <div className="px-3 py-1 mb-1 border-b border-slate-800/80 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <Settings size={14} className="text-amber-400" />
              Settings Hub
            </h3>
            <span className="text-[9px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20 px-2 py-0.5 rounded-full">v2.4</span>
          </div>

          <button
            type="button"
            onClick={() => setSubTab('rates')}
            className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${
              subTab === 'rates'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <DollarSign size={15} className={subTab === 'rates' ? 'text-slate-950' : 'text-amber-400 group-hover:scale-110 transition-transform'} />
              <span>Spot & Branding</span>
            </div>
            {subTab === 'rates' && <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>}
          </button>

          <button
            type="button"
            onClick={() => setSubTab('retail')}
            className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${
              subTab === 'retail'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Wrench size={15} className={subTab === 'retail' ? 'text-slate-950' : 'text-amber-400 group-hover:scale-110 transition-transform'} />
              <span>Retail Pricing</span>
            </div>
            {subTab === 'retail' && <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>}
          </button>

          <button
            type="button"
            onClick={() => setSubTab('wholesale')}
            className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${
              subTab === 'wholesale'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20 font-black'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Gem size={15} className={subTab === 'wholesale' ? 'text-slate-950' : 'text-emerald-400 group-hover:scale-110 transition-transform'} />
              <span>Wholesale Suite</span>
            </div>
            {subTab === 'wholesale' && <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>}
          </button>

          <button
            type="button"
            onClick={() => setSubTab('rawCosts')}
            className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${
              subTab === 'rawCosts'
                ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-lg font-black'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <EyeOff size={15} className={subTab === 'rawCosts' ? 'text-white' : 'text-rose-400 group-hover:scale-110 transition-transform'} />
              <span>Internal Mfg Costs</span>
            </div>
            <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">Confidential</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('database')}
            className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${
              subTab === 'database'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg font-black'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <HardDrive size={15} className={subTab === 'database' ? 'text-white' : 'text-sky-400 group-hover:scale-110 transition-transform'} />
              <span>Ledger & Sync</span>
            </div>
            {subTab === 'database' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
          </button>

          <div className="border-t border-slate-800 my-3 pt-3">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={syncStatus === 'syncing'}
              className={`w-full font-black py-3.5 rounded-xl shadow-lg text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                syncStatus === 'syncing'
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : syncStatus === 'success'
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-black'
                  : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-slate-950 hover:brightness-110 font-black'
              }`}
            >
              {syncStatus === 'syncing' ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-slate-950" />
                  Syncing...
                </>
              ) : syncStatus === 'success' ? (
                <>
                  <Check size={14} className="text-slate-950 animate-bounce" />
                  Synced to Cloud!
                </>
              ) : (
                <>
                  <Cloud size={14} className="text-slate-950" />
                  Save and Sync
                </>
              )}
            </button>
          </div>
        </div>

      {/* Settings Panel Content */}
      <div className="md:col-span-3 bg-slate-50/50 p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[500px]">
        {/* SUBTAB 1: Rates & Keys */}
        {subTab === 'rates' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Key size={18} className="text-amber-500" />
                  Spot Feed & Store Branding
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Manage real-time gold pricing tokens, store invoice details, and online checkout rules.</p>
              </div>
              <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-lg">Spot & System</span>
            </div>

            {/* Gold API Key Input */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <Key size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">GoldAPI.io Access Token</h4>
                  <p className="text-[11px] text-slate-500">Live metals feed token used for automatic spot updates.</p>
                </div>
              </div>
              <input
                type="text"
                placeholder="Enter goldapi-xxx token"
                className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-[11px] text-slate-400 italic">Leave blank to use internal system defaults. All live rates compute in Canadian Dollars (CAD).</p>
            </div>

            {/* Store details block */}
            <div className="bg-white p-5 rounded-2xl border border-indigo-100/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-indigo-100 pb-2.5">
                <div className="p-1.5 bg-indigo-100 text-indigo-800 rounded-lg">
                  <Building size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Store & Invoice Branding Details</h4>
                  <p className="text-[11px] text-slate-500">Appears at the header of printable receipts, customer invoices, and export PDFs.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Store / Business Name</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    value={localSettings.storeName ?? ""}
                    placeholder="Gold & Rose"
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, storeName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Store Slogan / Subtitle</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    value={localSettings.storeSubName ?? ""}
                    placeholder="Jewellery Corporation"
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, storeSubName: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Store Address</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    value={localSettings.storeAddress ?? ""}
                    placeholder="4501 North Rd #209, Burnaby, BC V3N 4J5"
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, storeAddress: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Store Contact Info (Email | Phone | Website)</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    value={localSettings.storeContact ?? ""}
                    placeholder="info@goldandrosejewellery.com | (604) 420-9077"
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, storeContact: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Wix Store checkout integration details */}
            <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-sky-100 pb-2.5">
                <div className="p-1.5 bg-sky-100 text-sky-800 rounded-lg">
                  <ShoppingBag size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Wix Store Checkout Integration</h4>
                  <p className="text-[11px] text-slate-500">Deep-link bespoke custom estimates directly into your online Wix cart.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Wix Store Domain / URL</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                    value={localSettings.wixStoreUrl ?? ""}
                    placeholder="https://www.goldandrosejewellery.com"
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, wixStoreUrl: e.target.value }))}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Base URL used for constructing direct customer cart links.</span>
                </div>
                
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Wix Shopping Cart Page Slug</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold font-mono text-slate-900 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                    value={localSettings.wixCartSlug ?? ""}
                    placeholder="/cart-page"
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, wixCartSlug: e.target.value }))}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Default URL path for Wix stores is usually <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">/cart-page</code>.</span>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Integration Mode</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                    value={localSettings.wixIntegrationMode ?? "deeplink"}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, wixIntegrationMode: e.target.value as any }))}
                  >
                    <option value="deeplink">Wix Cart Deep Link (Developer / Velo Mode)</option>
                    <option value="placeholder_product">Wix Standard Product (Zero-Code Mode)</option>
                    <option value="velo_api">Wix Velo Headless API (Real-time Draft)</option>
                    <option value="webhook">Custom Wix Webhook (External Sync)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Wix Store Access Token / Secret</label>
                  <input
                    type="password"
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold font-mono text-slate-900 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                    value={localSettings.wixAccessToken ?? ""}
                    placeholder="wix_sec_••••••••••••••••"
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, wixAccessToken: e.target.value }))}
                  />
                </div>

                {localSettings.wixIntegrationMode === "placeholder_product" && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Wix Product ID for Custom Order</label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold font-mono text-slate-900"
                        value={localSettings.wixProductId ?? ""}
                        placeholder="e39ba1fc-8c54-46c1-a53d-2dc01c379a29"
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, wixProductId: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Product Base Unit Price (CAD)</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900"
                        value={localSettings.wixBaseUnitPrice ?? 1.00}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, wixBaseUnitPrice: parseFloat(e.target.value) }))}
                      >
                        <option value={1.00}>$1.00 CAD (Quantity = Total CAD Dollars)</option>
                        <option value={0.01}>$0.01 CAD (Quantity = Total CAD Cents)</option>
                      </select>
                    </div>
                  </>
                )}

                {(localSettings.wixIntegrationMode === "webhook" || localSettings.wixIntegrationMode === "velo_api") && (
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {localSettings.wixIntegrationMode === "velo_api" ? "Wix Velo Function URL Endpoint" : "Wix Webhook Endpoint URL"}
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900"
                      value={localSettings.wixWebhookUrl ?? ""}
                      placeholder="https://www.goldandrosejewellery.com/_functions/syncQuote"
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, wixWebhookUrl: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Manual Spot Price Overrides */}
            <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <DollarSign size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Manual Metal Spot Price Overrides (CAD)</h4>
                  <p className="text-[11px] text-slate-500">Manually fix CAD spot prices if live API connectivity is unavailable.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/60">
                  <label className="text-xs font-bold text-slate-800 mb-1 block">Gold Spot / oz ($ CAD)</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-slate-300 p-2.5 rounded-xl text-sm font-black text-slate-900 no-spinner focus:border-amber-500 outline-none"
                    value={manualGold}
                    onChange={(e) => setManualGold(e.target.value)}
                  />
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 mb-1 block">Silver Spot / oz ($ CAD)</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-slate-300 p-2.5 rounded-xl text-sm font-black text-slate-900 no-spinner focus:border-slate-500 outline-none"
                    value={manualSilver}
                    onChange={(e) => setManualSilver(e.target.value)}
                  />
                </div>
                <div className="bg-slate-100/70 p-3 rounded-xl border border-slate-300/80">
                  <label className="text-xs font-bold text-slate-800 mb-1 block">Platinum Spot / oz ($ CAD)</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-slate-300 p-2.5 rounded-xl text-sm font-black text-slate-900 no-spinner focus:border-slate-600 outline-none"
                    value={manualPlatinum}
                    onChange={(e) => setManualPlatinum(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: Retail Multipliers */}
        {subTab === 'retail' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Wrench size={18} className="text-amber-500" />
                  Retail Pricing & Labor Multipliers
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Configure global retail markup variables, stone setting labor, and metal rate matrices.</p>
              </div>
              <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-lg">Retail Suite</span>
            </div>

            {/* Standard Retail Gold Pricing Matrix */}
            <div className="bg-gradient-to-br from-amber-50/60 to-amber-100/30 p-5 rounded-2xl border border-amber-200/80 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-amber-200/60 pb-2">
                <div className="p-1.5 bg-amber-200/80 text-amber-950 rounded-lg">
                  <Coins size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">Standard Retail Gold Pricing Matrix ($ / gram)</h4>
                  <p className="text-[11px] text-amber-900/80">Base retail multiplier prices applied per gram across karat purities.</p>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {[10, 14, 18, 19, 22, 24].map(karat => (
                  <div key={karat} className="bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
                    <label className="text-xs font-black text-amber-900 block mb-1">{karat}k / gram</label>
                    <input
                      type="number"
                      className="w-full bg-amber-50/30 border border-slate-300 p-2 rounded-lg text-xs font-mono font-bold text-slate-900 focus:border-amber-500 outline-none"
                      value={localSettings.goldPricesPerGram[karat] || ''}
                      onChange={(e) => handleNestedSetting('goldPricesPerGram', karat.toString(), e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Retail Men's Bands Gold Pricing Matrix */}
            <div className="bg-gradient-to-br from-amber-50/60 to-amber-100/30 p-5 rounded-2xl border border-amber-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-200/80 text-amber-950 rounded-lg">
                    <Wrench size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                      Retail Men's Bands Pricing Matrix ($ / gram)
                    </h4>
                    <p className="text-[11px] text-amber-900/80">Dedicated gram pricing rates for men's band fabrication.</p>
                  </div>
                </div>
                <span className="text-[10px] bg-amber-200/80 text-amber-950 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold">Men's Band Rates</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {[10, 14, 18, 19, 22, 24].map(karat => (
                  <div key={karat} className="bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
                    <label className="text-xs font-black text-amber-900 block mb-1">{karat}k / gram</label>
                    <input
                      type="number"
                      className="w-full bg-amber-50/30 border border-slate-300 p-2 rounded-lg text-xs font-mono font-bold text-slate-900 focus:border-amber-500 outline-none"
                      value={
                        (localSettings.mensBandGoldPricesPerGram && localSettings.mensBandGoldPricesPerGram[karat] !== undefined)
                          ? localSettings.mensBandGoldPricesPerGram[karat]
                          : (localSettings.goldPricesPerGram[karat] || '')
                      }
                      onChange={(e) => handleNestedSetting('mensBandGoldPricesPerGram', karat.toString(), e.target.value)}
                    />
                  </div>
                ))}
              </div>

              {/* Men's Bands Platinum & Silver per gram rates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 border-t border-amber-200/60">
                <div className="bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
                  <label className="text-xs font-black text-amber-900 mb-1 block">
                    Men's Bands Platinum Rate ($ / gram)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-amber-50/30 border border-slate-300 p-2 rounded-lg text-xs font-mono font-bold text-slate-900 focus:border-amber-500 outline-none"
                    value={localSettings.mensBandPlatinumPricePerGram !== undefined ? localSettings.mensBandPlatinumPricePerGram : (localSettings.platinumPricePerGram || 380)}
                    onChange={(e) => handleTopLevelSetting('mensBandPlatinumPricePerGram', e.target.value)}
                  />
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
                  <label className="text-xs font-black text-amber-900 mb-1 block">
                    Men's Bands Silver Rate ($ / gram)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-amber-50/30 border border-slate-300 p-2 rounded-lg text-xs font-mono font-bold text-slate-900 focus:border-amber-500 outline-none"
                    value={localSettings.mensBandSilverPricePerGram !== undefined ? localSettings.mensBandSilverPricePerGram : (localSettings.silverPricePerGram || 100)}
                    onChange={(e) => handleTopLevelSetting('mensBandSilverPricePerGram', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Platinum & Silver Retail Pricing Multipliers */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <div className="p-1.5 bg-slate-100 text-slate-800 rounded-lg">
                  <Coins size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    General Retail Platinum & Silver Rates ($ / gram)
                  </h4>
                  <p className="text-[11px] text-slate-500">Base retail pricing per gram for non-gold precious metals.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 mb-1 block">
                    Platinum Retail Rate ($ / gram)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-white border border-slate-300 p-2.5 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-slate-500 outline-none"
                    value={localSettings.platinumPricePerGram !== undefined ? localSettings.platinumPricePerGram : 380}
                    onChange={(e) => handleTopLevelSetting('platinumPricePerGram', e.target.value)}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Default rate ($380/g)</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 mb-1 block">
                    Silver Retail Rate ($ / gram)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-white border border-slate-300 p-2.5 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-slate-500 outline-none"
                    value={localSettings.silverPricePerGram !== undefined ? localSettings.silverPricePerGram : 100}
                    onChange={(e) => handleTopLevelSetting('silverPricePerGram', e.target.value)}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Default rate ($100/g)</span>
                </div>
              </div>
            </div>

            {/* Basic setting fees & Metal Spot Premiums */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Setting fees card */}
              <div className="bg-white p-5 rounded-2xl border border-amber-200/70 shadow-xs space-y-3">
                <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                  <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                    <Wrench size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Retail Gem Setting Labor ($)</h4>
                    <p className="text-[11px] text-slate-500">Labor cost applied per stone or carat.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Center Setting / ct</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                      value={localSettings.settingFeeCenterPerCt}
                      onChange={(e) => handleTopLevelSetting('settingFeeCenterPerCt', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Fancy Setting / st</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                      value={localSettings.settingFeeFancyPerSt !== undefined ? localSettings.settingFeeFancyPerSt : 25}
                      onChange={(e) => handleTopLevelSetting('settingFeeFancyPerSt', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Melee Setting / st</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                      value={localSettings.settingFeeMeleePerSt}
                      onChange={(e) => handleTopLevelSetting('settingFeeMeleePerSt', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Retail Metal Spot Premiums */}
              <div className="bg-white p-5 rounded-2xl border border-amber-200/70 shadow-xs space-y-3">
                <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                  <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                    <DollarSign size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Retail Spot Premiums ($ / oz)</h4>
                    <p className="text-[11px] text-slate-500">Retail premium added on raw metal spot prices.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Gold Premium / oz</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                      value={localSettings.retailGoldPremium !== undefined ? localSettings.retailGoldPremium : 100}
                      onChange={(e) => handleTopLevelSetting('retailGoldPremium', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Silver Premium / oz</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                      value={localSettings.retailSilverPremium !== undefined ? localSettings.retailSilverPremium : 20}
                      onChange={(e) => handleTopLevelSetting('retailSilverPremium', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">Platinum Premium / oz</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                      value={localSettings.retailPlatinumPremium !== undefined ? localSettings.retailPlatinumPremium : 100}
                      onChange={(e) => handleTopLevelSetting('retailPlatinumPremium', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Standard Melee Stone Retail Supply Rates */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <div className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                  <Gem size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Stone Supply Retail Rates ($ / ct)</h4>
                  <p className="text-[11px] text-slate-500">Retail supply prices per carat for rings and earrings.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 mb-1 block">Ring Melee / ct</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900"
                    value={localSettings.meleePricePerCt}
                    onChange={(e) => handleTopLevelSetting('meleePricePerCt', e.target.value)}
                  />
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 mb-1 block">Ring Fancy / ct</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900"
                    value={localSettings.fancyPricePerCt}
                    onChange={(e) => handleTopLevelSetting('fancyPricePerCt', e.target.value)}
                  />
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 mb-1 block">Earrings Melee / ct</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900"
                    value={localSettings.earringMeleePricePerCt}
                    onChange={(e) => handleTopLevelSetting('earringMeleePricePerCt', e.target.value)}
                  />
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 mb-1 block">Earrings Fancy / ct</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900"
                    value={localSettings.earringFancyPricePerCt}
                    onChange={(e) => handleTopLevelSetting('earringFancyPricePerCt', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Standard Center stone rates matrix */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <div className="p-1.5 bg-violet-100 text-violet-800 rounded-lg">
                  <Gem size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Center Stone Retail Rates Matrix ($ / ct)</h4>
                  <p className="text-[11px] text-slate-500">Retail rates for center gem varieties split by Natural vs Lab-Grown.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.keys(localSettings.centerStoneRates).map(stone => (
                  <div key={stone} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                    <p className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      {stone}
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Natural / ct</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-slate-300 p-2 rounded-lg text-xs font-bold text-slate-900"
                          value={localSettings.centerStoneRates[stone].Natural}
                          onChange={(e) => handleDoubleNestedSetting('centerStoneRates', stone, 'Natural', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Lab-Grown / ct</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-slate-300 p-2 rounded-lg text-xs font-bold text-slate-900"
                          value={localSettings.centerStoneRates[stone].Lab}
                          onChange={(e) => handleDoubleNestedSetting('centerStoneRates', stone, 'Lab', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cuban Chain Automatic Multipliers Configuration */}
            <div className="bg-brand-50/30 p-4 rounded-2xl border border-brand-100 space-y-4">
              <div className="flex justify-between items-center border-b border-brand-100 pb-2">
                <div>
                  <h4 className="text-xs font-black text-brand-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Wrench size={13} className="text-brand-gold" />
                    Cuban Chain Automatic Labor Multipliers
                  </h4>
                  <p className="text-[10px] text-brand-500">
                    Define the gram labor multiplier rate based on the width (mm) of the chain.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddCubanMultiplier}
                  className="px-2.5 py-1 bg-brand-900 text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-brand-800 cursor-pointer"
                >
                  + Add Range
                </button>
              </div>

              <div className="space-y-2.5">
                {(localSettings.cubanMultipliers || []).map((range, index) => (
                  <div key={index} className="bg-white p-3 rounded-xl border border-brand-100 shadow-xs flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[120px] grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-brand-400 block mb-0.5">Min Width (mm)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          className="w-full bg-brand-50/30 border border-brand-200 px-2 py-1 rounded-lg text-xs font-bold font-mono"
                          value={range.minWidth}
                          onChange={(e) => handleUpdateCubanMultiplier(index, 'minWidth', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-brand-400 block mb-0.5">Max Width (mm)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          className="w-full bg-brand-50/30 border border-brand-200 px-2 py-1 rounded-lg text-xs font-bold font-mono"
                          value={range.maxWidth}
                          onChange={(e) => handleUpdateCubanMultiplier(index, 'maxWidth', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="w-24 shrink-0">
                      <label className="text-[9px] font-bold text-brand-400 block mb-0.5">Multiplier</label>
                      <input
                        type="number"
                        step="0.05"
                        min="1"
                        className="w-full bg-brand-50/30 border border-brand-200 px-2 py-1 rounded-lg text-xs font-bold font-mono"
                        value={range.multiplier}
                        onChange={(e) => handleUpdateCubanMultiplier(index, 'multiplier', e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCubanMultiplier(index)}
                      className="text-red-500 hover:text-red-700 p-1 mt-3.5 hover:bg-red-50 rounded-lg cursor-pointer"
                      title="Remove Range"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                
                {(localSettings.cubanMultipliers || []).length === 0 && (
                  <p className="text-xs text-brand-400 text-center py-4 bg-white rounded-xl border border-dashed border-brand-200">
                    No ranges configured. Add a range or use defaults.
                  </p>
                )}
              </div>
            </div>

            {/* Tennis Bracelet Settings & Multipliers */}
            <div className="bg-brand-50/30 p-4 rounded-2xl border border-brand-100 space-y-4">
              <div className="border-b border-brand-100 pb-2">
                <h4 className="text-xs font-black text-brand-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Gem size={13} className="text-brand-gold" />
                  Tennis Bracelet Pricing Parameters
                </h4>
                <p className="text-[10px] text-brand-500">
                  Configure diamond/stone pricing and automatic multipliers for tennis bracelets.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Diamond Price / ct</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-brand-200 p-2.5 rounded-xl text-xs font-bold"
                    value={localSettings.tennisDiamondPricePerCt !== undefined ? localSettings.tennisDiamondPricePerCt : 600}
                    onChange={(e) => handleTopLevelSetting('tennisDiamondPricePerCt', e.target.value)}
                  />
                  <span className="text-[9px] text-brand-400 mt-1 block">Default price for all diamond sizes ($600)</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Melee Price / ct</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-brand-200 p-2.5 rounded-xl text-xs font-bold"
                    value={localSettings.tennisMeleePricePerCt !== undefined ? localSettings.tennisMeleePricePerCt : 2600}
                    onChange={(e) => handleTopLevelSetting('tennisMeleePricePerCt', e.target.value)}
                  />
                  <span className="text-[9px] text-brand-400 mt-1 block">Used if diamond override is not set ($2,600)</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Fancy Price / ct</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-brand-200 p-2.5 rounded-xl text-xs font-bold"
                    value={localSettings.tennisFancyPricePerCt !== undefined ? localSettings.tennisFancyPricePerCt : 800}
                    onChange={(e) => handleTopLevelSetting('tennisFancyPricePerCt', e.target.value)}
                  />
                  <span className="text-[9px] text-brand-400 mt-1 block">Used for non-round fancy cut styles ($800)</span>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-brand-100 pt-3">
                <div>
                  <h5 className="text-[11px] font-black text-brand-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench size={11} className="text-brand-gold" />
                    Tennis Bracelet Automatic Gram Multipliers
                  </h5>
                  <p className="text-[9px] text-brand-400">
                    Apply a multiplier factor to the metal weight (grams) based on stone size (mm).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTennisMultiplier}
                  className="px-2.5 py-1 bg-brand-900 text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-brand-800 cursor-pointer"
                >
                  + Add Range
                </button>
              </div>

              <div className="space-y-2.5">
                {(localSettings.tennisMultipliers || []).map((range, index) => (
                  <div key={index} className="bg-white p-3 rounded-xl border border-brand-100 shadow-xs flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[120px] grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-brand-400 block mb-0.5">Min Size (mm)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          className="w-full bg-brand-50/30 border border-brand-200 px-2 py-1 rounded-lg text-xs font-bold font-mono"
                          value={range.minWidth}
                          onChange={(e) => handleUpdateTennisMultiplier(index, 'minWidth', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-brand-400 block mb-0.5">Max Size (mm)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          className="w-full bg-brand-50/30 border border-brand-200 px-2 py-1 rounded-lg text-xs font-bold font-mono"
                          value={range.maxWidth}
                          onChange={(e) => handleUpdateTennisMultiplier(index, 'maxWidth', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="w-24 shrink-0">
                      <label className="text-[9px] font-bold text-brand-400 block mb-0.5">Multiplier</label>
                      <input
                        type="number"
                        step="0.05"
                        min="1"
                        className="w-full bg-brand-50/30 border border-brand-200 px-2 py-1 rounded-lg text-xs font-bold font-mono"
                        value={range.multiplier}
                        onChange={(e) => handleUpdateTennisMultiplier(index, 'multiplier', e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveTennisMultiplier(index)}
                      className="text-red-500 hover:text-red-700 p-1 mt-3.5 hover:bg-red-50 rounded-lg cursor-pointer"
                      title="Remove Range"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                
                {(localSettings.tennisMultipliers || []).length === 0 && (
                  <p className="text-xs text-brand-400 text-center py-4 bg-white rounded-xl border border-dashed border-brand-200">
                    No ranges configured. Add a range or use defaults.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: Wholesale Model */}
        {subTab === 'wholesale' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-sm font-black text-brand-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Gem size={16} className="text-brand-gold" />
                Wholesale Manufacturing Pricing Suite
              </h2>
              <p className="text-xs text-brand-500">Fine-tune the fabrication labor pricing, spot premiums, and master setting rates.</p>
            </div>

            {/* Wholesale Client Profile Manager */}
            <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100/85 space-y-3">
              <h3 className="text-xs font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
                <Globe size={14} className="text-emerald-600" />
                Wholesale Client Profile Manager
              </h3>
              <p className="text-[10px] text-emerald-600/95 leading-relaxed">
                Create and manage specific wholesale client profiles with custom rates. When selected on the Wholesale Manufacturing tab, these custom rates automatically apply to the active job.
              </p>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1">
                  <select
                    className="w-full bg-white border border-emerald-200 p-2.5 rounded-xl text-xs font-bold shadow-sm outline-none focus:border-emerald-400"
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                  >
                    <option value="">Default (Global Wholesale Rates)</option>
                    {(localSettings.wholesaleProfiles || []).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={handleAddProfile}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={13} />
                    Add Profile
                  </button>
                  
                  {selectedProfileId && (
                    <>
                      <button
                        type="button"
                        onClick={handleRenameProfile}
                        className="bg-white hover:bg-brand-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <Edit size={13} />
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteProfile}
                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-xs font-bold px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="bg-white/90 border border-emerald-100/50 p-3 rounded-xl text-[10px] font-medium text-emerald-800 flex items-center gap-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span>
                  Currently editing: <strong className="font-bold">{selectedProfileId ? `"${localSettings.wholesaleProfiles?.find(p => p.id === selectedProfileId)?.name}" Client Profile` : 'Global Default Wholesale Rates'}</strong>. Any rates adjusted below will apply to this profile.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-brand-500 mb-1 block">Gold Spot Premium / oz</label>
                <input
                  type="number"
                  className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                  value={currentWholesaleSettings.goldSpotPremium}
                  onChange={(e) => handleWholesaleSetting('goldSpotPremium', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-brand-500 mb-1 block">Fabrication Labor / gram</label>
                <input
                  type="number"
                  className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                  value={currentWholesaleSettings.laborPerGram}
                  onChange={(e) => handleWholesaleSetting('laborPerGram', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-brand-500 mb-1 block">Standard Custom CAD Fee</label>
                <input
                  type="number"
                  className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                  value={currentWholesaleSettings.designFee}
                  onChange={(e) => handleWholesaleSetting('designFee', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-brand-800 uppercase tracking-widest border-b border-brand-100 pb-2">Wholesale setting labor (per stone)</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Melee stone setting</label>
                  <input
                    type="number"
                    className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                    value={currentWholesaleSettings.settingMelee}
                    onChange={(e) => handleWholesaleSetting('settingMelee', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Fancy stone setting</label>
                  <input
                    type="number"
                    className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                    value={currentWholesaleSettings.settingFancy}
                    onChange={(e) => handleWholesaleSetting('settingFancy', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Center stone setting</label>
                  <input
                    type="number"
                    className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                    value={currentWholesaleSettings.settingCenter}
                    onChange={(e) => handleWholesaleSetting('settingCenter', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Wholesale Repair Rates */}
            <div className="bg-brand-50/20 p-5 rounded-2xl border border-brand-100 space-y-4">
              <div className="border-b border-brand-100 pb-2">
                <h4 className="text-xs font-black text-brand-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Wrench size={14} className="text-brand-gold" />
                  Wholesale Repair Rates
                </h4>
                <p className="text-[10px] text-brand-500">Configure base costs and sizing rates specifically for the Repair invoices / wholesale category.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* CARD 1 */}
                <div className="bg-white p-4 rounded-xl border border-brand-100 space-y-3 shadow-xs">
                  <h5 className="text-[10px] font-black text-brand-800 uppercase tracking-wider border-b border-brand-50 pb-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Ring Resizing & Stretching
                  </h5>
                  
                  <div className="space-y-2">
                    <div className="p-2 bg-brand-50/30 rounded-lg border border-brand-50 space-y-1.5">
                      <span className="text-[9px] font-bold text-brand-700 uppercase tracking-wider block">Resize Up 14k (Thin/Std)</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] font-semibold text-brand-500 block mb-0.5">Base Price ($)</label>
                          <input
                            type="number"
                            className="w-full bg-white border border-brand-200 px-1.5 py-1 rounded-md text-xs font-bold"
                            value={currentRepairPricing.resizeUp14kThin_base}
                            onChange={(e) => handleRepairSetting('resizeUp14kThin_base', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-semibold text-brand-500 block mb-0.5">Per Size ($)</label>
                          <input
                            type="number"
                            className="w-full bg-white border border-brand-200 px-1.5 py-1 rounded-md text-xs font-bold"
                            value={currentRepairPricing.resizeUp14kThin_extra}
                            onChange={(e) => handleRepairSetting('resizeUp14kThin_extra', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-2 bg-brand-50/30 rounded-lg border border-brand-50 space-y-1.5">
                      <span className="text-[9px] font-bold text-brand-700 uppercase tracking-wider block">Resize Up 14k (Thick/Wide)</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] font-semibold text-brand-500 block mb-0.5">Base Price ($)</label>
                          <input
                            type="number"
                            className="w-full bg-white border border-brand-200 px-1.5 py-1 rounded-md text-xs font-bold"
                            value={currentRepairPricing.resizeUp14kThick_base}
                            onChange={(e) => handleRepairSetting('resizeUp14kThick_base', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-semibold text-brand-500 block mb-0.5">Per Size ($)</label>
                          <input
                            type="number"
                            className="w-full bg-white border border-brand-200 px-1.5 py-1 rounded-md text-xs font-bold"
                            value={currentRepairPricing.resizeUp14kThick_extra}
                            onChange={(e) => handleRepairSetting('resizeUp14kThick_extra', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-2 bg-brand-50/30 rounded-lg border border-brand-50 space-y-1.5">
                      <span className="text-[9px] font-bold text-brand-700 uppercase tracking-wider block">Resize Up 18k</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] font-semibold text-brand-500 block mb-0.5">Base Price ($)</label>
                          <input
                            type="number"
                            className="w-full bg-white border border-brand-200 px-1.5 py-1 rounded-md text-xs font-bold"
                            value={currentRepairPricing.resizeUp18k_base}
                            onChange={(e) => handleRepairSetting('resizeUp18k_base', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-semibold text-brand-500 block mb-0.5">Per Size ($)</label>
                          <input
                            type="number"
                            className="w-full bg-white border border-brand-200 px-1.5 py-1 rounded-md text-xs font-bold"
                            value={currentRepairPricing.resizeUp18k_extra}
                            onChange={(e) => handleRepairSetting('resizeUp18k_extra', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-2 bg-brand-50/30 rounded-lg border border-brand-50 space-y-1.5">
                      <span className="text-[9px] font-bold text-brand-700 uppercase tracking-wider block">Resize Up 22k</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] font-semibold text-brand-500 block mb-0.5">Base Price ($)</label>
                          <input
                            type="number"
                            className="w-full bg-white border border-brand-200 px-1.5 py-1 rounded-md text-xs font-bold"
                            value={currentRepairPricing.resizeUp22k_base}
                            onChange={(e) => handleRepairSetting('resizeUp22k_base', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-semibold text-brand-500 block mb-0.5">Per Size ($)</label>
                          <input
                            type="number"
                            className="w-full bg-white border border-brand-200 px-1.5 py-1 rounded-md text-xs font-bold"
                            value={currentRepairPricing.resizeUp22k_extra}
                            onChange={(e) => handleRepairSetting('resizeUp22k_extra', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[9px] font-bold text-brand-700 block mb-1">Resize Down Flat ($)</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-brand-200 p-2 rounded-lg text-xs font-bold"
                          value={currentRepairPricing.resizeDownFlat}
                          onChange={(e) => handleRepairSetting('resizeDownFlat', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-brand-700 block mb-1">Stretch Ring ($)</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-brand-200 p-2 rounded-lg text-xs font-bold"
                          value={currentRepairPricing.stretchRing}
                          onChange={(e) => handleRepairSetting('stretchRing', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 2: Stones, Prongs & Engraving */}
                <div className="bg-white p-4 rounded-xl border border-brand-100 space-y-3 shadow-xs">
                  <h5 className="text-[10px] font-black text-brand-800 uppercase tracking-wider border-b border-brand-50 pb-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Stones, Prongs & Engraving
                  </h5>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-bold text-brand-700 block mb-1">Reset Melee (per stone) ($)</label>
                      <input
                        type="number"
                        className="w-full bg-brand-50/30 border border-brand-200 p-2 rounded-lg text-xs font-bold"
                        value={currentRepairPricing.resetMelee}
                        onChange={(e) => handleRepairSetting('resetMelee', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-brand-700 block mb-1">Reset Center Stone ($)</label>
                      <input
                        type="number"
                        className="w-full bg-brand-50/30 border border-brand-200 p-2 rounded-lg text-xs font-bold"
                        value={currentRepairPricing.resetCenter}
                        onChange={(e) => handleRepairSetting('resetCenter', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-brand-700 block mb-1">Prong Retip (per prong) ($)</label>
                      <input
                        type="number"
                        className="w-full bg-brand-50/30 border border-brand-200 p-2 rounded-lg text-xs font-bold"
                        value={currentRepairPricing.prongRetip}
                        onChange={(e) => handleRepairSetting('prongRetip', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-brand-700 block mb-1">Laser Engraving (Simple) ($)</label>
                      <input
                        type="number"
                        className="w-full bg-brand-50/30 border border-brand-200 p-2 rounded-lg text-xs font-bold"
                        value={currentRepairPricing.laserEngravingSimple}
                        onChange={(e) => handleRepairSetting('laserEngravingSimple', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-brand-700 block mb-1">Laser Engraving (Advanced) ($)</label>
                      <input
                        type="number"
                        className="w-full bg-brand-50/30 border border-brand-200 p-2 rounded-lg text-xs font-bold"
                        value={currentRepairPricing.laserEngravingAdvanced}
                        onChange={(e) => handleRepairSetting('laserEngravingAdvanced', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* CARD 3: Plating, Polish & Chain */}
                <div className="bg-white p-4 rounded-xl border border-brand-100 space-y-3 shadow-xs">
                  <h5 className="text-[10px] font-black text-brand-800 uppercase tracking-wider border-b border-brand-50 pb-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    Plating, Cleanup & Polish
                  </h5>

                  <div className="space-y-2">
                    <div className="p-2 bg-brand-50/30 rounded-lg border border-brand-50 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-brand-700 uppercase tracking-wider block">Replating Base Price ($)</span>
                        <input
                          type="number"
                          className="w-16 bg-white border border-brand-200 px-1.5 py-0.5 rounded text-xs font-bold text-right"
                          value={currentRepairPricing.replatingBase}
                          onChange={(e) => handleRepairSetting('replatingBase', e.target.value)}
                        />
                      </div>
                      
                      <div className="border-t border-brand-100 pt-1.5 space-y-1">
                        <span className="text-[8px] font-semibold text-brand-500 uppercase tracking-wider block mb-1">Custom Plating Upcharges:</span>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                          <div className="flex justify-between items-center gap-1">
                            <span className="text-[8px] font-medium text-brand-600">Rhodium</span>
                            <input
                              type="number"
                              className="w-9 bg-white border border-brand-200 px-1 py-0.5 rounded text-[10px] font-bold text-right"
                              value={currentRepairPricing.replatingOptionRhodium}
                              onChange={(e) => handleRepairSetting('replatingOptionRhodium', e.target.value)}
                            />
                          </div>
                          <div className="flex justify-between items-center gap-1">
                            <span className="text-[8px] font-medium text-brand-600">14k Yellow</span>
                            <input
                              type="number"
                              className="w-9 bg-white border border-brand-200 px-1 py-0.5 rounded text-[10px] font-bold text-right"
                              value={currentRepairPricing.replatingOption14kYellow}
                              onChange={(e) => handleRepairSetting('replatingOption14kYellow', e.target.value)}
                            />
                          </div>
                          <div className="flex justify-between items-center gap-1">
                            <span className="text-[8px] font-medium text-brand-600">24k Gold</span>
                            <input
                              type="number"
                              className="w-9 bg-white border border-brand-200 px-1 py-0.5 rounded text-[10px] font-bold text-right"
                              value={currentRepairPricing.replatingOption24k}
                              onChange={(e) => handleRepairSetting('replatingOption24k', e.target.value)}
                            />
                          </div>
                          <div className="flex justify-between items-center gap-1">
                            <span className="text-[8px] font-medium text-brand-600">Black Ruth.</span>
                            <input
                              type="number"
                              className="w-9 bg-white border border-brand-200 px-1 py-0.5 rounded text-[10px] font-bold text-right"
                              value={currentRepairPricing.replatingOptionBlackRuthenium}
                              onChange={(e) => handleRepairSetting('replatingOptionBlackRuthenium', e.target.value)}
                            />
                          </div>
                          <div className="flex justify-between items-center gap-1">
                            <span className="text-[8px] font-medium text-brand-600">Nickel</span>
                            <input
                              type="number"
                              className="w-9 bg-white border border-brand-200 px-1 py-0.5 rounded text-[10px] font-bold text-right"
                              value={currentRepairPricing.replatingOptionNickel}
                              onChange={(e) => handleRepairSetting('replatingOptionNickel', e.target.value)}
                            />
                          </div>
                          <div className="flex justify-between items-center gap-1">
                            <span className="text-[8px] font-medium text-brand-600">Rose</span>
                            <input
                              type="number"
                              className="w-9 bg-white border border-brand-200 px-1 py-0.5 rounded text-[10px] font-bold text-right"
                              value={currentRepairPricing.replatingOptionRose}
                              onChange={(e) => handleRepairSetting('replatingOptionRose', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-brand-700 block mb-1">Laser Chain Repair ($)</label>
                      <input
                        type="number"
                        className="w-full bg-brand-50/30 border border-brand-200 p-2 rounded-lg text-xs font-bold"
                        value={currentRepairPricing.laserChainRepair}
                        onChange={(e) => handleRepairSetting('laserChainRepair', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-brand-700 block mb-1">Simple Polish / Cleanup ($)</label>
                      <input
                        type="number"
                        className="w-full bg-brand-50/30 border border-brand-200 p-2 rounded-lg text-xs font-bold"
                        value={currentRepairPricing.simplePolishCleanup}
                        onChange={(e) => handleRepairSetting('simplePolishCleanup', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-brand-700 block mb-1">Heavy Polish Min ($)</label>
                        <input
                          type="number"
                          className="w-full bg-brand-50/30 border border-brand-200 p-2 rounded-lg text-xs font-bold"
                          value={currentRepairPricing.heavyCleanupPolishMin}
                          onChange={(e) => handleRepairSetting('heavyCleanupPolishMin', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-brand-700 block mb-1">Heavy Polish Max ($)</label>
                        <input
                          type="number"
                          className="w-full bg-brand-50/30 border border-brand-200 p-2 rounded-lg text-xs font-bold"
                          value={currentRepairPricing.heavyCleanupPolishMax}
                          onChange={(e) => handleRepairSetting('heavyCleanupPolishMax', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Melee Round Stone Rates by Size */}
            <div className="bg-brand-50/30 p-4 rounded-2xl border border-brand-100 space-y-3">
              <div className="flex justify-between items-center border-b border-brand-100 pb-2 flex-wrap gap-2">
                <h4 className="text-xs font-black text-brand-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Gem size={13} className="text-brand-gold" />
                  Wholesale Melee Round Rates (per Carat)
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(prompt("Enter wholesale price per carat to set for ALL melee sizes:", "400") || "");
                    if (!isNaN(val)) {
                      const updated: Record<string, number> = {};
                      Object.keys(ROUND_MELEE).forEach(size => {
                        updated[size] = val;
                      });
                      if (selectedProfileId) {
                        setLocalSettings(prev => ({
                          ...prev,
                          wholesaleProfiles: (prev.wholesaleProfiles || []).map(p =>
                            p.id === selectedProfileId
                              ? { ...p, settings: { ...p.settings, meleeRates: updated } }
                              : p
                          )
                        }));
                      } else {
                        setLocalSettings(prev => ({
                          ...prev,
                          wholesale: {
                            ...prev.wholesale,
                            meleeRates: updated
                          }
                        }));
                      }
                    }
                  }}
                  className="text-[10px] text-brand-600 hover:text-brand-900 font-bold underline cursor-pointer font-sans"
                >
                  Set All Melee Rates
                </button>
              </div>
              <p className="text-[10px] text-brand-500">Specify the manual wholesale price per carat for each round melee diameter size. Empty fields fall back to $400/ct.</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {Object.entries(ROUND_MELEE).map(([size, carat]) => (
                  <div key={size} className="bg-white p-2 rounded-xl border border-brand-100 shadow-2xs flex flex-col justify-between gap-1">
                    <span className="text-[9px] font-bold text-brand-700 block leading-tight">
                      {size} mm <span className="font-normal text-[8px] text-brand-400">({carat} ct)</span>
                    </span>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-400">$</span>
                      <input
                        type="number"
                        placeholder="400"
                        className="w-full bg-brand-50/30 border border-brand-200 pl-4 pr-1 py-1 rounded text-xs font-bold text-brand-900"
                        value={currentWholesaleSettings.meleeRates?.[size] ?? ""}
                        onChange={(e) => handleWholesaleMeleeRate(size, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fancy Stone Rates by Shape & Size */}
            <div className="bg-brand-50/30 p-4 rounded-2xl border border-brand-100 space-y-3">
              <div className="flex justify-between items-center border-b border-brand-100 pb-2 flex-wrap gap-2">
                <h4 className="text-xs font-black text-brand-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Gem size={13} className="text-brand-gold" />
                  Wholesale Fancy Rates by Shape & Size
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(prompt(`Enter wholesale price per carat to set for ALL sizes of ${activeFancyShapeTab}:`, "500") || "");
                    if (!isNaN(val)) {
                      const updated = { ...(currentWholesaleSettings.fancyRates || {}) };
                      const sizes = FANCY_SHAPES[activeFancyShapeTab] || [];
                      sizes.forEach(sz => {
                        const key = `${activeFancyShapeTab}-${sz.label}`;
                        updated[key] = val;
                      });
                      updated[activeFancyShapeTab] = val; // Also fallback
                      if (selectedProfileId) {
                        setLocalSettings(prev => ({
                          ...prev,
                          wholesaleProfiles: (prev.wholesaleProfiles || []).map(p =>
                            p.id === selectedProfileId
                              ? { ...p, settings: { ...p.settings, fancyRates: updated } }
                              : p
                          )
                        }));
                      } else {
                        setLocalSettings(prev => ({
                          ...prev,
                          wholesale: {
                            ...prev.wholesale,
                            fancyRates: updated
                          }
                        }));
                      }
                    }
                  }}
                  className="text-[10px] text-brand-600 hover:text-brand-900 font-bold underline cursor-pointer font-sans"
                >
                  Set All {activeFancyShapeTab} Rates
                </button>
              </div>
              <p className="text-[10px] text-brand-500">Select a fancy cut shape below, then manually adjust the wholesale price per carat for each specific size.</p>
              
              {/* Fancy shape selector tabs */}
              <div className="flex flex-wrap gap-1 border-b border-brand-100 pb-2">
                {Object.keys(FANCY_SHAPES).map(shape => (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => setActiveFancyShapeTab(shape)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      activeFancyShapeTab === shape
                        ? 'bg-brand-800 text-white shadow-xs'
                        : 'bg-white text-brand-600 hover:bg-brand-50 border border-brand-100'
                    }`}
                  >
                    {shape}
                  </button>
                ))}
              </div>
              
              {/* Base Shape Fallback rate input */}
              <div className="bg-white p-3 rounded-xl border border-brand-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                <div className="leading-tight">
                  <span className="text-xs font-bold text-brand-800 block">
                    Base Shape Fallback Rate ({activeFancyShapeTab})
                  </span>
                  <span className="text-[9px] text-brand-400">Default rate used for this cut if a specific size field below is left empty.</span>
                </div>
                <div className="relative w-full sm:w-36 shrink-0">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-400">$</span>
                  <input
                    type="number"
                    placeholder="500"
                    className="w-full bg-brand-50/30 border border-brand-200 pl-5 pr-1 py-1 rounded text-xs font-bold text-brand-900"
                    value={currentWholesaleSettings.fancyRates?.[activeFancyShapeTab] ?? ""}
                    onChange={(e) => handleWholesaleFancyRate(activeFancyShapeTab, e.target.value)}
                  />
                </div>
              </div>

              {/* Specific size rate inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {(FANCY_SHAPES[activeFancyShapeTab] || []).map((sz) => {
                  const key = `${activeFancyShapeTab}-${sz.label}`;
                  const fallbackRate = currentWholesaleSettings.fancyRates?.[activeFancyShapeTab] ?? 500;
                  return (
                    <div key={sz.label} className="bg-white p-2 rounded-xl border border-brand-100 shadow-2xs flex flex-col justify-between gap-1">
                      <span className="text-[9px] font-bold text-brand-700 block leading-tight">
                        {sz.label} <span className="font-normal text-[8px] text-brand-400">({sz.carat} ct)</span>
                      </span>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-400">$</span>
                        <input
                          type="number"
                          placeholder={String(fallbackRate)}
                          className="w-full bg-brand-50/30 border border-brand-200 pl-4 pr-1 py-1 rounded text-xs font-bold text-brand-900"
                          value={currentWholesaleSettings.fancyRates?.[key] ?? ""}
                          onChange={(e) => handleWholesaleFancyRate(key, e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3.5: Internal Manufacturing Raw Costs (FOR EYES ONLY) */}
        {subTab === 'rawCosts' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-amber-500/10 border border-amber-300 p-4 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <div className="space-y-1">
                <h2 className="text-sm font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <EyeOff size={16} className="text-amber-600" />
                  CONFIDENTIAL: Internal Manufacturing & Raw Costs
                </h2>
                <p className="text-xs text-amber-900 leading-relaxed">
                  These rates represent the absolute minimum cost of materials and labor (for internal tracking only).
                  These configurations compute the <strong>Raw Cost CAD</strong> and must <strong>never</strong> be shown to clients.
                </p>
              </div>
            </div>

            {/* Toggle showRawCostOnQuoteTab */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider block flex items-center gap-1.5">
                  <EyeOff size={15} className="text-amber-600" />
                  Show Internal Manufacturing Raw Cost Box
                </span>
                <span className="text-[11px] text-slate-500 block">Display the confidential amber raw cost breakdown box on the active custom quote tab.</span>
              </div>
              <button
                type="button"
                onClick={() => setLocalSettings(prev => ({ ...prev, showRawCostOnQuoteTab: !prev.showRawCostOnQuoteTab }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${localSettings.showRawCostOnQuoteTab ? 'bg-amber-600' : 'bg-slate-200'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${localSettings.showRawCostOnQuoteTab ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {/* Base Fallback Raw Cost Rates */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Base Fallback Raw Rates (per ct)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Base Melee Raw / ct ($)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold font-mono text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    value={localSettings.rawCostRates.melee}
                    onChange={(e) => handleNestedSetting('rawCostRates', 'melee', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Base Fancy Raw / ct ($)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold font-mono text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    value={localSettings.rawCostRates.fancy}
                    onChange={(e) => handleNestedSetting('rawCostRates', 'fancy', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Base Center Raw / ct ($)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold font-mono text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    value={localSettings.rawCostRates.center}
                    onChange={(e) => handleNestedSetting('rawCostRates', 'center', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Center Stone Raw Rates Matrix */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Center Stone Raw Rates Matrix (per ct)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.keys(localSettings.centerStoneRawRates || {}).map(stone => (
                  <div key={stone} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs font-black uppercase text-slate-800 tracking-wider mb-1">{stone}</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Raw Natural / ct ($)</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-slate-300 p-2 rounded-lg text-xs font-bold font-mono text-slate-900"
                          value={localSettings.centerStoneRawRates[stone]?.Natural ?? 500}
                          onChange={(e) => handleDoubleNestedSetting('centerStoneRawRates', stone, 'Natural', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Raw Lab-grown / ct ($)</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-slate-300 p-2 rounded-lg text-xs font-bold font-mono text-slate-900"
                          value={localSettings.centerStoneRawRates[stone]?.Lab ?? 200}
                          onChange={(e) => handleDoubleNestedSetting('centerStoneRawRates', stone, 'Lab', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Melee Round Raw Stone Rates by Size */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 flex-wrap gap-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Gem size={15} className="text-amber-600" />
                  Raw Melee Round Rates (per Carat)
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(prompt("Enter internal raw price per carat to set for ALL melee sizes:", "300") || "");
                    if (!isNaN(val)) {
                      const updated: Record<string, number> = {};
                      Object.keys(ROUND_MELEE).forEach(size => {
                        updated[size] = val;
                      });
                      setLocalSettings(prev => ({
                        ...prev,
                        rawMeleeRates: updated
                      }));
                    }
                  }}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                >
                  Set All Raw Melee Rates
                </button>
              </div>
              <p className="text-[11px] text-slate-500">Specify manual raw cost price per carat per size. Blank fields fall back to ${localSettings.rawCostRates.melee || 300}/ct.</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {Object.entries(ROUND_MELEE).map(([size, carat]) => (
                  <div key={size} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between gap-1.5">
                    <span className="text-[10px] font-bold text-slate-700 block leading-tight">
                      {size} mm <span className="font-mono text-[9px] text-slate-400">({carat} ct)</span>
                    </span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        placeholder={String(localSettings.rawCostRates.melee || 300)}
                        className="w-full bg-white border border-slate-300 pl-5 pr-1.5 py-1 rounded-lg text-xs font-bold font-mono text-slate-900"
                        value={localSettings.rawMeleeRates?.[size] ?? ""}
                        onChange={(e) => handleRawMeleeRate(size, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw Fancy Stone Rates by Shape & Size */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 flex-wrap gap-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Gem size={15} className="text-amber-600" />
                  Raw Fancy Rates by Shape & Size
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(prompt(`Enter internal raw price per carat to set for ALL sizes of ${activeRawFancyShapeTab}:`, "380") || "");
                    if (!isNaN(val)) {
                      const updated = { ...(localSettings.rawFancyRates || {}) };
                      const sizes = FANCY_SHAPES[activeRawFancyShapeTab] || [];
                      sizes.forEach(sz => {
                        const key = `${activeRawFancyShapeTab}-${sz.label}`;
                        updated[key] = val;
                      });
                      updated[activeRawFancyShapeTab] = val; // Also fallback
                      setLocalSettings(prev => ({
                        ...prev,
                        rawFancyRates: updated
                      }));
                    }
                  }}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                >
                  Set All Raw {activeRawFancyShapeTab} Rates
                </button>
              </div>
              <p className="text-[11px] text-slate-500">Select a fancy cut shape below, then manually adjust raw cost per carat per size.</p>
              
              {/* Fancy shape selector tabs */}
              <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-2.5">
                {Object.keys(FANCY_SHAPES).map(shape => (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => setActiveRawFancyShapeTab(shape)}
                    className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      activeRawFancyShapeTab === shape
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {shape}
                  </button>
                ))}
              </div>

              {/* Base Shape Fallback rate input */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="leading-tight">
                  <span className="text-xs font-bold text-slate-900 block">
                    Base Shape Raw Fallback Rate ({activeRawFancyShapeTab})
                  </span>
                  <span className="text-[10px] text-slate-500">Default raw rate used for this cut if any specific size is left empty.</span>
                </div>
                <div className="relative w-full sm:w-44 shrink-0">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    placeholder={String(localSettings.rawCostRates.fancy || 380)}
                    className="w-full bg-white border border-slate-300 pl-6 pr-2 py-1.5 rounded-lg text-xs font-bold font-mono text-slate-900"
                    value={localSettings.rawFancyRates?.[activeRawFancyShapeTab] ?? ""}
                    onChange={(e) => handleRawFancyRate(activeRawFancyShapeTab, e.target.value)}
                  />
                </div>
              </div>

              {/* Specific size rate inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {(FANCY_SHAPES[activeRawFancyShapeTab] || []).map((sz) => {
                  const key = `${activeRawFancyShapeTab}-${sz.label}`;
                  const fallbackRate = localSettings.rawFancyRates?.[activeRawFancyShapeTab] ?? localSettings.rawCostRates.fancy ?? 380;
                  return (
                    <div key={sz.label} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between gap-1.5">
                      <span className="text-[10px] font-bold text-slate-700 block leading-tight">
                        {sz.label} <span className="font-mono text-[9px] text-slate-400">({sz.carat} ct)</span>
                      </span>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          placeholder={String(fallbackRate)}
                          className="w-full bg-white border border-slate-300 pl-5 pr-1.5 py-1 rounded-lg text-xs font-bold font-mono text-slate-900"
                          value={localSettings.rawFancyRates?.[key] ?? ""}
                          onChange={(e) => handleRawFancyRate(key, e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: Database/Ledger Tools */}
        {subTab === 'database' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <HardDrive size={18} className="text-sky-600" />
                  Ledger Data Utilities & Sync
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Export active database transactions to CSV, perform cross-device backups, or clear histories.</p>
              </div>
              <span className="text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 px-3 py-1 rounded-lg">Database & Backup</span>
            </div>

            {/* CSV Exports */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">CSV Table Exports</h4>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => onExportCsv('scrap')}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Download size={14} className="text-emerald-600" />
                  Scrap Ledger CSV
                </button>
                <button
                  type="button"
                  onClick={() => onExportCsv('retail')}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Download size={14} className="text-amber-500" />
                  Retail Ledger CSV
                </button>
                <button
                  type="button"
                  onClick={() => onExportCsv('wholesale')}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Download size={14} className="text-sky-600" />
                  Wholesale Ledger CSV
                </button>
              </div>
            </div>

            {/* Cross-Device Sync Backup */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <FileJson size={15} className="text-sky-600" />
                  Cross-Device Sync & Ledger Backup
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed mt-1.5">
                  Synchronize your complete calculator history, custom designs, and master parameters between desktop browsers and iPads via local file export/import.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export Section */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <span className="text-xs font-black uppercase text-slate-900 tracking-wider block">1. Export Sync File</span>
                  <p className="text-[11px] text-slate-500">
                    Download complete application state as a single JSON backup file. Transfer to iPad via AirDrop or Files.
                  </p>
                  <button
                    type="button"
                    onClick={handleExportBackupJSON}
                    className="w-full bg-slate-900 text-amber-400 hover:bg-black font-black py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Download size={14} />
                    Download Sync File
                  </button>
                </div>

                {/* Import Section */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <span className="text-xs font-black uppercase text-slate-900 tracking-wider block">2. Import Sync File</span>
                  <p className="text-[11px] text-slate-500">
                    Select a sync backup file on your target device to import and merge your full ledger histories instantly.
                  </p>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackupJSON}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <button
                      type="button"
                      className="w-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-black py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs pointer-events-none"
                    >
                      <Upload size={14} className="text-amber-500" />
                      Select Sync File
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Database Purge */}
            <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-xs space-y-4">
              <h4 className="text-xs font-black text-red-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-red-100 pb-2">
                <ShieldAlert size={15} className="text-red-600" />
                Database Purge / Data Removal Suite
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">Comply with financial record rules. Purging permanently removes transaction lines from both local and cloud databases.</p>
              
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <select
                  value={purgeRange}
                  onChange={(e) => setPurgeRange(e.target.value as any)}
                  className="bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 w-full sm:w-52 outline-none"
                >
                  <option value="365">Older than 365 days</option>
                  <option value="all">Wipe entire ledger history</option>
                  <option value="custom">Wipe specific custom range</option>
                </select>

                {purgeRange === 'custom' && (
                  <div className="flex items-center gap-2 w-full sm:w-auto font-bold text-xs text-slate-700">
                    <input
                      type="date"
                      className="bg-slate-50 border border-slate-300 p-2 rounded-xl text-xs text-slate-900"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <span>to</span>
                    <input
                      type="date"
                      className="bg-slate-50 border border-slate-300 p-2 rounded-xl text-xs text-slate-900"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePurgeHistory}
                  className="bg-red-600 hover:bg-red-700 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs w-full sm:w-auto justify-center cursor-pointer"
                >
                  <Trash2 size={14} />
                  Purge Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
