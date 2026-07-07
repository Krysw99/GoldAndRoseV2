/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Save, Download, Trash2, Calendar, Settings, ShieldAlert, Key, 
  DollarSign, Wrench, Gem, HardDrive, EyeOff, Upload, FileJson
} from 'lucide-react';
import { AppSettings } from '../types';
import { ROUND_MELEE, FANCY_SHAPES } from '../constants';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  goldApiKey: string;
  onSaveApiKey: (key: string) => void;
  onExportCsv: (type: 'scrap' | 'retail' | 'wholesale') => void;
  onClearHistory: (range: 'all' | '365' | 'custom', startDate?: string, endDate?: string) => void;
  spotPrices: { gold: number; silver: number; platinum: number };
  onUpdateSpotPrices: (spot: { gold: number; silver: number; platinum: number }) => void;
}

export default function SettingsView({
  settings,
  onSaveSettings,
  goldApiKey,
  onSaveApiKey,
  onExportCsv,
  onClearHistory,
  spotPrices,
  onUpdateSpotPrices
}: SettingsViewProps) {
  // Key state
  const [apiKey, setApiKey] = useState(goldApiKey);
  const [subTab, setSubTab] = useState<'rates' | 'retail' | 'wholesale' | 'database' | 'rawCosts'>('rates');

  // Manual spot rates state
  const [manualGold, setManualGold] = useState(spotPrices.gold.toString());
  const [manualSilver, setManualSilver] = useState(spotPrices.silver.toString());
  const [manualPlatinum, setManualPlatinum] = useState(spotPrices.platinum.toString());

  // App Settings Local Edit State
  const [localSettings, setLocalSettings] = useState<AppSettings>(() => ({
    ...settings,
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

  // Wholesale stone rate custom sizes
  const [activeFancyShapeTab, setActiveFancyShapeTab] = useState<string>('Princess');
  
  // Raw cost custom sizes
  const [activeRawFancyShapeTab, setActiveRawFancyShapeTab] = useState<string>('Princess');

  // Cross-Device Synchronization Backup/Restore Utilities
  const handleExportBackupJSON = () => {
    const backupData = {
      scrapLedger: localStorage.getItem('gr_scrap_ledger') || '[]',
      quoteLedger: localStorage.getItem('gr_quote_ledger') || '[]',
      wholesaleLedger: localStorage.getItem('gr_wholesale_ledger') || '[]',
      masterSettings: localStorage.getItem('gr_master_settings') || '{}',
      cubanEstimates: localStorage.getItem('gr_cuban_estimates') || '[]',
      goldApiKey: localStorage.getItem('gr_gold_api_key') || '',
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
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json.scrapLedger && !json.quoteLedger && !json.wholesaleLedger) {
          alert("Invalid backup file format. Could not find ledger keys.");
          return;
        }

        if (window.confirm("This will merge or overwrite your current local ledger history and settings with the data in this backup file. Proceed?")) {
          if (json.scrapLedger) localStorage.setItem('gr_scrap_ledger', json.scrapLedger);
          if (json.quoteLedger) localStorage.setItem('gr_quote_ledger', json.quoteLedger);
          if (json.wholesaleLedger) localStorage.setItem('gr_wholesale_ledger', json.wholesaleLedger);
          if (json.masterSettings && json.masterSettings !== '{}') localStorage.setItem('gr_master_settings', json.masterSettings);
          if (json.cubanEstimates) localStorage.setItem('gr_cuban_estimates', json.cubanEstimates);
          if (json.goldApiKey) localStorage.setItem('gr_gold_api_key', json.goldApiKey);

          alert("Sync data successfully imported! The application will now reload to apply all synced records.");
          window.location.reload();
        }
      } catch (err) {
        alert("Error parsing backup file: " + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.readAsText(file);
  };

  const handleSaveAll = () => {
    // Apply manual spot rate updates
    const g = parseFloat(manualGold) || spotPrices.gold;
    const s = parseFloat(manualSilver) || spotPrices.silver;
    const p = parseFloat(manualPlatinum) || spotPrices.platinum;
    onUpdateSpotPrices({ gold: g, silver: s, platinum: p });

    // Save Gold API Key
    onSaveApiKey(apiKey);

    // Save Master Settings
    onSaveSettings(localSettings);

    alert("Master parameters saved successfully and applied globally!");
  };

  const handleNestedSetting = (section: keyof AppSettings, field: string, value: number) => {
    setLocalSettings(prev => {
      const target = prev[section];
      if (typeof target === 'object' && target !== null) {
        return {
          ...prev,
          [section]: {
            ...target,
            [field]: value
          }
        };
      }
      return prev;
    });
  };

  const handleDoubleNestedSetting = (section: 'centerStoneRates' | 'centerStoneRawRates', stoneType: string, origin: 'Natural' | 'Lab', value: number) => {
    setLocalSettings(prev => {
      const rates = prev[section];
      return {
        ...prev,
        [section]: {
          ...rates,
          [stoneType]: {
            ...rates[stoneType],
            [origin]: value
          }
        }
      };
    });
  };

  const handleWholesaleSetting = (field: string, value: number) => {
    setLocalSettings(prev => ({
      ...prev,
      wholesale: {
        ...prev.wholesale,
        [field]: value
      }
    }));
  };

  const handleWholesaleMeleeRate = (size: string, value: number) => {
    setLocalSettings(prev => ({
      ...prev,
      wholesale: {
        ...prev.wholesale,
        meleeRates: {
          ...(prev.wholesale.meleeRates || {}),
          [size]: value
        }
      }
    }));
  };

  const handleWholesaleFancyRate = (key: string, value: number) => {
    setLocalSettings(prev => ({
      ...prev,
      wholesale: {
        ...prev.wholesale,
        fancyRates: {
          ...(prev.wholesale.fancyRates || {}),
          [key]: value
        }
      }
    }));
  };

  const handleRawMeleeRate = (size: string, value: number) => {
    setLocalSettings(prev => ({
      ...prev,
      rawMeleeRates: {
        ...(prev.rawMeleeRates || {}),
        [size]: value
      }
    }));
  };

  const handleRawFancyRate = (key: string, value: number) => {
    setLocalSettings(prev => ({
      ...prev,
      rawFancyRates: {
        ...(prev.rawFancyRates || {}),
        [key]: value
      }
    }));
  };

  const handleUpdateCubanMultiplier = (index: number, field: 'minWidth' | 'maxWidth' | 'multiplier', value: number) => {
    setLocalSettings(prev => {
      const updated = [...(prev.cubanMultipliers || [])];
      updated[index] = {
        ...updated[index],
        [field]: value
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

  const handleUpdateTennisMultiplier = (index: number, field: 'minWidth' | 'maxWidth' | 'multiplier', value: number) => {
    setLocalSettings(prev => {
      const updated = [...(prev.tennisMultipliers || [])];
      updated[index] = {
        ...updated[index],
        [field]: value
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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fadeIn">
      {/* Settings Navigation Rails */}
      <div className="md:col-span-1 bg-white p-4 rounded-2xl border border-brand-100 shadow-sm flex flex-col gap-1">
        <h3 className="text-[10px] font-black text-brand-400 uppercase tracking-widest px-3 mb-2">Master Panels</h3>
        <button
          type="button"
          onClick={() => setSubTab('rates')}
          className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${subTab === 'rates' ? 'bg-brand-900 text-white shadow-md' : 'text-brand-600 hover:bg-brand-50'}`}
        >
          <DollarSign size={14} className={subTab === 'rates' ? 'text-brand-gold' : 'text-brand-400'} />
          Spot & API Keys
        </button>
        <button
          type="button"
          onClick={() => setSubTab('retail')}
          className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${subTab === 'retail' ? 'bg-brand-900 text-white shadow-md' : 'text-brand-600 hover:bg-brand-50'}`}
        >
          <Wrench size={14} className={subTab === 'retail' ? 'text-brand-gold' : 'text-brand-400'} />
          Retail Multipliers
        </button>
        <button
          type="button"
          onClick={() => setSubTab('wholesale')}
          className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${subTab === 'wholesale' ? 'bg-brand-900 text-white shadow-md' : 'text-brand-600 hover:bg-brand-50'}`}
        >
          <Gem size={14} className={subTab === 'wholesale' ? 'text-brand-gold' : 'text-brand-400'} />
          Wholesale Model
        </button>
        <button
          type="button"
          onClick={() => setSubTab('rawCosts')}
          className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 ${subTab === 'rawCosts' ? 'bg-brand-900 text-white shadow-md' : 'text-brand-600 hover:bg-brand-50'}`}
        >
          <div className="flex items-center gap-2">
            <EyeOff size={14} className={subTab === 'rawCosts' ? 'text-brand-gold' : 'text-brand-400'} />
            <span>Internal Mfg Costs</span>
          </div>
          <span className="text-[7px] bg-amber-500 text-brand-950 font-black px-1.5 py-0.5 rounded-full uppercase scale-90">Eyes Only</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('database')}
          className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${subTab === 'database' ? 'bg-brand-900 text-white shadow-md' : 'text-brand-600 hover:bg-brand-50'}`}
        >
          <HardDrive size={14} className={subTab === 'database' ? 'text-brand-gold' : 'text-brand-400'} />
          Ledger Utilities
        </button>

        <div className="border-t border-brand-100 my-4 pt-4">
          <button
            type="button"
            onClick={handleSaveAll}
            className="w-full bg-brand-900 text-brand-gold hover:bg-brand-950 font-black py-3 rounded-xl shadow-md text-xs uppercase tracking-widest flex items-center justify-center gap-1 transition-all"
          >
            <Save size={13} />
            Save Changes
          </button>
        </div>
      </div>

      {/* Settings Panel Content */}
      <div className="md:col-span-3 bg-white p-6 rounded-2xl border border-brand-100 shadow-sm min-h-[450px]">
        {/* SUBTAB 1: Rates & Keys */}
        {subTab === 'rates' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-sm font-black text-brand-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Key size={16} className="text-brand-gold" />
                Spot Feed Configuration
              </h2>
              <p className="text-xs text-brand-500">Manage real-time gold pricing tokens and manual backup overrides.</p>
            </div>

            {/* Gold API Key Input */}
            <div className="bg-brand-50 p-4 rounded-xl border border-brand-100 space-y-2">
              <label className="text-[10px] font-black text-brand-700 uppercase tracking-wider block">GoldAPI.io Access Token</label>
              <input
                type="text"
                placeholder="Enter goldapi-xxx token"
                className="w-full bg-white border border-brand-200 p-3 rounded-xl text-xs font-mono font-bold"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-[10px] text-brand-400 italic">Leaves blank or enter custom tokens. Spot price updates rely on standard CAD valuations.</p>
            </div>

            {/* Manual Spot Price Overrides */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-brand-800 uppercase tracking-widest border-b border-brand-100 pb-2">Manual Metal Spot Price Overrides (CAD)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Gold spot / oz</label>
                  <input
                    type="number"
                    className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold no-spinner"
                    value={manualGold}
                    onChange={(e) => setManualGold(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Silver spot / oz</label>
                  <input
                    type="number"
                    className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold no-spinner"
                    value={manualSilver}
                    onChange={(e) => setManualSilver(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Platinum spot / oz</label>
                  <input
                    type="number"
                    className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold no-spinner"
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
            <div>
              <h2 className="text-sm font-black text-brand-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Wrench size={16} className="text-brand-gold" />
                Retail Multipliers & Setting Fees
              </h2>
              <p className="text-xs text-brand-500">Configure global retail markup variables and gem setting labor parameters.</p>
            </div>

            {/* Basic setting fees */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-brand-500 mb-1 block">Setting Fee (Center / ct)</label>
                <input
                  type="number"
                  className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                  value={localSettings.settingFeeCenterPerCt}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, settingFeeCenterPerCt: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-brand-500 mb-1 block">Setting Fee (Fancy / stone)</label>
                <input
                  type="number"
                  className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                  value={localSettings.settingFeeFancyPerSt !== undefined ? localSettings.settingFeeFancyPerSt : 25}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, settingFeeFancyPerSt: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-brand-500 mb-1 block">Setting Fee (Melee / stone)</label>
                <input
                  type="number"
                  className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                  value={localSettings.settingFeeMeleePerSt}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, settingFeeMeleePerSt: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {/* Retail Metal Spot Premiums */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-brand-800 uppercase tracking-widest border-b border-brand-100 pb-2">Retail Metal Spot Premiums (per Oz)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Gold Spot Premium / oz</label>
                  <input
                    type="number"
                    className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                    value={localSettings.retailGoldPremium !== undefined ? localSettings.retailGoldPremium : 100}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, retailGoldPremium: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Silver Spot Premium / oz</label>
                  <input
                    type="number"
                    className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                    value={localSettings.retailSilverPremium !== undefined ? localSettings.retailSilverPremium : 20}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, retailSilverPremium: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Platinum Spot Premium / oz</label>
                  <input
                    type="number"
                    className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                    value={localSettings.retailPlatinumPremium !== undefined ? localSettings.retailPlatinumPremium : 100}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, retailPlatinumPremium: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>

            {/* Standard Melee Stone Retail Supply Rates */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-brand-800 uppercase tracking-widest border-b border-brand-100 pb-2">Stone Supply Retail Rates (per ct)</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Ring Melee / ct</label>
                  <input
                    type="number"
                    className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                    value={localSettings.meleePricePerCt}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, meleePricePerCt: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Ring Fancy / ct</label>
                  <input
                    type="number"
                    className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                    value={localSettings.fancyPricePerCt}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, fancyPricePerCt: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Earrings Melee / ct</label>
                  <input
                    type="number"
                    className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                    value={localSettings.earringMeleePricePerCt}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, earringMeleePricePerCt: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Earrings Fancy / ct</label>
                  <input
                    type="number"
                    className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                    value={localSettings.earringFancyPricePerCt}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, earringFancyPricePerCt: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>

            {/* Standard Center stone rates matrix */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-brand-800 uppercase tracking-widest border-b border-brand-100 pb-2">Center Stone Retail Rates matrix (per ct)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.keys(localSettings.centerStoneRates).map(stone => (
                  <div key={stone} className="p-3 bg-brand-50 rounded-xl border border-brand-100 space-y-2">
                    <p className="text-[10px] font-black uppercase text-brand-700 tracking-wider mb-1">{stone}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-brand-500">Natural / ct</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-brand-200 p-2 rounded-lg text-xs font-bold"
                          value={localSettings.centerStoneRates[stone].Natural}
                          onChange={(e) => handleDoubleNestedSetting('centerStoneRates', stone, 'Natural', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-brand-500">Lab-grown / ct</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-brand-200 p-2 rounded-lg text-xs font-bold"
                          value={localSettings.centerStoneRates[stone].Lab}
                          onChange={(e) => handleDoubleNestedSetting('centerStoneRates', stone, 'Lab', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Standard Retail Gold Pricing Matrix */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-brand-800 uppercase tracking-widest border-b border-brand-100 pb-2">Retail Gold grams values</h4>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[10, 14, 18, 19, 22, 24].map(karat => (
                  <div key={karat}>
                    <label className="text-[9px] font-bold text-brand-500 mb-0.5 block">{karat}k / gram</label>
                    <input
                      type="number"
                      className="w-full bg-brand-50/50 border border-brand-200 p-2 rounded-xl text-xs font-bold"
                      value={localSettings.goldPricesPerGram[karat] || ''}
                      onChange={(e) => handleNestedSetting('goldPricesPerGram', karat.toString(), parseFloat(e.target.value) || 0)}
                    />
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
                          onChange={(e) => handleUpdateCubanMultiplier(index, 'minWidth', parseFloat(e.target.value) || 0)}
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
                          onChange={(e) => handleUpdateCubanMultiplier(index, 'maxWidth', parseFloat(e.target.value) || 0)}
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
                        onChange={(e) => handleUpdateCubanMultiplier(index, 'multiplier', parseFloat(e.target.value) || 0)}
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
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, tennisDiamondPricePerCt: parseFloat(e.target.value) || 0 }))}
                  />
                  <span className="text-[9px] text-brand-400 mt-1 block">Default price for all diamond sizes ($600)</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Melee Price / ct</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-brand-200 p-2.5 rounded-xl text-xs font-bold"
                    value={localSettings.tennisMeleePricePerCt !== undefined ? localSettings.tennisMeleePricePerCt : 2600}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, tennisMeleePricePerCt: parseFloat(e.target.value) || 0 }))}
                  />
                  <span className="text-[9px] text-brand-400 mt-1 block">Used if diamond override is not set ($2,600)</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Fancy Price / ct</label>
                  <input
                    type="number"
                    className="w-full bg-white border border-brand-200 p-2.5 rounded-xl text-xs font-bold"
                    value={localSettings.tennisFancyPricePerCt !== undefined ? localSettings.tennisFancyPricePerCt : 800}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, tennisFancyPricePerCt: parseFloat(e.target.value) || 0 }))}
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
                          onChange={(e) => handleUpdateTennisMultiplier(index, 'minWidth', parseFloat(e.target.value) || 0)}
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
                          onChange={(e) => handleUpdateTennisMultiplier(index, 'maxWidth', parseFloat(e.target.value) || 0)}
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
                        onChange={(e) => handleUpdateTennisMultiplier(index, 'multiplier', parseFloat(e.target.value) || 0)}
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-brand-500 mb-1 block">Gold Spot Premium / oz</label>
                <input
                  type="number"
                  className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                  value={localSettings.wholesale.goldSpotPremium}
                  onChange={(e) => handleWholesaleSetting('goldSpotPremium', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-brand-500 mb-1 block">Fabrication Labor / gram</label>
                <input
                  type="number"
                  className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                  value={localSettings.wholesale.laborPerGram}
                  onChange={(e) => handleWholesaleSetting('laborPerGram', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-brand-500 mb-1 block">Standard Custom CAD Fee</label>
                <input
                  type="number"
                  className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                  value={localSettings.wholesale.designFee}
                  onChange={(e) => handleWholesaleSetting('designFee', parseFloat(e.target.value) || 0)}
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
                    value={localSettings.wholesale.settingMelee}
                    onChange={(e) => handleWholesaleSetting('settingMelee', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Fancy stone setting</label>
                  <input
                    type="number"
                    className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                    value={localSettings.wholesale.settingFancy}
                    onChange={(e) => handleWholesaleSetting('settingFancy', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Center stone setting</label>
                  <input
                    type="number"
                    className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                    value={localSettings.wholesale.settingCenter}
                    onChange={(e) => handleWholesaleSetting('settingCenter', parseFloat(e.target.value) || 0)}
                  />
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
                      setLocalSettings(prev => ({
                        ...prev,
                        wholesale: {
                          ...prev.wholesale,
                          meleeRates: updated
                        }
                      }));
                    }
                  }}
                  className="text-[10px] text-brand-600 hover:text-brand-900 font-bold underline cursor-pointer"
                >
                  Set All Melee Rates
                </button>
              </div>
              <p className="text-[10px] text-brand-500">Specify the manual wholesale price per carat for each round melee diameter size. Empty fields fall back to $400/ct.</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {Object.entries(ROUND_MELEE).map(([size, carat]) => (
                  <div key={size} className="bg-white p-2 rounded-xl border border-brand-100/85 shadow-xs flex flex-col justify-between gap-1.5">
                    <span className="text-[10px] font-bold text-brand-600 block leading-tight">
                      {size} mm <span className="font-mono text-[9px] text-brand-400">({carat} ct)</span>
                    </span>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-brand-400">$</span>
                      <input
                        type="number"
                        placeholder="400"
                        className="w-full bg-brand-50/20 border border-brand-200 pl-4.5 pr-1.5 py-1 rounded-lg text-xs font-bold font-mono"
                        value={localSettings.wholesale.meleeRates?.[size] ?? ""}
                        onChange={(e) => handleWholesaleMeleeRate(size, parseFloat(e.target.value) || 0)}
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
                      const updated = { ...(localSettings.wholesale.fancyRates || {}) };
                      const sizes = FANCY_SHAPES[activeFancyShapeTab] || [];
                      sizes.forEach(sz => {
                        const key = `${activeFancyShapeTab}-${sz.label}`;
                        updated[key] = val;
                      });
                      updated[activeFancyShapeTab] = val; // Also fallback
                      setLocalSettings(prev => ({
                        ...prev,
                        wholesale: {
                          ...prev.wholesale,
                          fancyRates: updated
                        }
                      }));
                    }
                  }}
                  className="text-[10px] text-brand-600 hover:text-brand-900 font-bold underline cursor-pointer"
                >
                  Set All {activeFancyShapeTab} Rates
                </button>
              </div>
              <p className="text-[10px] text-brand-500">Select a fancy cut shape below, then manually adjust the wholesale price per carat for each size specification.</p>
              
              {/* Fancy shape selector tabs */}
              <div className="flex flex-wrap gap-1 border-b border-brand-100/50 pb-2">
                {Object.keys(FANCY_SHAPES).map(shape => (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => setActiveFancyShapeTab(shape)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      activeFancyShapeTab === shape
                        ? 'bg-brand-900 text-brand-gold shadow-xs'
                        : 'bg-white text-brand-600 border border-brand-100 hover:bg-brand-50'
                    }`}
                  >
                    {shape}
                  </button>
                ))}
              </div>

              {/* Base Shape Fallback rate input */}
              <div className="bg-white p-3 rounded-xl border border-brand-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="leading-tight">
                  <span className="text-[11px] font-bold text-brand-800 block">
                    Base Shape Fallback Rate ({activeFancyShapeTab})
                  </span>
                  <span className="text-[9px] text-brand-400">Default rate used for this cut if any specific size is left empty.</span>
                </div>
                <div className="relative w-full sm:w-44 shrink-0">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-400">$</span>
                  <input
                    type="number"
                    placeholder="500"
                    className="w-full bg-brand-50/20 border border-brand-200 pl-6 pr-2 py-1 rounded-lg text-xs font-bold font-mono"
                    value={localSettings.wholesale.fancyRates?.[activeFancyShapeTab] ?? ""}
                    onChange={(e) => handleWholesaleFancyRate(activeFancyShapeTab, parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Specific size rate inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {(FANCY_SHAPES[activeFancyShapeTab] || []).map((sz) => {
                  const key = `${activeFancyShapeTab}-${sz.label}`;
                  const fallbackRate = localSettings.wholesale.fancyRates?.[activeFancyShapeTab] ?? 500;
                  return (
                    <div key={sz.label} className="bg-white p-2 rounded-xl border border-brand-100/85 shadow-xs flex flex-col justify-between gap-1.5">
                      <span className="text-[10px] font-bold text-brand-600 block leading-tight">
                        {sz.label} <span className="font-mono text-[9px] text-brand-400">({sz.carat} ct)</span>
                      </span>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-brand-400">$</span>
                        <input
                          type="number"
                          placeholder={String(fallbackRate)}
                          className="w-full bg-brand-50/20 border border-brand-200 pl-4.5 pr-1.5 py-1 rounded-lg text-xs font-bold font-mono"
                          value={localSettings.wholesale.fancyRates?.[key] ?? ""}
                          onChange={(e) => handleWholesaleFancyRate(key, parseFloat(e.target.value) || 0)}
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
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <div className="space-y-1">
                <h2 className="text-sm font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <EyeOff size={16} className="text-amber-600" />
                  CONFIDENTIAL: Internal Manufacturing & Raw Costs
                </h2>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  These rates represent the absolute minimum cost of materials and labor (for internal tracking only).
                  These configurations are used to compute the <strong>Raw Cost CAD</strong> and must <strong>never</strong> be shown to clients.
                </p>
              </div>
            </div>

            {/* Toggle showRawCostOnQuoteTab */}
            <div className="flex items-center justify-between bg-amber-50/50 border border-amber-200 p-3.5 rounded-xl">
              <div>
                <span className="text-[10px] font-black text-amber-950 uppercase tracking-wider block flex items-center gap-1.5">
                  <EyeOff size={14} className="text-amber-600" />
                  Show Internal Manufacturing Raw Cost Box
                </span>
                <span className="text-[9px] text-amber-700 block leading-tight">Display the confidential amber raw cost breakdown box on the active custom quote tab.</span>
              </div>
              <button
                type="button"
                onClick={() => setLocalSettings(prev => ({ ...prev, showRawCostOnQuoteTab: !prev.showRawCostOnQuoteTab }))}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${localSettings.showRawCostOnQuoteTab ? 'bg-brand-900' : 'bg-brand-200'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${localSettings.showRawCostOnQuoteTab ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {/* Base Fallback Raw Cost Rates */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-brand-800 uppercase tracking-widest border-b border-brand-100 pb-2">Base Fallback Raw Rates (per ct)</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Base Melee Raw / ct</label>
                  <input
                    type="number"
                    className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                    value={localSettings.rawCostRates.melee}
                    onChange={(e) => handleNestedSetting('rawCostRates', 'melee', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Base Fancy Raw / ct</label>
                  <input
                    type="number"
                    className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                    value={localSettings.rawCostRates.fancy}
                    onChange={(e) => handleNestedSetting('rawCostRates', 'fancy', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-brand-500 mb-1 block">Base Center Raw / ct</label>
                  <input
                    type="number"
                    className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                    value={localSettings.rawCostRates.center}
                    onChange={(e) => handleNestedSetting('rawCostRates', 'center', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* Center Stone Raw Rates Matrix */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-brand-800 uppercase tracking-widest border-b border-brand-100 pb-2">Center Stone Raw Rates Matrix (per ct)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.keys(localSettings.centerStoneRawRates || {}).map(stone => (
                  <div key={stone} className="p-3 bg-brand-50 rounded-xl border border-brand-100 space-y-2">
                    <p className="text-[10px] font-black uppercase text-brand-700 tracking-wider mb-1">{stone}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-brand-500">Raw Natural / ct</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-brand-200 p-2 rounded-lg text-xs font-bold"
                          value={localSettings.centerStoneRawRates[stone]?.Natural ?? 500}
                          onChange={(e) => handleDoubleNestedSetting('centerStoneRawRates', stone, 'Natural', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-brand-500">Raw Lab-grown / ct</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-brand-200 p-2 rounded-lg text-xs font-bold"
                          value={localSettings.centerStoneRawRates[stone]?.Lab ?? 200}
                          onChange={(e) => handleDoubleNestedSetting('centerStoneRawRates', stone, 'Lab', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Melee Round Raw Stone Rates by Size */}
            <div className="bg-brand-50/30 p-4 rounded-2xl border border-brand-100 space-y-3">
              <div className="flex justify-between items-center border-b border-brand-100 pb-2 flex-wrap gap-2">
                <h4 className="text-xs font-black text-brand-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Gem size={13} className="text-brand-gold" />
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
                  className="text-[10px] text-brand-600 hover:text-brand-900 font-bold underline cursor-pointer"
                >
                  Set All Raw Melee Rates
                </button>
              </div>
              <p className="text-[10px] text-brand-500">Specify the manual raw cost price per carat for each round melee diameter size. Empty fields fall back to ${localSettings.rawCostRates.melee || 300}/ct.</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {Object.entries(ROUND_MELEE).map(([size, carat]) => (
                  <div key={size} className="bg-white p-2 rounded-xl border border-brand-100/85 shadow-xs flex flex-col justify-between gap-1.5">
                    <span className="text-[10px] font-bold text-brand-600 block leading-tight">
                      {size} mm <span className="font-mono text-[9px] text-brand-400">({carat} ct)</span>
                    </span>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-brand-400">$</span>
                      <input
                        type="number"
                        placeholder={String(localSettings.rawCostRates.melee || 300)}
                        className="w-full bg-brand-50/20 border border-brand-200 pl-4.5 pr-1.5 py-1 rounded-lg text-xs font-bold font-mono"
                        value={localSettings.rawMeleeRates?.[size] ?? ""}
                        onChange={(e) => handleRawMeleeRate(size, parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw Fancy Stone Rates by Shape & Size */}
            <div className="bg-brand-50/30 p-4 rounded-2xl border border-brand-100 space-y-3">
              <div className="flex justify-between items-center border-b border-brand-100 pb-2 flex-wrap gap-2">
                <h4 className="text-xs font-black text-brand-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Gem size={13} className="text-brand-gold" />
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
                  className="text-[10px] text-brand-600 hover:text-brand-900 font-bold underline cursor-pointer"
                >
                  Set All Raw {activeRawFancyShapeTab} Rates
                </button>
              </div>
              <p className="text-[10px] text-brand-500">Select a fancy cut shape below, then manually adjust the raw cost price per carat for each size specification.</p>
              
              {/* Fancy shape selector tabs */}
              <div className="flex flex-wrap gap-1 border-b border-brand-100/50 pb-2">
                {Object.keys(FANCY_SHAPES).map(shape => (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => setActiveRawFancyShapeTab(shape)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      activeRawFancyShapeTab === shape
                        ? 'bg-brand-900 text-brand-gold shadow-xs'
                        : 'bg-white text-brand-600 border border-brand-100 hover:bg-brand-50'
                    }`}
                  >
                    {shape}
                  </button>
                ))}
              </div>

              {/* Base Shape Fallback rate input */}
              <div className="bg-white p-3 rounded-xl border border-brand-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="leading-tight">
                  <span className="text-[11px] font-bold text-brand-800 block">
                    Base Shape Raw Fallback Rate ({activeRawFancyShapeTab})
                  </span>
                  <span className="text-[9px] text-brand-400">Default raw rate used for this cut if any specific size is left empty.</span>
                </div>
                <div className="relative w-full sm:w-44 shrink-0">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-400">$</span>
                  <input
                    type="number"
                    placeholder={String(localSettings.rawCostRates.fancy || 380)}
                    className="w-full bg-brand-50/20 border border-brand-200 pl-6 pr-2 py-1 rounded-lg text-xs font-bold font-mono"
                    value={localSettings.rawFancyRates?.[activeRawFancyShapeTab] ?? ""}
                    onChange={(e) => handleRawFancyRate(activeRawFancyShapeTab, parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Specific size rate inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {(FANCY_SHAPES[activeRawFancyShapeTab] || []).map((sz) => {
                  const key = `${activeRawFancyShapeTab}-${sz.label}`;
                  const fallbackRate = localSettings.rawFancyRates?.[activeRawFancyShapeTab] ?? localSettings.rawCostRates.fancy ?? 380;
                  return (
                    <div key={sz.label} className="bg-white p-2 rounded-xl border border-brand-100/85 shadow-xs flex flex-col justify-between gap-1.5">
                      <span className="text-[10px] font-bold text-brand-600 block leading-tight">
                        {sz.label} <span className="font-mono text-[9px] text-brand-400">({sz.carat} ct)</span>
                      </span>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-brand-400">$</span>
                        <input
                          type="number"
                          placeholder={String(fallbackRate)}
                          className="w-full bg-brand-50/20 border border-brand-200 pl-4.5 pr-1.5 py-1 rounded-lg text-xs font-bold font-mono"
                          value={localSettings.rawFancyRates?.[key] ?? ""}
                          onChange={(e) => handleRawFancyRate(key, parseFloat(e.target.value) || 0)}
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
            <div>
              <h2 className="text-sm font-black text-brand-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <HardDrive size={16} className="text-brand-gold" />
                Ledger Data Utilities
              </h2>
              <p className="text-xs text-brand-500">Export active database transactions to CSV formats or clear histories.</p>
            </div>

            {/* CSV Exports */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-brand-800 uppercase tracking-widest border-b border-brand-100 pb-2">CSV Table Exports</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onExportCsv('scrap')}
                  className="bg-brand-50 hover:bg-brand-100 border border-brand-200 px-4 py-2.5 rounded-xl text-xs font-bold text-brand-700 flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Download size={13} className="text-green-600" />
                  Scrap Ledger CSV
                </button>
                <button
                  type="button"
                  onClick={() => onExportCsv('retail')}
                  className="bg-brand-50 hover:bg-brand-100 border border-brand-200 px-4 py-2.5 rounded-xl text-xs font-bold text-brand-700 flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Download size={13} className="text-brand-gold" />
                  Retail Ledger CSV
                </button>
                <button
                  type="button"
                  onClick={() => onExportCsv('wholesale')}
                  className="bg-brand-50 hover:bg-brand-100 border border-brand-200 px-4 py-2.5 rounded-xl text-xs font-bold text-brand-700 flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Download size={13} className="text-blue-600" />
                  Wholesale Ledger CSV
                </button>
              </div>
            </div>

            {/* Cross-Device Sync Backup */}
            <div className="bg-brand-50 p-5 rounded-2xl border border-brand-200/80 space-y-4">
              <div>
                <h4 className="text-xs font-black text-brand-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-brand-100 pb-2">
                  <FileJson size={14} className="text-brand-gold" />
                  Cross-Device Sync & Ledger Backup
                </h4>
                <p className="text-[11px] text-brand-600 leading-relaxed mt-1">
                  Since you opted out of cloud databases, you can synchronize your complete calculator history, custom jewellery designs, and settings between your <strong>computers and iPad</strong> entirely for free.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export Section */}
                <div className="bg-white p-4 rounded-xl border border-brand-100 space-y-2">
                  <span className="text-[10px] font-black uppercase text-brand-700 tracking-wider block">1. Export Sync File</span>
                  <p className="text-[10px] text-brand-400">
                    Download your entire application history as a single file. Send it to your other devices using AirDrop, email, or a flash drive.
                  </p>
                  <button
                    type="button"
                    onClick={handleExportBackupJSON}
                    className="w-full bg-brand-900 text-brand-gold hover:bg-brand-950 font-black py-2.5 rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Download size={12} />
                    Download Sync File
                  </button>
                </div>

                {/* Import Section */}
                <div className="bg-white p-4 rounded-xl border border-brand-100 space-y-2">
                  <span className="text-[10px] font-black uppercase text-brand-700 tracking-wider block">2. Import Sync File</span>
                  <p className="text-[10px] text-brand-400">
                    Choose a sync backup file on your target device (iPad or another computer) to import and merge your full ledger histories instantly.
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
                      className="w-full bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 font-black py-2.5 rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-sm pointer-events-none"
                    >
                      <Upload size={12} className="text-brand-gold" />
                      Select Sync File
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Database Purge */}
            <div className="bg-red-50/50 p-5 rounded-2xl border border-red-200/80 space-y-4">
              <h4 className="text-xs font-black text-red-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-red-100 pb-2">
                <ShieldAlert size={14} className="text-red-600" />
                Database Purge / Data Removal Suite
              </h4>
              <p className="text-[11px] text-red-700 leading-relaxed">Ensure complying with local financial records laws. Purging will delete client and payout ledger lines permanently.</p>
              
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <select
                  value={purgeRange}
                  onChange={(e) => setPurgeRange(e.target.value as any)}
                  className="bg-white border border-brand-200 px-3 py-2.5 rounded-xl text-xs font-bold w-full sm:w-48 outline-none"
                >
                  <option value="365">Older than 365 days</option>
                  <option value="all">Wipe entire ledger history</option>
                  <option value="custom">Wipe specific custom range</option>
                </select>

                {purgeRange === 'custom' && (
                  <div className="flex items-center gap-2 w-full sm:w-auto font-bold text-xs text-brand-500">
                    <input
                      type="date"
                      className="bg-white border border-brand-200 p-2 rounded-xl text-xs"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <span>to</span>
                    <input
                      type="date"
                      className="bg-white border border-brand-200 p-2 rounded-xl text-xs"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePurgeHistory}
                  className="bg-red-600 hover:bg-red-700 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md w-full sm:w-auto justify-center"
                >
                  <Trash2 size={13} />
                  Purge Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
