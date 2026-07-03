/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Save, Download, Trash2, Calendar, Settings, ShieldAlert, Key, 
  DollarSign, Wrench, Gem, HardDrive 
} from 'lucide-react';
import { AppSettings } from '../types';

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
  const [subTab, setSubTab] = useState<'rates' | 'retail' | 'wholesale' | 'database'>('rates');

  // Manual spot rates state
  const [manualGold, setManualGold] = useState(spotPrices.gold.toString());
  const [manualSilver, setManualSilver] = useState(spotPrices.silver.toString());
  const [manualPlatinum, setManualPlatinum] = useState(spotPrices.platinum.toString());

  // App Settings Local Edit State
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });

  // Database Purge Options
  const [purgeRange, setPurgeRange] = useState<'all' | '365' | 'custom'>('365');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <label className="text-[10px] font-bold text-brand-500 mb-1 block">Setting Fee (Melee / stone)</label>
                <input
                  type="number"
                  className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-sm font-bold"
                  value={localSettings.settingFeeMeleePerSt}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, settingFeeMeleePerSt: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {/* Toggle showRawCostOnQuoteTab */}
            <div className="flex items-center justify-between bg-brand-50/30 border border-brand-100 p-3.5 rounded-xl">
              <div>
                <span className="text-[10px] font-black text-brand-800 uppercase tracking-wider block">Show Internal Manufacturing Raw Cost</span>
                <span className="text-[9px] text-brand-500 block leading-tight">Display the amber raw cost breakdown box on the active custom quote tab.</span>
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
