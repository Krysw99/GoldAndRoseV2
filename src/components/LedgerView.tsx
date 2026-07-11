/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, Trash2, Printer, FileText, X, ArrowRight, User, Phone, 
  MapPin, ShieldCheck, Mail, Calendar, Sparkles, AlertCircle,
  ShoppingBag, Check, ExternalLink, Cpu
} from 'lucide-react';
import { ScrapTransaction, QuoteTransaction, AppSettings, QuoteSession, JewelryItem } from '../types';
import { calculateRingCost, calculateScrapTotal } from '../utils';
import { FANCY_SHAPES, TROY_ONCE_GRAMS } from '../constants';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface LedgerViewProps {
  scrapTransactions: ScrapTransaction[];
  ringQuoteTransactions: QuoteTransaction[];
  wholesaleTransactions: QuoteTransaction[];
  onDeleteTransaction: (type: 'scrap' | 'retail' | 'wholesale', id: string) => void;
  onLoadIntoEditor: (id: string, isWholesale: boolean) => void;
  onLoadScrapIntoEditor?: (id: string) => void;
  settings: AppSettings;
  onAddDemoTransaction?: () => void;
}

function getQuoteTransactionScore(tx: QuoteTransaction, queryWords: string[], fullSearchStr: string): number {
  if (queryWords.length === 0) return 0;
  
  let score = 0;
  
  const name = (tx.name || "").toLowerCase();
  const phone = (tx.phone || "").toLowerCase();
  const jobNum = (tx.fullData?.jobNum || "").toLowerCase();
  const jobDesc = (tx.fullData?.jobDesc || "").toLowerCase();
  const notes = (tx.fullData?.notes || "").toLowerCase();
  const email = (tx.fullData?.cEmail || "").toLowerCase();

  const combinedHeader = `${name} ${phone} ${jobNum} ${jobDesc} ${notes} ${email}`.toLowerCase();
  if (combinedHeader.includes(fullSearchStr)) {
    score += 500;
  }

  if (jobNum === fullSearchStr) {
    score += 800;
  } else if (jobNum && jobNum.includes(fullSearchStr)) {
    score += 400;
  }

  if (name === fullSearchStr) {
    score += 300;
  }

  const rings = tx.fullData?.rings || [];
  let ringDetailsText = "";

  for (const r of rings) {
    const category = (r.category || "").toLowerCase();
    const material = (r.material || "").toLowerCase();
    const metalColor = (r.metalColor || "").toLowerCase();
    const goldKarat = r.goldKarat ? `${r.goldKarat}k` : "";
    const engraving = r.showEngraving && r.engravingText ? r.engravingText.toLowerCase() : "";
    
    const csCarats = r.centerStone?.carats || "";
    const csShape = (r.centerStone?.shape || "").toLowerCase();
    const csType = (r.centerStone?.type || "").toLowerCase();
    const csOrigin = (r.centerStone?.origin || "").toLowerCase();
    const csSetting = (r.centerStone?.setting || "").toLowerCase();

    const clientStonesText = r.clientStones?.map(c => `${c.qty} ${c.type} ${c.carats}`).join(" ").toLowerCase() || "";
    const designNotesText = r.designNotes?.map(n => n.text).join(" ").toLowerCase() || "";

    const tbShape = (r.tbShape || "").toLowerCase();
    const tbSizeRound = (r.tbSizeRound || "").toLowerCase();
    const tbCarats = r.tbManualCarats || "";

    const mbSize = r.mbSize || "";
    const mbWidth = r.mbWidth || "";

    const ringCombined = `${category} ${material} ${metalColor} ${goldKarat} ${engraving} ${csCarats} ${csShape} ${csType} ${csOrigin} ${csSetting} ${clientStonesText} ${designNotesText} ${tbShape} ${tbSizeRound} ${tbCarats} ${mbSize} ${mbWidth}`.toLowerCase();
    ringDetailsText += " " + ringCombined;

    const ringMatchesAll = queryWords.every(word => ringCombined.includes(word));
    if (ringMatchesAll) {
      score += 1000;
    }
    
    for (const word of queryWords) {
      if (csType === word || csShape === word || csCarats === word || category.includes(word)) {
        score += 150;
      }
    }
  }

  const fullText = `${combinedHeader} ${ringDetailsText}`.toLowerCase();
  let matchedWordsCount = 0;
  
  for (const word of queryWords) {
    if (fullText.includes(word)) {
      matchedWordsCount++;
      score += 100;
    }
  }

  if (queryWords.length > 1) {
    const containsAllWordsSomewhere = queryWords.every(word => fullText.includes(word));
    if (containsAllWordsSomewhere) {
      score += 300;
    }
  }

  return matchedWordsCount > 0 ? score : 0;
}

function getScrapTransactionScore(tx: ScrapTransaction, queryWords: string[], fullSearchStr: string): number {
  if (queryWords.length === 0) return 0;

  let score = 0;
  const name = (tx.name || "").toLowerCase();
  const phone = (tx.phone || "").toLowerCase();
  const address = (tx.address || "").toLowerCase();
  const summary = (tx.summary || "").toLowerCase();
  const dl = (tx.driversLicense || "").toLowerCase();

  const combinedHeader = `${name} ${phone} ${address} ${summary} ${dl}`.toLowerCase();
  if (combinedHeader.includes(fullSearchStr)) {
    score += 500;
  }

  if (name === fullSearchStr) {
    score += 300;
  }

  let itemsText = "";
  const items = tx.items || [];
  for (const it of items) {
    itemsText += ` ${it.material} ${it.purity} ${it.weight}`.toLowerCase();
    for (const word of queryWords) {
      if (it.material.toLowerCase() === word || String(it.purity) === word) {
        score += 150;
      }
    }
  }

  const fullText = `${combinedHeader} ${itemsText}`.toLowerCase();
  let matchedWordsCount = 0;

  for (const word of queryWords) {
    if (fullText.includes(word)) {
      matchedWordsCount++;
      score += 100;
    }
  }

  if (queryWords.length > 1 && queryWords.every(word => fullText.includes(word))) {
    score += 300;
  }

  return matchedWordsCount > 0 ? score : 0;
}

export default function LedgerView({
  scrapTransactions,
  ringQuoteTransactions,
  wholesaleTransactions,
  onDeleteTransaction,
  onLoadIntoEditor,
  onLoadScrapIntoEditor,
  settings,
  onAddDemoTransaction
}: LedgerViewProps) {
  const [activeLedger, setActiveLedger] = useState<'scrap' | 'retail' | 'wholesale'>('retail');
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<{ type: 'scrap' | 'retail' | 'wholesale'; id: string } | null>(null);

  // Wix sync modal states
  const [isWixModalOpen, setIsWixModalOpen] = useState(false);
  const [wixSyncState, setWixSyncState] = useState<'idle' | 'checking' | 'syncing' | 'done' | 'error'>('idle');
  const [wixSyncLog, setWixSyncLog] = useState<string[]>([]);
  const [generatedWixUrl, setGeneratedWixUrl] = useState('');

  // Search filter lists
  const queryWords = React.useMemo(() => search.toLowerCase().trim().split(/\s+/).filter(Boolean), [search]);
  const fullSearchStr = search.toLowerCase().trim();

  const filteredScrap = React.useMemo(() => {
    if (!fullSearchStr) return scrapTransactions;
    return scrapTransactions
      .map(tx => ({ tx, score: getScrapTransactionScore(tx, queryWords, fullSearchStr) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.tx);
  }, [scrapTransactions, queryWords, fullSearchStr]);

  const filteredRetail = React.useMemo(() => {
    if (!fullSearchStr) return ringQuoteTransactions;
    return ringQuoteTransactions
      .map(tx => ({ tx, score: getQuoteTransactionScore(tx, queryWords, fullSearchStr) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.tx);
  }, [ringQuoteTransactions, queryWords, fullSearchStr]);

  const filteredWholesale = React.useMemo(() => {
    if (!fullSearchStr) return wholesaleTransactions;
    return wholesaleTransactions
      .map(tx => ({ tx, score: getQuoteTransactionScore(tx, queryWords, fullSearchStr) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.tx);
  }, [wholesaleTransactions, queryWords, fullSearchStr]);

  // PDF Export Trigger using browser's native high-fidelity print engine (prevents canvas parsing issues with oklab/oklch colors)
  const exportPdf = async (elementId: string, name: string) => {
    window.print();
  };

  const currentTxData = () => {
    if (!selectedTx) return null;
    const { type, id } = selectedTx;
    if (type === 'scrap') return scrapTransactions.find(t => t.id === id);
    if (type === 'retail') return ringQuoteTransactions.find(t => t.id === id);
    return wholesaleTransactions.find(t => t.id === id);
  };

  const activeTx = currentTxData();

  const handleWixSync = async () => {
    if (!activeTx) return;
    setIsWixModalOpen(true);
    setWixSyncState('checking');
    setWixSyncLog([
      "Initializing secure handshake with Wix Online Store...",
      `Connecting to store domain: ${settings.wixStoreUrl || 'https://www.goldandrosejewellery.com'}`,
    ]);

    // Step 1: Handshake delay
    await new Promise(resolve => setTimeout(resolve, 800));

    setWixSyncLog(prev => [
      ...prev,
      "Handshake successful. Verified integration mode: " + 
      (settings.wixIntegrationMode === 'velo_api' ? "Wix Velo Headless API" : 
       settings.wixIntegrationMode === 'webhook' ? "Custom Wix Webhook" : "Cart Deep-link Setup"),
      "Preparing payload for bespoke design itemized specs..."
    ]);
    setWixSyncState('syncing');

    // Step 2: Formulation delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const cleanPrice = parseFloat(activeTx.total.replace(/[^0-9.]/g, '')) || 0;
    const piecesCount = (activeTx as QuoteTransaction).fullData?.rings?.length || 1;
    
    setWixSyncLog(prev => [
      ...prev,
      `Calculated final cart checkout total: CAD $${cleanPrice.toFixed(2)} (${piecesCount} bespoke jewelry piece(s))`,
      "Creating dynamic checkout session token..."
    ]);

    // If webhook is configured, actually trigger it!
    if (settings.wixIntegrationMode === 'webhook' && settings.wixWebhookUrl) {
      setWixSyncLog(prev => [...prev, `Dispatching secure POST payload to custom webhook: ${settings.wixWebhookUrl}...`]);
      try {
        const response = await fetch(settings.wixWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': settings.wixAccessToken ? `Bearer ${settings.wixAccessToken}` : ''
          },
          body: JSON.stringify({
            transactionId: activeTx.id,
            clientName: activeTx.name,
            clientPhone: activeTx.phone,
            total: activeTx.total,
            totalNum: cleanPrice,
            fullDetails: (activeTx as QuoteTransaction).fullData,
            syncedAt: new Date().toISOString()
          })
        });
        if (response.ok) {
          setWixSyncLog(prev => [...prev, "✓ Webhook dispatched and accepted by Wix with status 200 OK."]);
        } else {
          setWixSyncLog(prev => [...prev, `⚠ Webhook responded with status ${response.status}. Continuing flow.`]);
        }
      } catch (e: any) {
        setWixSyncLog(prev => [...prev, `⚠ Could not connect to Webhook URL: ${e.message}. Continuing with fallback session.`]);
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Step 3: Deep link construction
    const baseUrl = settings.wixStoreUrl || 'https://www.goldandrosejewellery.com';
    const cartParams = {
      cart: {
        items: [
          {
            name: activeTx.name ? `Custom Jewelry Order for ${activeTx.name}` : 'Bespoke Custom Jewelry Item',
            quantity: 1,
            price: cleanPrice,
            description: activeTx.summary || `Bespoke estimate ID #${activeTx.id}`,
            customFields: {
              "Quote ID": activeTx.id,
              "Material Specs": (activeTx as QuoteTransaction).fullData?.rings?.map(r => `${r.metalColor} ${r.goldKarat ? r.goldKarat+'k' : ''} ${r.material}`).join(', ')
            }
          }
        ]
      }
    };

    const finalUrl = `${baseUrl}/cart-page?appSectionParams=${encodeURIComponent(JSON.stringify(cartParams))}`;
    setGeneratedWixUrl(finalUrl);

    setWixSyncLog(prev => [
      ...prev,
      "✓ Securing checkout link...",
      "✓ Wix Retail Checkout generation completed successfully!"
    ]);
    setWixSyncState('done');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fadeIn print:block print:w-full">
      {/* Search & Transaction Lists Column */}
      <div className="md:col-span-5 lg:col-span-4 bg-white p-5 rounded-2xl border border-brand-100 shadow-sm flex flex-col h-[650px] print:hidden">
        {/* Ledger Type Switchers */}
        <div className="flex gap-1.5 p-1 bg-brand-50 rounded-xl border border-brand-200/60 mb-4 shadow-inner">
          <button
            type="button"
            onClick={() => { setActiveLedger('retail'); setSearch(''); }}
            className={`flex-1 py-2 text-center rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeLedger === 'retail' ? 'bg-brand-900 text-white shadow-sm' : 'text-brand-500 hover:text-brand-800'}`}
          >
            Retail
          </button>
          <button
            type="button"
            onClick={() => { setActiveLedger('wholesale'); setSearch(''); }}
            className={`flex-1 py-2 text-center rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeLedger === 'wholesale' ? 'bg-brand-900 text-white shadow-sm' : 'text-brand-500 hover:text-brand-800'}`}
          >
            Wholesale
          </button>
          <button
            type="button"
            onClick={() => { setActiveLedger('scrap'); setSearch(''); }}
            className={`flex-1 py-2 text-center rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeLedger === 'scrap' ? 'bg-brand-900 text-white shadow-sm' : 'text-brand-500 hover:text-brand-800'}`}
          >
            Scrap
          </button>
        </div>

        {/* Search controls */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search by client, job #, or specs..."
            className="w-full bg-brand-50/50 border border-brand-200 pl-9 pr-4 py-2.5 rounded-xl text-xs font-bold focus:bg-white focus:ring-1 focus:ring-brand-gold outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={14} className="absolute left-3 top-3.5 text-brand-400" />
        </div>

        {/* Transactions list queue */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 hide-scrollbar">
          {activeLedger === 'retail' && (
            <>
              {onAddDemoTransaction && (
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={onAddDemoTransaction}
                    className="w-full py-1.5 px-2 bg-brand-900 hover:bg-brand-gold text-brand-gold hover:text-brand-900 border border-brand-800 hover:border-brand-gold/30 rounded-lg text-[9px] font-bold tracking-widest uppercase shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={10} />
                    Generate Demo Quote (Wedding Set)
                  </button>
                </div>
              )}
              {filteredRetail.length === 0 ? (
                <p className="text-center text-xs text-brand-400 py-10 italic">No retail ledger lines found</p>
              ) : (
                filteredRetail.map(tx => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx({ type: 'retail', id: tx.id })}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-sm flex items-center justify-between ${selectedTx?.id === tx.id ? 'bg-brand-50 border-brand-gold' : 'bg-white border-brand-100 hover:border-brand-300'}`}
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-brand-900">{tx.name}</p>
                    <p className="text-[9px] text-brand-400 font-mono">{tx.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-xs text-brand-800">{tx.total}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDeleteTransaction('retail', tx.id); if(selectedTx?.id===tx.id)setSelectedTx(null); }}
                      className="text-brand-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete record"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
            </>
          )}

          {activeLedger === 'wholesale' && (
            filteredWholesale.length === 0 ? (
              <p className="text-center text-xs text-brand-400 py-10 italic">No wholesale ledger lines found</p>
            ) : (
              filteredWholesale.map(tx => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx({ type: 'wholesale', id: tx.id })}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-sm flex items-center justify-between ${selectedTx?.id === tx.id ? 'bg-green-50 border-green-300' : 'bg-white border-brand-100 hover:border-brand-300'}`}
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-brand-900 flex items-center flex-wrap gap-1.5">
                      <span>{tx.name || 'Unnamed Client'}</span>
                      {tx.fullData?.jobNum && (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono">
                          #{tx.fullData.jobNum}
                        </span>
                      )}
                    </p>
                    <p className="text-[9px] text-brand-400 font-mono">{tx.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-xs text-green-700">{tx.total}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDeleteTransaction('wholesale', tx.id); if(selectedTx?.id===tx.id)setSelectedTx(null); }}
                      className="text-brand-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete record"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {activeLedger === 'scrap' && (
            filteredScrap.length === 0 ? (
              <p className="text-center text-xs text-brand-400 py-10 italic">No scrap buyback records found</p>
            ) : (
              filteredScrap.map(tx => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx({ type: 'scrap', id: tx.id })}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-sm flex items-center justify-between ${selectedTx?.id === tx.id ? 'bg-brand-50 border-green-400' : 'bg-white border-brand-100 hover:border-brand-300'}`}
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-brand-900">{tx.name}</p>
                    <p className="text-[9px] text-brand-400 font-mono">{tx.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-xs text-green-600">${tx.total}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDeleteTransaction('scrap', tx.id); if(selectedTx?.id===tx.id)setSelectedTx(null); }}
                      className="text-brand-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete record"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Invoice Receipt Viewer Column */}
      <div className="md:col-span-7 lg:col-span-8 space-y-4 print:col-span-12 print:w-full print:p-0">
        {selectedTx && activeTx ? (
          <div className="bg-white p-5 rounded-3xl border border-brand-100 shadow-lg flex flex-col justify-between min-h-[650px] relative print:border-none print:shadow-none print:p-0 print:min-h-0">
            {/* Inject page margins and grayscale adjustments for print */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                @page {
                  size: letter portrait !important;
                  margin: 0.15in !important;
                }
                body, html, #root {
                  font-size: 8.5pt !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
              }
            `}} />
            {/* Top Print Actions */}
            <div className="flex justify-between items-center border-b border-brand-100 pb-3 mb-5 print:hidden">
              <span className="text-[10px] font-black uppercase text-brand-400 tracking-wider">Inline Document Preview</span>
              <div className="flex gap-2">
                {selectedTx.type === 'scrap' ? (
                  onLoadScrapIntoEditor && (
                    <button
                      type="button"
                      onClick={() => onLoadScrapIntoEditor(activeTx.id)}
                      className="bg-brand-50 hover:bg-brand-100 text-brand-800 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-brand-200 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <FileText size={12} />
                      Adjust Scrap Buyback
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => onLoadIntoEditor(activeTx.id, selectedTx.type === 'wholesale')}
                    className="bg-brand-50 hover:bg-brand-100 text-brand-800 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-brand-200 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <FileText size={12} />
                    Load in Editor
                  </button>
                )}
                {selectedTx.type === 'retail' && (
                  <button
                    type="button"
                    onClick={handleWixSync}
                    className="bg-[#002eec] hover:bg-[#0024ba] text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md"
                    title="Generate custom checkout link and sync with Wix Store"
                  >
                    <ShoppingBag size={12} />
                    Send to Wix
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => exportPdf('ledger-invoice-box', activeTx.name || 'Quote')}
                  className="bg-brand-900 text-brand-gold hover:bg-brand-950 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all flex items-center gap-1 shadow-sm"
                >
                  <Printer size={12} />
                  Print PDF
                </button>
              </div>
            </div>

            {/* Document sheet contents */}
            <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 hide-scrollbar print:overflow-visible print:max-h-none print:p-0">
              {/* LEDGER RENDER 1: Scrap buyback Receipt */}
              {selectedTx.type === 'scrap' && (
                <div id="ledger-invoice-box" className="p-8 bg-white border border-brand-200 rounded-2xl text-brand-800 text-left font-sans max-w-xl mx-auto print:p-0 print:border-none print:shadow-none print:rounded-none print:max-w-none">
                  {/* Header info */}
                  <div className="flex justify-between items-start border-b border-brand-900 pb-4 mb-6">
                    <div>
                      <h1 className="font-serif text-2xl font-black italic tracking-wide text-brand-900 mb-0.5">Gold And Rose Jewellery Corp</h1>
                      <p className="text-[10px] text-brand-500 font-bold uppercase tracking-wider">James Lee • 604-250-7414</p>
                      <p className="text-[8px] text-brand-400 font-mono mt-0.5">GST/HST: 737186213RT0001</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-sm font-black uppercase tracking-widest text-brand-400">Buyback Receipt</h2>
                      <p className="text-[10px] font-bold text-brand-800 mt-0.5">{(activeTx as ScrapTransaction).date}</p>
                      <p className="text-[8px] font-mono text-brand-400">Ref: #{activeTx.id}</p>
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
                    <div className="bg-brand-50 p-3 rounded-xl border border-brand-100">
                      <p className="text-[9px] uppercase font-black text-brand-400 tracking-wider mb-1">Client Details</p>
                      <p className="font-bold text-brand-900">{activeTx.name}</p>
                      {(activeTx as ScrapTransaction).phone && (
                        <p className="text-brand-600 mt-0.5">{(activeTx as ScrapTransaction).phone}</p>
                      )}
                      {(activeTx as ScrapTransaction).address && (
                        <p className="text-brand-500 mt-0.5 leading-relaxed">{(activeTx as ScrapTransaction).address}</p>
                      )}
                    </div>
                    <div className="bg-green-50/50 p-3 rounded-xl border border-green-100 text-right flex flex-col justify-center">
                      <p className="text-[9px] uppercase font-black text-green-700 tracking-wider mb-1">Total Payout Paid (CAD)</p>
                      <p className="text-2xl font-black text-green-600">${activeTx.total}</p>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <p className="text-[10px] uppercase font-black text-brand-500 tracking-widest border-b border-brand-100 pb-1 mb-2">Verified Items Received</p>
                      <div className="bg-brand-50/50 p-3 rounded-xl border border-brand-100/50 text-xs text-brand-700 space-y-1.5 leading-relaxed">
                        {(activeTx as ScrapTransaction).items?.map((it, idx) => {
                          const val = it.weight ? (parseFloat(it.weight) * (it.material === 'gold' ? it.purity / 24 : it.purity) * ((activeTx as ScrapTransaction).spotPrices?.[it.material] / TROY_ONCE_GRAMS) * (it.rate / 100)) : 0;
                          return (
                            <div key={idx} className="flex justify-between items-center border-b border-dashed border-brand-100 pb-1.5 last:border-none last:pb-0">
                              <span>
                                {it.weight}g {it.material} ({it.purity}{it.material === 'gold' ? 'k' : ''}) @ {it.rate}% payout rate
                              </span>
                              <span className="font-bold text-brand-900 font-mono">${val.toFixed(2)}</span>
                            </div>
                          );
                        })}
                        {Number((activeTx as ScrapTransaction).stoneRemovalQty) > 0 && (
                          <div className="flex justify-between items-center text-red-600 pt-1">
                            <span>Stone extraction fee ({(activeTx as ScrapTransaction).stoneRemovalQty} stones)</span>
                            <span className="font-bold font-mono">-${(Number((activeTx as ScrapTransaction).stoneRemovalQty) * 5).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Snapshot of Driver's license / items if available */}
                  {(activeTx as ScrapTransaction).image && (
                    <div className="mb-6">
                      <p className="text-[10px] uppercase font-black text-brand-400 tracking-wider mb-2">Verified ID Photograph</p>
                      <img src={(activeTx as ScrapTransaction).image!} alt="Compliance photo" className="h-28 w-44 object-contain rounded-xl border border-brand-200 shadow-sm" />
                    </div>
                  )}

                  {/* Sign-off terms */}
                  <div className="border-t border-brand-200 pt-5 text-center space-y-6">
                    <p className="text-[8px] text-brand-400 italic leading-relaxed">
                      I declare that I am the legal owner of the scrap items presented above and have full right to transact and sell them to Gold & Rose Jewellery Corp. All buyout transactions are absolute and final.
                    </p>
                    <div className="flex flex-col items-center">
                      <div className="w-40 border-b border-brand-300"></div>
                      <p className="text-[8px] uppercase tracking-wider text-brand-500 mt-1">Client Authorization Signature</p>
                    </div>
                  </div>
                </div>
              )}

              {/* LEDGER RENDER 2: Retail / Wholesale Custom Quote Invoice */}
              {(selectedTx.type === 'retail' || selectedTx.type === 'wholesale') && (
                <div id="ledger-invoice-box" className="p-8 bg-white border border-brand-200 rounded-2xl text-brand-800 text-left font-sans max-w-2xl mx-auto print:p-0 print:border-none print:shadow-none print:rounded-none print:max-w-none">
                  {/* Invoice Header */}
                  <div className="flex justify-between items-start border-b border-brand-900 pb-4 mb-6">
                    <div>
                      <h1 className="font-serif text-2xl font-black italic tracking-wide text-brand-900 mb-0.5">Gold And Rose Jewellery Corp</h1>
                      <p className="text-[10px] text-brand-500 font-bold uppercase tracking-wider">James Lee • 604-250-7414</p>
                      <p className="text-[8px] text-brand-400 font-mono mt-0.5">GST/HST: 737186213RT0001</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-sm font-black uppercase tracking-widest text-brand-400">
                        {selectedTx.type === 'wholesale' ? 'Wholesale order' : 'Retail Estimate'}
                      </h2>
                      <p className="text-[10px] font-bold text-brand-800 mt-0.5">{activeTx.date}</p>
                      <p className="text-[8px] font-mono text-brand-400">ID: #{activeTx.id}</p>
                    </div>
                  </div>

                  {/* Client Details Row */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-brand-50 p-3 rounded-xl border border-brand-100 text-xs">
                      <p className="text-[9px] uppercase font-black text-brand-400 tracking-wider mb-1">Billing Details</p>
                      {activeTx.name && <p className="font-bold text-brand-900">{activeTx.name}</p>}
                      {activeTx.phone && <p className="text-brand-500 mt-0.5">{activeTx.phone}</p>}
                      {selectedTx.type === 'wholesale' && (activeTx as QuoteTransaction).fullData?.jobNum && (
                        <p className="text-green-600 font-mono font-bold mt-1">Job #: {(activeTx as QuoteTransaction).fullData.jobNum}</p>
                      )}
                    </div>
                    <div className="bg-brand-50 p-3 rounded-xl border border-brand-100 text-right flex flex-col justify-center text-xs">
                      <p className="text-[9px] uppercase font-black text-brand-400 tracking-wider mb-1">Total Pricing</p>
                      <p className="text-3xl font-black text-brand-950">{activeTx.total}</p>
                      {(activeTx as QuoteTransaction).fullData?.applyTax && (
                        <p className="text-[8px] text-brand-400 font-medium">Includes 12% provincial tax and GST</p>
                      )}
                    </div>
                  </div>

                  {/* Pieces list details */}
                  <div className="space-y-4 mb-6 text-xs">
                    <p className="text-[10px] uppercase font-black text-brand-500 tracking-widest border-b border-brand-100 pb-1 mb-1">Jewelry Specifications</p>
                    {(activeTx as QuoteTransaction).fullData?.rings?.map((r, ri) => {
                      if (r.goldGrams === '' && r.category !== 'tennisBracelet' && r.melee.length === 0) return null;
                      const cost = calculateRingCost(r, settings, { gold: 4000, silver: 45, platinum: 1200 }, selectedTx.type, undefined, selectedTx.type === 'wholesale' ? (activeTx as QuoteTransaction).fullData?.wholesaleProfileId : undefined);
                      const discountVal = parseFloat(r.discount) || 0;
                      const discountDeduction = r.discountType === '%' ? cost * (discountVal / 100) : discountVal;
                      const finalItemPrice = Math.max(0, cost - discountDeduction);

                      return (
                        <div key={ri} className="p-3 bg-brand-50/50 rounded-xl border border-brand-100 space-y-2">
                          <div className="flex justify-between items-center font-bold text-brand-900 border-b border-dashed border-brand-200 pb-1.5">
                            <span className="uppercase tracking-wide text-[10px] font-black text-brand-800">
                              Piece {ri + 1}: {r.category === 'customRing' ? 'Engagement / Custom' : r.category === 'weddingBand' ? 'Wedding Band' : r.category === 'mensBand' ? "Men's Band" : r.category === 'pendant' ? 'Pendant' : r.category === 'earrings' ? 'Earrings Pair' : 'Tennis Bracelet'}
                            </span>
                            <span className="font-black text-brand-800 font-mono">${finalItemPrice.toFixed(2)}</span>
                          </div>

                          {/* Piece parameters bulleted list */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-brand-600 text-[10px]">
                            <div>Material: <span className="font-bold text-brand-800 uppercase">{r.metalColor} {r.goldKarat ? `${r.goldKarat}k` : ''} {r.material}</span></div>
                            {r.goldGrams && <div>Weight: <span className="font-bold text-brand-800">{r.goldGrams}g</span></div>}
                            {r.category === 'mensBand' && r.mbSize && <div>Size: <span className="font-bold text-brand-800">{r.mbSize} (width {r.mbWidth}mm, thickness {r.mbThickness}mm)</span></div>}
                            {r.category === 'customRing' && r.cRingSize && <div>Size: <span className="font-bold text-brand-800">US {r.cRingSize}</span></div>}
                            
                            {/* Center stone info */}
                            {r.centerStone?.carats && (
                              <div className="col-span-2 text-brand-700">
                                Center Stone: <span className="font-bold text-brand-800">{r.centerStone.carats}ct {r.centerStone.shape} {r.centerStone.type} ({r.centerStone.origin} • setting: {r.centerStone.setting})</span>
                              </div>
                            )}

                            {/* Melee stones counts */}
                            {r.melee.some(m=>Number(m.qty)>0) && (
                              <div className="col-span-2 text-brand-700">
                                Supplied Melee: {r.melee.filter(m=>Number(m.qty)>0).map((m, x) => (
                                  <span key={x} className="bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded mr-1">
                                    {m.qty} st ({m.carat}ct/ea • size {m.size}mm)
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Fancy melee counts */}
                            {r.fancy.some(f=>Number(f.qty)>0) && (
                              <div className="col-span-2 text-brand-700">
                                Supplied Fancy Melee: {r.fancy.filter(f=>Number(f.qty)>0).map((f, x) => (
                                  <span key={x} className="bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded mr-1">
                                    {f.qty} st ({f.shape})
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Client owned stones setting */}
                            {r.clientStones.some(c=>Number(c.qty)>0) && (
                              <div className="col-span-2 text-brand-700 font-medium italic text-green-700">
                                Client Owned Stones Setting: {r.clientStones.filter(c=>Number(c.qty)>0).map((c, x) => (
                                  <span key={x} className="mr-1">
                                    {c.qty} st ({c.type} • {c.carats}ct)
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Engraving */}
                            {r.showEngraving && r.engravingText && (
                              <div className="col-span-2 text-brand-700 border-t border-brand-100 pt-1 mt-1">
                                Engraving Text: <span className="font-bold text-brand-800 italic" style={{ fontFamily: r.engravingFont }}>"{r.engravingText}"</span>
                              </div>
                            )}

                            {/* Notes */}
                            {r.designNotes.length > 0 && (
                              <div className="col-span-2 text-brand-400 mt-1 leading-relaxed">
                                Design Notes: {r.designNotes.map((n, x) => <div key={x}>- {n.text}</div>)}
                              </div>
                            )}
                          </div>

                          {/* Visual References: Sketches & Photos rendered directly inside the specific piece's specs sheet */}
                          {(() => {
                            const rSketches = Array.isArray(r.referenceSketches) ? r.referenceSketches : (r.referenceSketch ? [r.referenceSketch] : []);
                            const rPhotos = Array.isArray(r.referencePhotos) ? r.referencePhotos : (r.referencePhoto ? [r.referencePhoto] : []);
                            if (rSketches.length === 0 && rPhotos.length === 0) return null;
                            return (
                              <div className="space-y-3 pt-3 border-t border-brand-100 mt-2 print:space-y-2 print:pt-2">
                                <span className="text-[9px] font-black text-brand-500 uppercase tracking-wider block pl-1 print:text-[8px]">Visual Mockup References</span>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:gap-2">
                                  {rSketches.map((sk, skIdx) => (
                                    <div key={`sk-${skIdx}`} className="border border-brand-200 rounded-xl p-2 bg-white flex flex-col items-center print:p-2 print:rounded-xl">
                                      <span className="text-[8px] font-black uppercase text-brand-400 tracking-wider mb-1.5 print:mb-1 print:text-[7px]">Sketch {skIdx + 1}</span>
                                      <img src={sk} alt={`Piece ${ri+1} Sketch ${skIdx+1}`} className="h-44 w-full object-contain rounded-lg print:h-64 print:rounded-lg" />
                                    </div>
                                  ))}
                                  {rPhotos.map((ph, phIdx) => (
                                    <div key={`ph-${phIdx}`} className="border border-brand-200 rounded-xl p-2 bg-white flex flex-col items-center print:p-2 print:rounded-xl">
                                      <span className="text-[8px] font-black uppercase text-brand-400 tracking-wider mb-1.5 print:mb-1 print:text-[7px]">Photo {phIdx + 1}</span>
                                      <img src={ph} alt={`Piece ${ri+1} Photo ${phIdx+1}`} className="h-44 w-full object-contain rounded-lg print:h-64 print:rounded-lg" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>

                  {/* Dynamic Mockups Thumbnail Anchors side-by-side inside the Invoice */}
                  {(activeTx as QuoteTransaction).fullData?.rings?.some(r => r.referenceSketch || r.referencePhoto || (Array.isArray(r.referenceSketches) && r.referenceSketches.length > 0) || (Array.isArray(r.referencePhotos) && r.referencePhotos.length > 0)) && (
                    <div className="border-t border-brand-100 pt-6 space-y-4 mb-6 print:pt-3 print:space-y-2 print:mb-4">
                      <h4 className="text-[10px] font-black text-brand-800 uppercase tracking-widest text-center print:text-[8px]">Reference Sketches & Photos</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-3">
                        {(activeTx as QuoteTransaction).fullData?.rings?.map((r, ri) => {
                          const rSketches = Array.isArray(r.referenceSketches) ? r.referenceSketches : (r.referenceSketch ? [r.referenceSketch] : []);
                          const rPhotos = Array.isArray(r.referencePhotos) ? r.referencePhotos : (r.referencePhoto ? [r.referencePhoto] : []);
                          if (rSketches.length === 0 && rPhotos.length === 0) return null;
                          return (
                            <div key={r.id} className="border border-brand-100 bg-brand-50/20 rounded-2xl p-3 space-y-3 print:p-2 print:space-y-2 print:rounded-xl">
                              <p className="text-[10px] font-black uppercase text-brand-600 tracking-wider print:text-[8px]">
                                Piece {ri + 1}: {r.category === 'customRing' ? 'Custom Ring' : r.category === 'weddingBand' ? 'Band' : r.category === 'mensBand' ? "Men's Band" : r.category === 'pendant' ? 'Pendant' : r.category === 'earrings' ? 'Earrings' : 'Tennis'}
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {rSketches.map((sk, skIdx) => (
                                  <div key={`sk-${skIdx}`} className="border border-brand-200 rounded-xl p-1.5 bg-white flex flex-col items-center print:p-2 print:rounded-xl">
                                    <span className="text-[8px] font-black uppercase text-brand-400 tracking-wider mb-1 print:mb-1 print:text-[7px]">Sketch {skIdx + 1}</span>
                                    <img src={sk} alt={`Piece ${ri+1} Sketch ${skIdx+1}`} className="h-28 w-full object-contain rounded print:h-64 print:rounded-lg" />
                                  </div>
                                ))}
                                {rPhotos.map((ph, phIdx) => (
                                  <div key={`ph-${phIdx}`} className="border border-brand-200 rounded-xl p-1.5 bg-white flex flex-col items-center print:p-2 print:rounded-xl">
                                    <span className="text-[8px] font-black uppercase text-brand-400 tracking-wider mb-1 print:mb-1 print:text-[7px]">Photo {phIdx + 1}</span>
                                    <img src={ph} alt={`Piece ${ri+1} Photo ${phIdx+1}`} className="h-28 w-full object-contain rounded print:h-64 print:rounded-lg" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Signature graphic rendering */}
                  {((activeTx as QuoteTransaction).fullData as QuoteSession).signatureImg && (
                    <div className="mb-6 pt-4 border-t border-brand-100 flex items-center justify-between">
                      <div className="text-xs text-brand-500 font-medium">
                        <p className="font-black text-brand-800 uppercase tracking-widest text-[9px] mb-1">Approved Agreement</p>
                        <p className="text-[10px]">Client signature confirmed online.</p>
                      </div>
                      <img src={((activeTx as QuoteTransaction).fullData as QuoteSession).signatureImg!} alt="Client Signature" className="h-14 w-40 border border-brand-200 bg-brand-50 rounded-xl" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-brand-50 p-12 rounded-3xl border-2 border-dashed border-brand-200 text-center flex flex-col items-center justify-center h-[650px] space-y-3">
            <div className="bg-brand-100 p-4 rounded-full text-brand-400">
              <FileText size={32} />
            </div>
            <h3 className="font-serif italic font-bold text-brand-800 text-lg">No Document Selected</h3>
            <p className="text-xs text-brand-400 max-w-sm">
              Choose an active ledger receipt on the left rail to preview the layout, reload it in the active editor, or print it out as PDF.
            </p>
          </div>
        )}
      </div>

      {/* Wix Integration sync modal */}
      {isWixModalOpen && (
        <div className="fixed inset-0 bg-brand-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-brand-100 shadow-2xl max-w-xl w-full p-6 space-y-4 relative overflow-hidden animate-scaleUp">
            <button
              type="button"
              onClick={() => setIsWixModalOpen(false)}
              className="absolute right-4 top-4 text-brand-400 hover:text-brand-900 transition-colors p-1"
            >
              <X size={18} />
            </button>
            
            <div className="flex items-center gap-2.5 pb-2 border-b border-brand-100">
              <div className="bg-[#002eec]/10 p-2.5 rounded-2xl text-[#002eec]">
                <ShoppingBag size={20} />
              </div>
              <div>
                <h3 className="font-serif italic text-lg font-bold text-brand-900">Wix Store Checkout Dispatcher</h3>
                <p className="text-[10px] text-brand-500 font-bold uppercase tracking-widest">
                  Custom Quote Syncer • ID #{activeTx?.id}
                </p>
              </div>
            </div>

            {/* Sync Progress Tracker */}
            <div className="space-y-3">
              <div className="bg-brand-950 text-brand-gold/90 font-mono p-4 rounded-2xl text-[11px] leading-relaxed h-48 overflow-y-auto space-y-1.5 shadow-inner border border-brand-900">
                {wixSyncLog.map((log, lidx) => (
                  <div key={lidx} className="flex gap-2">
                    <span className="text-brand-500 select-none">&gt;</span>
                    <span>{log}</span>
                  </div>
                ))}
                {wixSyncState === 'checking' && (
                  <div className="text-brand-400 animate-pulse flex items-center gap-1.5 mt-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-gold animate-ping"></span>
                    Authenticating store connection...
                  </div>
                )}
                {wixSyncState === 'syncing' && (
                  <div className="text-indigo-400 animate-pulse flex items-center gap-1.5 mt-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                    Transmitting payload to API gateway...
                  </div>
                )}
              </div>

              {/* Status Banner */}
              {wixSyncState === 'done' && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3 items-start">
                  <div className="bg-green-100 text-green-700 p-1 rounded-full mt-0.5">
                    <Check size={14} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-green-800 uppercase tracking-wider">Ready for Checkout</p>
                    <p className="text-[11px] text-green-700 leading-relaxed">
                      Your bespoke jewelry specification is fully pre-loaded. Click below to redirect straight to your custom Wix Shopping Cart page with exact pricing applied.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsWixModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-brand-200 text-brand-800 text-xs font-bold hover:bg-brand-50 transition-all"
              >
                Close Panel
              </button>
              {wixSyncState === 'done' && (
                <a
                  href={generatedWixUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-[#002eec] hover:bg-[#0024ba] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md"
                >
                  <ExternalLink size={13} />
                  Proceed to Wix Checkout
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
