/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, Trash2, Printer, FileText, X, ArrowRight, User, Phone, 
  MapPin, ShieldCheck, Mail, Calendar, Sparkles, AlertCircle 
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
  settings: AppSettings;
  onAddDemoTransaction?: () => void;
}

export default function LedgerView({
  scrapTransactions,
  ringQuoteTransactions,
  wholesaleTransactions,
  onDeleteTransaction,
  onLoadIntoEditor,
  settings,
  onAddDemoTransaction
}: LedgerViewProps) {
  const [activeLedger, setActiveLedger] = useState<'scrap' | 'retail' | 'wholesale'>('retail');
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<{ type: 'scrap' | 'retail' | 'wholesale'; id: string } | null>(null);

  // Search filter lists
  const filteredScrap = scrapTransactions.filter(
    tx => tx.name.toLowerCase().includes(search.toLowerCase()) || tx.phone.includes(search)
  );

  const filteredRetail = ringQuoteTransactions.filter(
    tx => tx.name.toLowerCase().includes(search.toLowerCase()) || tx.phone.includes(search)
  );

  const filteredWholesale = wholesaleTransactions.filter(
    tx => tx.name.toLowerCase().includes(search.toLowerCase()) || tx.phone.includes(search)
  );

  // PDF Export Trigger using browser html2canvas + jspdf
  const exportPdf = async (elementId: string, name: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const pdfWidth = 215.9; // 8.5 inches in mm
      const pdfHeight = 279.4; // 11 inches in mm
      const margin = 10;
      
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;
      
      const pdf = new jsPDF('p', 'mm', [pdfWidth, Math.max(pdfHeight, contentHeight + margin * 2)]);
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight);
      pdf.save(`Quote_Receipt_${name.replace(/\s+/g, '_')}.pdf`);
    } catch (err: any) {
      alert("PDF Compilation Failed: " + err.message);
    }
  };

  const currentTxData = () => {
    if (!selectedTx) return null;
    const { type, id } = selectedTx;
    if (type === 'scrap') return scrapTransactions.find(t => t.id === id);
    if (type === 'retail') return ringQuoteTransactions.find(t => t.id === id);
    return wholesaleTransactions.find(t => t.id === id);
  };

  const activeTx = currentTxData();

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fadeIn">
      {/* Search & Transaction Lists Column */}
      <div className="md:col-span-5 lg:col-span-4 bg-white p-5 rounded-2xl border border-brand-100 shadow-sm flex flex-col h-[650px]">
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
            placeholder="Search by client name or phone..."
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
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={onAddDemoTransaction}
                    className="w-full py-2.5 px-3 bg-brand-900 hover:bg-brand-gold text-brand-gold hover:text-brand-900 border border-brand-800 hover:border-brand-gold/50 rounded-xl text-[11px] font-black tracking-wider uppercase shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={12} />
                    Generate Wedding Set Demo Quote
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
                    <p className="font-bold text-xs text-brand-900">{tx.name || `Job #${tx.fullData?.jobNum || 'N/A'}`}</p>
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
      <div className="md:col-span-7 lg:col-span-8 space-y-4">
        {selectedTx && activeTx ? (
          <div className="bg-white p-5 rounded-3xl border border-brand-100 shadow-lg flex flex-col justify-between min-h-[650px] relative">
            {/* Top Print Actions */}
            <div className="flex justify-between items-center border-b border-brand-100 pb-3 mb-5">
              <span className="text-[10px] font-black uppercase text-brand-400 tracking-wider">Inline Document Preview</span>
              <div className="flex gap-2">
                {selectedTx.type !== 'scrap' && (
                  <button
                    type="button"
                    onClick={() => onLoadIntoEditor(activeTx.id, selectedTx.type === 'wholesale')}
                    className="bg-brand-50 hover:bg-brand-100 text-brand-800 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-brand-200 transition-all flex items-center gap-1 shadow-sm"
                  >
                    <FileText size={12} />
                    Load in Editor
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
            <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 hide-scrollbar">
              {/* LEDGER RENDER 1: Scrap buyback Receipt */}
              {selectedTx.type === 'scrap' && (
                <div id="ledger-invoice-box" className="p-8 bg-white border border-brand-200 rounded-2xl text-brand-800 text-left font-sans max-w-xl mx-auto">
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
                <div id="ledger-invoice-box" className="p-8 bg-white border border-brand-200 rounded-2xl text-brand-800 text-left font-sans max-w-2xl mx-auto">
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
                      const cost = calculateRingCost(r, settings, { gold: 4000, silver: 45, platinum: 1200 }, selectedTx.type);
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
                        </div>
                      );
                    })}
                  </div>

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
    </div>
  );
}
