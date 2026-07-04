/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Coins, FileCheck, Landmark, Library, Settings, RefreshCw, 
  HelpCircle, Sparkles, Scale, Info, AlertCircle 
} from 'lucide-react';

// Types & Constants
import { 
  QuoteSession, ScrapTransaction, QuoteTransaction, AppSettings, 
  ScrapItem, JewelryItem 
} from './types';
import { DEFAULT_SETTINGS, TROY_ONCE_GRAMS, FANCY_SHAPES, ROUND_MELEE } from './constants';
import { getEmptyQuoteSession, upgradeRingData, calculateRingCost } from './utils';

// Modular Components
import ScrapCalculator from './components/ScrapCalculator';
import QuoteCalculator from './components/QuoteCalculator';
import LedgerView from './components/LedgerView';
import SettingsView from './components/SettingsView';
import Sketchpad from './components/Sketchpad';
import SpotPriceView from './components/SpotPriceView';
import CubanBraceletBuilder from './components/CubanBraceletBuilder';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'scrap' | 'quote' | 'wholesale' | 'spot' | 'cuban' | 'ledger' | 'settings'>('scrap');

  // Spot Rates & API credentials
  const [spotPrices, setSpotPrices] = useState({ gold: 2350, silver: 30, platinum: 1050 });
  const [lastUpdated, setLastUpdated] = useState('Manual Default');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [goldApiKey, setGoldApiKey] = useState('');

  // Quick Calculator state
  const [quickPurity, setQuickPurity] = useState('gold_14');
  const [quickGrams, setQuickGrams] = useState('');

  // Ledger Transactions (localStorage backed)
  const [scrapTransactions, setScrapTransactions] = useState<ScrapTransaction[]>([]);
  const [ringQuoteTransactions, setRingQuoteTransactions] = useState<QuoteTransaction[]>([]);
  const [wholesaleTransactions, setWholesaleTransactions] = useState<QuoteTransaction[]>([]);

  // Master settings
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Active custom quote sessions
  const [retailSession, setRetailSession] = useState<QuoteSession>(getEmptyQuoteSession());
  const [wholesaleSession, setWholesaleSession] = useState<QuoteSession>(getEmptyQuoteSession());

  // Sketchpad state triggers
  const [isSketching, setIsSketching] = useState(false);
  const [editingImageType, setEditingImageType] = useState<'sketch' | 'photo'>('sketch');
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);

  // Load persistence data on initialization
  useEffect(() => {
    try {
      const st = localStorage.getItem('gr_scrap_ledger');
      if (st) setScrapTransactions(JSON.parse(st));

      const rt = localStorage.getItem('gr_quote_ledger');
      if (rt) setRingQuoteTransactions(JSON.parse(rt));

      const wt = localStorage.getItem('gr_wholesale_ledger');
      if (wt) setWholesaleTransactions(JSON.parse(wt));

      const k = localStorage.getItem('gr_gold_api_key');
      if (k) setGoldApiKey(k);

      const s = localStorage.getItem('gr_master_settings');
      if (s) {
        const parsed = JSON.parse(s);
        setSettings(prev => ({
          ...prev,
          ...parsed,
          // ensure child objects are fully initialized to avoid missing attributes
          wholesale: { ...prev.wholesale, ...(parsed.wholesale || {}) },
          centerStoneRates: { ...prev.centerStoneRates, ...(parsed.centerStoneRates || {}) },
          centerStoneRawRates: { ...prev.centerStoneRawRates, ...(parsed.centerStoneRawRates || {}) },
          cubanMultipliers: parsed.cubanMultipliers || prev.cubanMultipliers || [
            { minWidth: 5, maxWidth: 7, multiplier: 1.8 },
            { minWidth: 8, maxWidth: 10, multiplier: 1.6 },
            { minWidth: 11, maxWidth: 13, multiplier: 1.5 },
            { minWidth: 14, maxWidth: 24, multiplier: 1.4 }
          ],
          tennisMultipliers: parsed.tennisMultipliers || prev.tennisMultipliers || [
            { minWidth: 1.0, maxWidth: 1.9, multiplier: 1.6 },
            { minWidth: 2.0, maxWidth: 4.0, multiplier: 1.4 }
          ],
          tennisDiamondPricePerCt: parsed.tennisDiamondPricePerCt !== undefined ? parsed.tennisDiamondPricePerCt : (prev.tennisDiamondPricePerCt !== undefined ? prev.tennisDiamondPricePerCt : 600)
        }));
      }
    } catch (e) {
      console.error("Local Storage Load Error:", e);
    }
  }, []);

  // Persist master settings on changes
  useEffect(() => {
    localStorage.setItem('gr_master_settings', JSON.stringify(settings));
  }, [settings]);

  // Fetch GoldAPI CAD Spot Indices
  const fetchLivePrices = async () => {
    if (!goldApiKey || goldApiKey === 'goldapi-472c240569490d4d25bde6da08749829-io') {
      alert("Please configure a valid GoldAPI.io Access Token in the Master Settings panel first.");
      return;
    }

    setSyncStatus("Syncing...");
    try {
      const headers = {
        'x-access-token': goldApiKey,
        'Content-Type': 'application/json'
      };

      const results = await Promise.all(
        ['XAU', 'XAG', 'XPT'].map(metal =>
          fetch(`https://www.goldapi.io/api/${metal}/CAD`, { headers }).then(r => r.json())
        )
      );

      // Verify that values are returned and not error codes
      if (results[0]?.price && results[1]?.price && results[2]?.price) {
        const spot = {
          gold: results[0].price,
          silver: results[1].price,
          platinum: results[2].price
        };
        setSpotPrices(spot);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastUpdated(timeStr);
        setSyncStatus(`Synced at ${timeStr}`);
      } else {
        throw new Error("Invalid response keys from GoldAPI. Check your quota/token.");
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
  const handleSaveScrap = (data: {
    name: string;
    phone: string;
    address: string;
    driversLicense: string;
    stoneRemovalQty: string;
    items: ScrapItem[];
    image: string | null;
  }) => {
    const logStr = data.items.map(i => `${i.weight}g ${i.material} (${i.purity}${i.material==='gold'?'k':''})`).join(', ');
    const totalVal = data.items.reduce((total, item) => {
      const w = parseFloat(item.weight) || 0;
      const s = (spotPrices[item.material] || 0) / TROY_ONCE_GRAMS;
      const pf = item.material === 'gold' ? item.purity / 24 : item.purity;
      return total + (w * pf * s * (item.rate / 100));
    }, 0);
    const finalTotal = Math.max(0, totalVal - (Number(data.stoneRemovalQty || 0) * 5)).toFixed(2);

    const newTx: ScrapTransaction = {
      id: Math.random().toString(36).substring(2, 11),
      date: new Date().toLocaleString(),
      name: data.name,
      phone: data.phone,
      address: data.address,
      driversLicense: data.driversLicense,
      stoneRemovalQty: data.stoneRemovalQty,
      spotPrices: { ...spotPrices },
      items: data.items,
      summary: logStr,
      total: finalTotal,
      image: data.image
    };

    setScrapTransactions(prev => {
      const updated = [newTx, ...prev];
      localStorage.setItem('gr_scrap_ledger', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSaveQuote = (isWholesale: boolean) => {
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
      const cost = calculateRingCost(r, settings, spotPrices, isWholesale ? 'wholesale' : 'retail', activeSession.overridePrices);
      gT += cost;
      const val = parseFloat(r.discount) || 0;
      tD += r.discountType === '%' ? cost * (val / 100) : val;
    });

    // Subtotal subtraction scrap
    const sub = Math.max(0, gT - tD - Number(activeSession.scrapCredit));
    const finalInvoiceAmount = sub + (activeSession.applyTax ? sub * 0.12 : 0);

    const nameToLog = activeSession.cName || (activeSession.jobNum ? `Job #${activeSession.jobNum}` : 'Wholesale Client');

    const newTx: QuoteTransaction = {
      id: activeSession.id,
      date: new Date().toLocaleString(),
      name: nameToLog,
      phone: activeSession.cPhone,
      summary: sum,
      total: `$${finalInvoiceAmount.toFixed(2)}`,
      fullData: JSON.parse(JSON.stringify(activeSession)),
      isWholesale
    };

    if (isWholesale) {
      setWholesaleTransactions(prev => {
        const idx = prev.findIndex(q => q.id === activeSession.id);
        let updated;
        if (idx >= 0) {
          updated = [...prev];
          updated[idx] = newTx;
        } else {
          updated = [newTx, ...prev];
        }
        localStorage.setItem('gr_wholesale_ledger', JSON.stringify(updated));
        return updated;
      });
      // reset session
      setWholesaleSession(getEmptyQuoteSession());
    } else {
      setRingQuoteTransactions(prev => {
        const idx = prev.findIndex(q => q.id === activeSession.id);
        let updated;
        if (idx >= 0) {
          updated = [...prev];
          updated[idx] = newTx;
        } else {
          updated = [newTx, ...prev];
        }
        localStorage.setItem('gr_quote_ledger', JSON.stringify(updated));
        return updated;
      });
      // reset session
      setRetailSession(getEmptyQuoteSession());
    }

    alert("Quote successfully logged into ledger ledger!");
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
      setWholesaleSession(fullData);
      setActiveTab('wholesale');
    } else {
      setRetailSession(fullData);
      setActiveTab('quote');
    }
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
    } else if (type === 'retail') {
      setRingQuoteTransactions(prev => {
        const updated = prev.filter(t => t.id !== id);
        localStorage.setItem('gr_quote_ledger', JSON.stringify(updated));
        return updated;
      });
    } else {
      setWholesaleTransactions(prev => {
        const updated = prev.filter(t => t.id !== id);
        localStorage.setItem('gr_wholesale_ledger', JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Sketchpad trigger handlers
  const handleSketchSave = (dataUrl: string) => {
    const isWholesale = activeTab === 'wholesale';
    const onChange = isWholesale ? setWholesaleSession : setRetailSession;

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
    }));

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
      
      {/* 1. TOP BRANDING NAV HEADER */}
      <header className="bg-brand-900 text-white shadow-md border-b border-brand-800 py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-brand-gold text-brand-900 p-2 rounded-xl shadow-md rotate-3 font-serif italic text-lg font-black">
              G&R
            </div>
            <div>
              <h1 className="font-serif italic font-black text-xl tracking-wide text-brand-gold">Gold & Rose Jewellery Corp</h1>
              <p className="text-[10px] text-brand-300 font-mono tracking-widest uppercase">Executive Dashboard Suite</p>
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
          <div className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm flex flex-wrap gap-4 items-center justify-between">
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
        <div className="flex overflow-x-auto hide-scrollbar whitespace-nowrap gap-1.5 border-b border-brand-200 pb-2">
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
            Wholesale Manufacturing
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
          {activeTab === 'scrap' && (
            <ScrapCalculator
              spotPrices={spotPrices}
              onUpdateSpotPrices={setSpotPrices}
              onSaveTransaction={handleSaveScrap}
              syncStatus={syncStatus}
              onFetchLivePrices={fetchLivePrices}
            />
          )}

          {activeTab === 'spot' && (
            <SpotPriceView
              spotPrices={spotPrices}
              onUpdateSpotPrices={setSpotPrices}
              syncStatus={syncStatus}
              onFetchLivePrices={fetchLivePrices}
            />
          )}

          {activeTab === 'cuban' && (
            <CubanBraceletBuilder
              spotPrices={spotPrices}
              settings={settings}
            />
          )}

          {activeTab === 'quote' && (
            <QuoteCalculator
              session={retailSession}
              onChangeSession={setRetailSession}
              onSaveQuote={() => handleSaveQuote(false)}
              onLaunchSketch={(type, index = null) => {
                setEditingImageType(type);
                setEditingImageIndex(index);
                setIsSketching(true);
              }}
              settings={settings}
              spotPrices={spotPrices}
              isWholesale={false}
            />
          )}

          {activeTab === 'wholesale' && (
            <QuoteCalculator
              session={wholesaleSession}
              onChangeSession={setWholesaleSession}
              onSaveQuote={() => handleSaveQuote(true)}
              onLaunchSketch={(type, index = null) => {
                setEditingImageType(type);
                setEditingImageIndex(index);
                setIsSketching(true);
              }}
              settings={settings}
              spotPrices={spotPrices}
              isWholesale={true}
            />
          )}

          {activeTab === 'ledger' && (
            <LedgerView
              scrapTransactions={scrapTransactions}
              ringQuoteTransactions={ringQuoteTransactions}
              wholesaleTransactions={wholesaleTransactions}
              onDeleteTransaction={handleDeleteLedgerItem}
              onLoadIntoEditor={handleLoadQuote}
              settings={settings}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={setSettings}
              goldApiKey={goldApiKey}
              onSaveApiKey={(key) => { setGoldApiKey(key); localStorage.setItem('gr_gold_api_key', key); }}
              onExportCsv={handleExportCsv}
              onClearHistory={handleClearHistory}
              spotPrices={spotPrices}
              onUpdateSpotPrices={setSpotPrices}
            />
          )}
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
    </div>
  );
}
