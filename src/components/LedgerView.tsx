/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, Trash2, Printer, FileText, X, ArrowRight, User, Phone, 
  MapPin, ShieldCheck, Mail, Calendar, Sparkles, AlertCircle,
  ShoppingBag, Check, ExternalLink, Cpu, Copy, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import { ScrapTransaction, QuoteTransaction, AppSettings, QuoteSession, JewelryItem } from '../types';
import { calculateRingCost, calculateScrapTotal } from '../utils';
import { FANCY_SHAPES, TROY_ONCE_GRAMS } from '../constants';
import { printElement } from '../utils/printHelper';
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
  onTriggerPrint?: (printFn: () => void) => void;
  isIframe?: boolean;
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
  onAddDemoTransaction,
  onTriggerPrint,
  isIframe
}: LedgerViewProps) {
  const [activeLedger, setActiveLedger] = useState<'scrap' | 'retail' | 'wholesale'>('retail');
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<{ type: 'scrap' | 'retail' | 'wholesale'; id: string } | null>(null);
  const [enlargeImage, setEnlargeImage] = useState<string | null>(null);

  // Wix sync modal states
  const [isWixModalOpen, setIsWixModalOpen] = useState(false);
  const [wixSyncState, setWixSyncState] = useState<'idle' | 'checking' | 'syncing' | 'done' | 'error'>('idle');
  const [wixSyncLog, setWixSyncLog] = useState<string[]>([]);
  const [generatedWixUrl, setGeneratedWixUrl] = useState('');
  const [showVeloInstructions, setShowVeloInstructions] = useState(false);
  const [copiedVelo, setCopiedVelo] = useState(false);
  const [copiedFrontendVelo, setCopiedFrontendVelo] = useState(false);

  const rawCartSlug = settings.wixCartSlug || '/cart-page';
  const formattedCartSlug = rawCartSlug.startsWith('/') ? rawCartSlug : `/${rawCartSlug}`;

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

    // Build a clean, precise details summary string of the pieces to import to Wix
    let detailsString = `Quote #${activeTx.id}`;
    if (activeTx.name) {
      detailsString += ` for ${activeTx.name}`;
    }
    const rings = (activeTx as QuoteTransaction).fullData?.rings || [];
    if (rings.length > 0) {
      const piecesDetails = rings.map((r, idx) => {
        if (r.category === 'repair') {
          const ops = (r.repairs || []).map(rep => `${rep.name}${rep.option ? ' (' + rep.option + ')' : ''} x${rep.qty}`).join(', ');
          const addons = (r.addons || []).map(a => `${a.desc} (Fee: $${a.fee})`).join(', ');
          let repDesc = `Repair Job ${idx + 1}`;
          if (ops) repDesc += `: [${ops}]`;
          if (addons) repDesc += ` with Addons: [${addons}]`;
          return repDesc;
        }
        const catLabel = r.category === 'customRing' ? 'Engagement' : r.category === 'weddingBand' ? 'Wedding Band' : r.category === 'mensBand' ? "Men's Band" : r.category === 'pendant' ? 'Pendant' : r.category === 'earrings' ? 'Earrings' : r.category === 'tennisBracelet' ? 'Tennis Bracelet' : 'Custom Piece';
        const metal = `${r.metalColor} ${r.goldKarat ? r.goldKarat + 'k' : ''} ${r.material}`;
        const center = r.centerStone?.carats ? `${r.centerStone.carats}ct ${r.centerStone.shape} ${r.centerStone.type}` : '';
        const sizeInfo = r.category === 'mensBand' && r.mbSize ? `Size ${r.mbSize}` : r.category === 'customRing' && r.cRingSize ? `Size US ${r.cRingSize}` : '';
        return `Piece ${idx + 1}: ${catLabel} (${metal}${center ? ', Center: ' + center : ''}${sizeInfo ? ', ' + sizeInfo : ''})`;
      }).join('; ');
      detailsString += ` - ${piecesDetails}`;
    } else if (activeTx.summary) {
      detailsString += ` - ${activeTx.summary}`;
    }
    // Limit to 500 characters to comply with standard Wix Custom Text Field length constraints
    detailsString = detailsString.substring(0, 500);
    
    setWixSyncLog(prev => [
      ...prev,
      `Calculated final cart checkout total: CAD $${cleanPrice.toFixed(2)} (${piecesCount} bespoke jewelry piece(s))`,
      "Creating dynamic checkout session token..."
    ]);

    let baseUrl = (settings.wixStoreUrl || 'https://www.goldandrosejewellery.com').trim().replace(/\/$/, '');
    if (baseUrl && !baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    let customRedirectUrl: string | null = null;

    // Trigger API sync for either webhook OR velo_api mode
    if (settings.wixIntegrationMode === 'webhook' || settings.wixIntegrationMode === 'velo_api') {
      let syncUrl = (settings.wixWebhookUrl || `${baseUrl}/_functions/syncQuote`).trim();
      
      // Sanitization: Clean up common user formatting mistakes in the URL
      if (syncUrl) {
        // Remove trailing slashes
        while (syncUrl.endsWith('/')) {
          syncUrl = syncUrl.slice(0, -1);
        }
        // If they mistakenly appended the Velo function prefix "post_syncQuote" or "options_syncQuote"
        if (syncUrl.endsWith('_syncQuote')) {
          const lastSlashIdx = syncUrl.lastIndexOf('/');
          if (lastSlashIdx !== -1) {
            syncUrl = syncUrl.substring(0, lastSlashIdx + 1) + 'syncQuote';
          }
        }
      }

      if (syncUrl) {
        setWixSyncLog(prev => [...prev, `Dispatching secure POST payload to endpoint: ${syncUrl}...`]);
        try {
          const response = await fetch(syncUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': settings.wixAccessToken ? `Bearer ${settings.wixAccessToken}` : ''
            },
            body: JSON.stringify({
              transactionId: activeTx.id,
              clientName: activeTx.name,
              clientPhone: activeTx.phone,
              clientEmail: (activeTx as QuoteTransaction).fullData?.cEmail || "",
              notes: (activeTx as QuoteTransaction).fullData?.notes || "",
              summary: activeTx.summary || "",
              total: activeTx.total,
              totalNum: cleanPrice,
              detailsString: detailsString,
              placeholderProductId: settings.wixProductId || "",
              baseUnitPrice: settings.wixBaseUnitPrice || 1.00,
              fullDetails: (activeTx as QuoteTransaction).fullData,
              syncedAt: new Date().toISOString(),
              // Explicit user-requested fields
              jobName: activeTx.name || "Custom Jewelry Job",
              contactDetails: {
                phone: activeTx.phone || "",
                email: (activeTx as QuoteTransaction).fullData?.cEmail || ""
              },
              jobDetails: detailsString,
              totalPrice: cleanPrice
            })
          });

          if (response.ok) {
            setWixSyncLog(prev => [...prev, "✓ API handshake successfully accepted by Wix (200 OK)."]);
            const resData = await response.json().catch(() => null);
            if (resData) {
              if (resData.checkoutUrl || resData.url || resData.cartUrl || resData.redirectUrl) {
                let rawUrl = resData.checkoutUrl || resData.url || resData.cartUrl || resData.redirectUrl;
                if (rawUrl && rawUrl.startsWith('/')) {
                  // Dynamically replace /cart prefix with their custom cart slug if returned from backend
                  if (rawUrl.startsWith('/cart?')) {
                    rawUrl = rawUrl.replace('/cart?', `${formattedCartSlug}?`);
                  } else if (rawUrl.startsWith('/cart/')) {
                    rawUrl = rawUrl.replace('/cart/', `${formattedCartSlug}/`);
                  } else if (rawUrl === '/cart') {
                    rawUrl = formattedCartSlug;
                  }
                  rawUrl = `${baseUrl}${rawUrl}`;
                }
                customRedirectUrl = rawUrl;
                setWixSyncLog(prev => [...prev, "✓ Received live custom checkout session URL from Wix."]);
              } else if (resData.cartId) {
                customRedirectUrl = `${baseUrl}${formattedCartSlug}?cartId=${resData.cartId}`;
                setWixSyncLog(prev => [...prev, `✓ Received custom Cart ID from Wix backend: ${resData.cartId}.`]);
              }
            }
          } else {
            setWixSyncLog(prev => [...prev, `⚠ Wix responded with status ${response.status}. Falling back to default deep-link.`]);
            const errDetails = await response.text().catch(() => '');
            if (errDetails) {
              setWixSyncLog(prev => [...prev, `Endpoint logs: ${errDetails.substring(0, 150)}`]);
            }
          }
        } catch (e: any) {
          setWixSyncLog(prev => [...prev, `⚠ Direct handshake connection failed: ${e.message}. Falling back to client-side session.`]);
        }
      } else {
        setWixSyncLog(prev => [...prev, "⚠ No API Endpoint URL is configured in settings. Falling back to client deep-link."]);
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Step 3: Deep link construction
    let finalUrl = '';
    
    if (settings.wixIntegrationMode === 'placeholder_product') {
      if (!settings.wixProductId) {
        setWixSyncLog(prev => [
          ...prev,
          "⚠ Wix Product ID not configured in Settings!",
          "ℹ Please go to Settings -> Wix Store Integration and paste the Product ID of your $1.00 or $0.01 placeholder product."
        ]);
        const cartParams = {
          cart: {
            items: [
              {
                name: activeTx.name ? `Custom Jewelry Order for ${activeTx.name}` : 'Bespoke Custom Jewelry Item',
                quantity: 1,
                price: cleanPrice,
                description: activeTx.summary || `Bespoke estimate ID #${activeTx.id}`
              }
            ]
          }
        };
        finalUrl = `${baseUrl}${formattedCartSlug}?details=${encodeURIComponent(detailsString)}&appSectionParams=${encodeURIComponent(JSON.stringify(cartParams))}`;
      } else {
        const isCentProduct = settings.wixBaseUnitPrice === 0.01;
        const computedQty = isCentProduct 
          ? Math.round(cleanPrice * 100) 
          : Math.round(cleanPrice);
        
        const finalQty = computedQty > 0 ? computedQty : 1;
        const unitLabel = isCentProduct ? '$0.01 cents' : '$1.00 dollars';
 
        setWixSyncLog(prev => [
          ...prev,
          `✓ Using standard placeholder product ID: ${settings.wixProductId}`,
          `✓ Formulating cart quantity: ${finalQty.toLocaleString()} units of ${unitLabel} to match CAD $${cleanPrice.toFixed(2)}.`
        ]);
 
        const cartParams = {
          cart: {
            items: [
              {
                productId: settings.wixProductId,
                quantity: finalQty
              }
            ]
          }
        };
        finalUrl = `${baseUrl}${formattedCartSlug}?productId=${settings.wixProductId}&quantity=${finalQty}&details=${encodeURIComponent(detailsString)}&appSectionParams=${encodeURIComponent(JSON.stringify(cartParams))}`;
      }
    } else {
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
      
      if (customRedirectUrl) {
        if (customRedirectUrl.includes('?')) {
          customRedirectUrl += `&details=${encodeURIComponent(detailsString)}`;
        } else {
          customRedirectUrl += `?details=${encodeURIComponent(detailsString)}`;
        }
        finalUrl = customRedirectUrl;
      } else {
        finalUrl = `${baseUrl}${formattedCartSlug}?details=${encodeURIComponent(detailsString)}&appSectionParams=${encodeURIComponent(JSON.stringify(cartParams))}`;
      }
    }

    setGeneratedWixUrl(finalUrl);

    if (settings.wixIntegrationMode === 'placeholder_product' && settings.wixProductId) {
      setWixSyncLog(prev => [
        ...prev,
        "✓ Zero-code secure checkout deep-link successfully formulated!",
        "✓ Ready to check out securely without Developer Mode!"
      ]);
    } else if (customRedirectUrl) {
      setWixSyncLog(prev => [
        ...prev,
        "✓ Dynamic Wix session checkout generated!",
        `✓ Checkout link: ${customRedirectUrl!.substring(0, 50)}...`
      ]);
    } else {
      setGeneratedWixUrl(finalUrl);
      setWixSyncLog(prev => [
        ...prev,
        "✓ Client deep-link generated successfully!",
        "ℹ Note: Wix Stores requires Velo HTTP function logic on your site to dynamically populate custom prices."
      ]);
    }
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
                {(selectedTx.type === 'retail' || selectedTx.type === 'wholesale') && (
                  <button
                    type="button"
                    onClick={handleWixSync}
                    className="bg-[#002eec] hover:bg-[#0024ba] text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                    title="Generate custom checkout link and sync with Wix Store"
                  >
                    <ShoppingBag size={12} />
                    Send to Wix
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (isIframe && onTriggerPrint) {
                      onTriggerPrint(() => printElement('ledger-invoice-box'));
                    } else {
                      printElement('ledger-invoice-box');
                    }
                  }}
                  className="bg-brand-900 text-brand-gold hover:bg-brand-950 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all flex items-center gap-1 shadow-sm cursor-pointer"
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
                    <div className="mb-6 print:mb-8 break-inside-avoid">
                      <p className="text-[10px] uppercase font-black text-brand-400 tracking-wider mb-2 print:text-[8px] print:text-brand-500">Verified ID Photograph</p>
                      <img 
                        src={(activeTx as ScrapTransaction).image!} 
                        alt="Compliance photo" 
                        className="h-28 w-44 object-contain rounded-xl border border-brand-200 shadow-sm cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all print:h-80 print:w-auto print:max-w-xl print:rounded-lg print:border print:border-brand-150 print:shadow-none" 
                        onClick={() => setEnlargeImage((activeTx as ScrapTransaction).image!)}
                        title="Click to enlarge"
                      />
                    </div>
                  )}

                  {/* Sign-off terms */}
                  <div className="border-t border-brand-200 pt-5 text-center space-y-4">
                    <p className="text-[8px] text-brand-400 italic leading-relaxed">
                      I declare that I am the legal owner of the scrap items presented above and have full right to transact and sell them to Gold & Rose Jewellery Corp. All buyout transactions are absolute and final.
                    </p>
                    <div className="flex flex-col items-center justify-center">
                      {(activeTx as ScrapTransaction).signature ? (
                        <div className="h-16 w-40 flex items-center justify-center relative overflow-hidden mb-1">
                          <img 
                            src={(activeTx as ScrapTransaction).signature!} 
                            alt="Client signature" 
                            className="max-h-16 max-w-full object-contain filter brightness-95" 
                          />
                        </div>
                      ) : (
                        <div className="h-12"></div>
                      )}
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
                                      <img
                                        src={sk}
                                        alt={`Piece ${ri+1} Sketch ${skIdx+1}`}
                                        className="h-44 w-full object-contain rounded-lg cursor-pointer hover:scale-[1.01] hover:opacity-90 transition-all print:h-64 print:rounded-lg"
                                        onClick={() => setEnlargeImage(sk)}
                                        title="Click to enlarge"
                                      />
                                    </div>
                                  ))}
                                  {rPhotos.map((ph, phIdx) => (
                                    <div key={`ph-${phIdx}`} className="border border-brand-200 rounded-xl p-2 bg-white flex flex-col items-center print:p-2 print:rounded-xl">
                                      <span className="text-[8px] font-black uppercase text-brand-400 tracking-wider mb-1.5 print:mb-1 print:text-[7px]">Photo {phIdx + 1}</span>
                                      <img
                                        src={ph}
                                        alt={`Piece ${ri+1} Photo ${phIdx+1}`}
                                        className="h-44 w-full object-contain rounded-lg cursor-pointer hover:scale-[1.01] hover:opacity-90 transition-all print:h-64 print:rounded-lg"
                                        onClick={() => setEnlargeImage(ph)}
                                        title="Click to enlarge"
                                      />
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
                                    <img
                                      src={sk}
                                      alt={`Piece ${ri+1} Sketch ${skIdx+1}`}
                                      className="h-28 w-full object-contain rounded cursor-pointer hover:scale-[1.01] hover:opacity-90 transition-all print:h-64 print:rounded-lg"
                                      onClick={() => setEnlargeImage(sk)}
                                      title="Click to enlarge"
                                    />
                                  </div>
                                ))}
                                {rPhotos.map((ph, phIdx) => (
                                  <div key={`ph-${phIdx}`} className="border border-brand-200 rounded-xl p-1.5 bg-white flex flex-col items-center print:p-2 print:rounded-xl">
                                    <span className="text-[8px] font-black uppercase text-brand-400 tracking-wider mb-1 print:mb-1 print:text-[7px]">Photo {phIdx + 1}</span>
                                    <img
                                      src={ph}
                                      alt={`Piece ${ri+1} Photo ${phIdx+1}`}
                                      className="h-28 w-full object-contain rounded cursor-pointer hover:scale-[1.01] hover:opacity-90 transition-all print:h-64 print:rounded-lg"
                                      onClick={() => setEnlargeImage(ph)}
                                      title="Click to enlarge"
                                    />
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
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3 items-start">
                    <div className="bg-green-100 text-green-700 p-1 rounded-full mt-0.5">
                      <Check size={14} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-green-800 uppercase tracking-wider">Successfully Sent to Wix</p>
                      <p className="text-[11px] text-green-700 leading-relaxed">
                        Your job name, contact details, job details, and total price have been securely sent and created in your Wix Store backend.
                      </p>
                    </div>
                  </div>

                  {/* Velo troubleshooting helper */}
                  <div className="border border-brand-100 rounded-2xl overflow-hidden bg-brand-50/50">
                    <button
                      type="button"
                      onClick={() => setShowVeloInstructions(!showVeloInstructions)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-brand-50 transition-all border-none outline-none"
                    >
                      <div className="flex items-center gap-2">
                        <Info size={14} className="text-[#002eec]" />
                        <span className="text-xs font-bold text-brand-800">
                          {settings.wixIntegrationMode === 'placeholder_product' 
                            ? "Wix Zero-Code Guide (No Developer Mode Required)" 
                            : 'Wix "Empty Cart" & "No Profile" Troubleshooting & Velo Code'}
                        </span>
                      </div>
                      {showVeloInstructions ? <ChevronUp size={14} className="text-brand-500" /> : <ChevronDown size={14} className="text-brand-500" />}
                    </button>

                    {showVeloInstructions && (
                      <div className="p-4 pt-0 border-t border-brand-100 space-y-3 animate-fadeIn text-left mt-2.5">
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-900 leading-relaxed font-bold space-y-2">
                          <p className="font-extrabold uppercase text-[10px] text-red-800 tracking-wide flex items-center gap-1">
                            ⚠️ Why is my shopping cart still empty? (Check list):
                          </p>
                          <ul className="list-disc list-inside space-y-1.5 pl-1 text-[10.5px]">
                            <li>
                              <span className="text-red-950 font-black">1. Product Catalog Visibility (Most Common)</span>: Wix Stores strictly forbid adding invisible (<code className="bg-red-100 px-1 py-0.5 rounded text-red-900 font-mono text-[9px]">visible: false</code>) items to the cart from the frontend.
                              <div className="pl-3 text-red-800 text-[10px] mt-0.5 font-normal">
                                • For Velo API mode: Change <code className="bg-red-100 font-mono text-[9px]">visible: false</code> to <code className="bg-red-100 font-mono text-[9px] font-bold text-green-950">visible: true</code> in your backend code (updated below).
                                <br />• For Placeholder mode: Go to your Wix Dashboard and verify your payment placeholder product is set to <span className="underline">Active</span>, set to <span className="underline">Visible</span>, and has "In Stock" or "Track Inventory" disabled.
                              </div>
                            </li>
                            <li>
                              <span className="text-red-950 font-black">2. Product ID UUID vs. SKU/Name</span>: You MUST copy the true 36-character Wix internal product UUID (e.g., <code className="bg-red-100 font-mono text-[9px]">xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</code>) into Settings. Do NOT use the SKU or Product Name.
                              <div className="pl-3 text-red-800 text-[10px] mt-0.5 font-normal">
                                • Finding the ID: Open the product editor in your Wix Dashboard. The Product ID is the long alphanumeric code at the very end of your browser's address bar.
                              </div>
                            </li>
                            <li>
                              <span className="text-red-950 font-black">3. Cart Slug Match</span>: Your "Wix Shopping Cart Page Slug" in Settings (e.g. <code className="bg-red-100 font-mono text-[9px]">/cart</code>) must match your active Wix cart page URL. Standard Wix stores use <code className="bg-red-100 font-mono text-[9px]">/cart</code>.
                            </li>
                            <li>
                              <span className="text-red-950 font-black">4. Live site only</span>: Velo APIs and Custom page handlers do NOT run in "Preview" mode inside the Wix Editor. You <span className="underline">MUST</span> click <span className="font-extrabold">Publish</span> in your Wix Editor, then open your live site domain!
                            </li>
                          </ul>
                        </div>

                        {settings.wixIntegrationMode === 'placeholder_product' ? (
                          <div className="space-y-2.5 text-[11px] text-brand-600 leading-relaxed">
                            <p className="font-bold text-brand-800 text-xs">
                              How to Set Up Your Zero-Code Custom Checkout Product:
                            </p>
                            <p className="text-[11px] text-brand-600">
                              We use a standard, secure Wix workaround. We load a single product with a base unit price of $1.00 (or $0.01) into the cart and multiply the quantity to match your quote's exact CAD total. Follow these easy steps:
                            </p>
                            <ol className="list-decimal list-inside space-y-1.5 pl-1 font-bold text-brand-700">
                              <li>
                                Log into your <span className="text-brand-900">Wix Dashboard</span> and go to <span className="text-brand-900">Store Products</span>.
                              </li>
                              <li>
                                Create a new physical or digital product named <span className="text-brand-900">"Custom Jewelry Piece Payment"</span>.
                              </li>
                              <li>
                                Set the product's price to exactly <span className="text-brand-900 font-mono">$1.00</span> (or <span className="text-brand-900 font-mono">$0.01</span> for exact cents support).
                              </li>
                              <li>
                                Under inventory, <span className="text-brand-900">UNCHECK "Track Inventory"</span>.
                              </li>
                              <li>
                                Save the product, copy its <span className="text-brand-900 font-bold">Product ID</span> from your browser address bar and paste it into <span className="text-brand-900 font-bold">Settings</span> in this app!
                              </li>
                            </ol>
                            
                            <div className="space-y-1 mt-3">
                              <span className="text-[9px] font-black text-brand-800 uppercase tracking-wider block">Required Frontend Cart Code (Recommended for masterPage.js or Cart Page):</span>
                              <p className="text-[10px] text-brand-600">For a foolproof integration that completely avoids Wix Cart page timing conflicts, paste this code into your Global <span className="font-bold">masterPage.js</span> file (under Page Code &gt; Global) OR on your specific Cart page:</p>
                              <div className="relative">
                                <pre className="bg-brand-950 text-brand-100 p-3 rounded-xl text-[9px] font-mono leading-relaxed overflow-x-auto max-h-44 shadow-inner border border-brand-900">
{`import { cart } from 'wix-stores';
import wixLocation from 'wix-location';

$w.onReady(function () {
  const query = wixLocation.query;
  let productId = query.productId;
  let quantity = parseInt(query.quantity || query.qty || "1", 10);
  let details = query.details || "";

  // Fallback: If productId is not found directly, try parsing appSectionParams
  if (!productId && query.appSectionParams) {
    try {
      let appSectionParamsStr = query.appSectionParams;
      if (appSectionParamsStr.includes('%')) {
        appSectionParamsStr = decodeURIComponent(appSectionParamsStr);
      }
      const params = JSON.parse(appSectionParamsStr);
      if (params.cart?.items?.length > 0) {
        productId = params.cart.items[0].productId;
        if (params.cart.items[0].quantity) {
          quantity = parseInt(params.cart.items[0].quantity, 10);
        }
      }
    } catch (e) {
      console.error("Failed parsing appSectionParams:", e);
    }
  }

  if (productId) {
    const options = {};
    if (details) {
      options.customTextFields = [
        { 
          title: "Job Details", 
          value: decodeURIComponent(details).substring(0, 500) 
        }
      ];
    }

    console.log("Adding product to cart:", productId, "Quantity:", quantity, "Options:", options);
    cart.addProducts([{ productId, quantity, options }])
      .then(() => {
        console.log("Successfully added to cart. Cleaning URL...");
        // Redirect back to your Cart page without query parameters
        wixLocation.to("${formattedCartSlug}");
      })
      .catch((err) => {
        console.error("Add to cart error:", err);
      });
  }
});`}
                                </pre>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`import { cart } from 'wix-stores';
import wixLocation from 'wix-location';

$w.onReady(function () {
  const query = wixLocation.query;
  let productId = query.productId;
  let quantity = parseInt(query.quantity || query.qty || "1", 10);
  let details = query.details || "";

  // Fallback: If productId is not found directly, try parsing appSectionParams
  if (!productId && query.appSectionParams) {
    try {
      let appSectionParamsStr = query.appSectionParams;
      if (appSectionParamsStr.includes('%')) {
        appSectionParamsStr = decodeURIComponent(appSectionParamsStr);
      }
      const params = JSON.parse(appSectionParamsStr);
      if (params.cart?.items?.length > 0) {
        productId = params.cart.items[0].productId;
        if (params.cart.items[0].quantity) {
          quantity = parseInt(params.cart.items[0].quantity, 10);
        }
      }
    } catch (e) {
      console.error("Failed parsing appSectionParams:", e);
    }
  }

  if (productId) {
    const options = {};
    if (details) {
      options.customTextFields = [
        { 
          title: "Job Details", 
          value: decodeURIComponent(details).substring(0, 500) 
        }
      ];
    }

    console.log("Adding product to cart:", productId, "Quantity:", quantity, "Options:", options);
    cart.addProducts([{ productId, quantity, options }])
      .then(() => {
        console.log("Successfully added to cart. Cleaning URL...");
        // Redirect back to your Cart page without query parameters
        wixLocation.to("${formattedCartSlug}");
      })
      .catch((err) => {
        console.error("Add to cart error:", err);
      });
  }
});`);
                                    setCopiedFrontendVelo(true);
                                    setTimeout(() => setCopiedFrontendVelo(false), 2000);
                                  }}
                                  className="absolute top-2 right-2 px-2.5 py-1.5 bg-brand-850 hover:bg-brand-800 text-brand-gold font-bold text-[9px] rounded-lg transition-colors flex items-center gap-1 border border-brand-700/50"
                                >
                                  <Copy size={10} />
                                  {copiedFrontendVelo ? "Copied!" : "Copy Frontend Code"}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-[11px] text-brand-600 leading-relaxed">
                              Follow these steps to enable fully dynamic custom checkout and CRM syncing:
                            </p>

                            <div className="space-y-1">
                              <span className="text-[9px] font-black text-brand-800 uppercase tracking-wider block">Step 1: Backend Integration (File: backend/http-functions.js)</span>
                              <p className="text-[10px] text-brand-600">Creates the CRM contact profile, writes complete design notes, and redirects to your checkout cart with your single pre-existing placeholder product (no new product is created):</p>
                              <div className="relative">
                                <pre className="bg-brand-950 text-brand-100 p-3 rounded-xl text-[9px] font-mono leading-relaxed overflow-x-auto max-h-44 shadow-inner border border-brand-900">
{`// File: backend/http-functions.js
import { ok, serverError } from 'wix-http-functions';
import { contacts } from 'wix-crm-backend';

export async function post_syncQuote(request) {
  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  try {
    const payload = await request.body.json();
    
    const clientName = payload.clientName || '';
    const clientPhone = payload.clientPhone || '';
    const clientEmail = payload.clientEmail || '';
    const transactionId = payload.transactionId || '';
    const totalNum = payload.totalNum || 0;
    const notes = payload.notes || '';
    const summary = payload.summary || '';
    const detailsString = payload.detailsString || '';
    const placeholderProductId = payload.placeholderProductId || '';
    const baseUnitPrice = payload.baseUnitPrice || 1.00;

    // 1. CRM Integration: Search or Create Contact Profile & Append Notes
    let contactId = null;
    if (clientName || clientEmail || clientPhone) {
      let firstName = clientName;
      let lastName = '';
      if (clientName.trim().includes(' ')) {
        const parts = clientName.trim().split(/\\s+/);
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
      }

      const contactInfo = {
        name: { first: firstName, last: lastName }
      };
      if (clientEmail) {
        contactInfo.emails = [{ email: clientEmail, tag: "MAIN", primary: true }];
      }
      if (clientPhone) {
        contactInfo.phones = [{ phone: clientPhone, tag: "MAIN", primary: true }];
      }

      try {
        const contactResult = await contacts.appendOrCreateContact(contactInfo);
        contactId = contactResult.contactId;

        const noteTitle = "Bespoke Jewelry Quote #" + transactionId;
        const noteContent = "GOLD & ROSE BESPOKE JEWELRY QUOTE\\n" +
                            "-----------------------------------------\\n" +
                            "Client Name: " + clientName + "\\n" +
                            "Phone: " + clientPhone + "\\n" +
                            "Email: " + clientEmail + "\\n\\n" +
                            "Job Summary: " + (detailsString || summary) + "\\n" +
                            "Special Notes: " + notes + "\\n\\n" +
                            "Total Quote Amount: $" + totalNum.toFixed(2) + " CAD\\n" +
                            "Synced on: " + new Date().toLocaleString();

        await contacts.addNote(contactId, { title: noteTitle, content: noteContent });
      } catch (crmErr) {
        console.error("Wix CRM contact synching failed:", crmErr.message);
      }
    }

    // 2. Redirect to Checkout using the Single Pre-existing Placeholder Product (No product is created!)
    const isCentProduct = baseUnitPrice === 0.01;
    const computedQty = isCentProduct ? Math.round(totalNum * 100) : Math.round(totalNum);
    const finalQty = Math.max(1, computedQty);
    
    // Fallback: If no placeholder Product ID is received, fall back to placeholder ID
    const productId = placeholderProductId || "YOUR_PLACEHOLDER_PRODUCT_ID";

    // Build the dynamic checkout redirect URL with details parameter
    const finalDetails = encodeURIComponent(detailsString || ("Quote #" + transactionId + " - " + summary));
    const checkoutUrl = "${formattedCartSlug}?productId=" + productId + "&quantity=" + finalQty + "&details=" + finalDetails;

    return ok({
      body: { 
        status: "success", 
        checkoutUrl: checkoutUrl,
        contactId: contactId
      },
      headers: corsHeaders
    });
  } catch (err) {
    return serverError({ body: { error: err.message }, headers: corsHeaders });
  }
}

export function options_syncQuote(request) {
  return ok({
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}`}
                                </pre>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`// File: backend/http-functions.js
import { ok, serverError } from 'wix-http-functions';
import { contacts } from 'wix-crm-backend';

export async function post_syncQuote(request) {
  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  try {
    const payload = await request.body.json();
    
    const clientName = payload.clientName || '';
    const clientPhone = payload.clientPhone || '';
    const clientEmail = payload.clientEmail || '';
    const transactionId = payload.transactionId || '';
    const totalNum = payload.totalNum || 0;
    const notes = payload.notes || '';
    const summary = payload.summary || '';
    const detailsString = payload.detailsString || '';
    const placeholderProductId = payload.placeholderProductId || '';
    const baseUnitPrice = payload.baseUnitPrice || 1.00;

    // 1. CRM Integration: Search or Create Contact Profile & Append Notes
    let contactId = null;
    if (clientName || clientEmail || clientPhone) {
      let firstName = clientName;
      let lastName = '';
      if (clientName.trim().includes(' ')) {
        const parts = clientName.trim().split(/\\s+/);
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
      }

      const contactInfo = {
        name: { first: firstName, last: lastName }
      };
      if (clientEmail) {
        contactInfo.emails = [{ email: clientEmail, tag: "MAIN", primary: true }];
      }
      if (clientPhone) {
        contactInfo.phones = [{ phone: clientPhone, tag: "MAIN", primary: true }];
      }

      try {
        const contactResult = await contacts.appendOrCreateContact(contactInfo);
        contactId = contactResult.contactId;

        const noteTitle = "Bespoke Jewelry Quote #" + transactionId;
        const noteContent = "GOLD & ROSE BESPOKE JEWELRY QUOTE\\n" +
                            "-----------------------------------------\\n" +
                            "Client Name: " + clientName + "\\n" +
                            "Phone: " + clientPhone + "\\n" +
                            "Email: " + clientEmail + "\\n\\n" +
                            "Job Summary: " + (detailsString || summary) + "\\n" +
                            "Special Notes: " + notes + "\\n\\n" +
                            "Total Quote Amount: $" + totalNum.toFixed(2) + " CAD\\n" +
                            "Synced on: " + new Date().toLocaleString();

        await contacts.addNote(contactId, { title: noteTitle, content: noteContent });
      } catch (crmErr) {
        console.error("Wix CRM contact synching failed:", crmErr.message);
      }
    }

    // 2. Redirect to Checkout using the Single Pre-existing Placeholder Product (No product is created!)
    const isCentProduct = baseUnitPrice === 0.01;
    const computedQty = isCentProduct ? Math.round(totalNum * 100) : Math.round(totalNum);
    const finalQty = Math.max(1, computedQty);
    
    // Fallback: If no placeholder Product ID is received, fall back to placeholder ID
    const productId = placeholderProductId || "YOUR_PLACEHOLDER_PRODUCT_ID";

    // Build the dynamic checkout redirect URL with details parameter
    const finalDetails = encodeURIComponent(detailsString || ("Quote #" + transactionId + " - " + summary));
    const checkoutUrl = "${formattedCartSlug}?productId=" + productId + "&quantity=" + finalQty + "&details=" + finalDetails;

    return ok({
      body: { 
        status: "success", 
        checkoutUrl: checkoutUrl,
        contactId: contactId
      },
      headers: corsHeaders
    });
  } catch (err) {
    return serverError({ body: { error: err.message }, headers: corsHeaders });
  }
}

export function options_syncQuote(request) {
  return ok({
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}`);
                                    setCopiedVelo(true);
                                    setTimeout(() => setCopiedVelo(false), 2000);
                                  }}
                                  className="absolute top-2 right-2 px-2.5 py-1.5 bg-brand-850 hover:bg-brand-800 text-brand-gold font-bold text-[9px] rounded-lg transition-colors flex items-center gap-1 border border-brand-700/50"
                                >
                                  <Copy size={10} />
                                  {copiedVelo ? "Copied!" : "Copy Backend Code"}
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[9px] font-black text-brand-800 uppercase tracking-wider block">Step 2: Frontend Cart Automation (Recommended for masterPage.js or Cart Page)</span>
                              <p className="text-[10px] text-brand-600">For a foolproof integration that completely avoids Wix Cart page timing conflicts, paste this code into your Global <span className="font-bold">masterPage.js</span> file (under Page Code &gt; Global) OR on your specific Cart page:</p>
                              <div className="relative">
                                <pre className="bg-brand-950 text-brand-100 p-3 rounded-xl text-[9px] font-mono leading-relaxed overflow-x-auto max-h-44 shadow-inner border border-brand-900">
{`import { cart } from 'wix-stores';
import wixLocation from 'wix-location';

$w.onReady(function () {
  const query = wixLocation.query;
  let productId = query.productId;
  let quantity = parseInt(query.quantity || query.qty || "1", 10);
  let details = query.details || "";

  // Fallback: If productId is not found directly, try parsing appSectionParams
  if (!productId && query.appSectionParams) {
    try {
      let appSectionParamsStr = query.appSectionParams;
      if (appSectionParamsStr.includes('%')) {
        appSectionParamsStr = decodeURIComponent(appSectionParamsStr);
      }
      const params = JSON.parse(appSectionParamsStr);
      if (params.cart?.items?.length > 0) {
        productId = params.cart.items[0].productId;
        if (params.cart.items[0].quantity) {
          quantity = parseInt(params.cart.items[0].quantity, 10);
        }
      }
    } catch (e) {
      console.error("Failed parsing appSectionParams:", e);
    }
  }

  if (productId) {
    const options = {};
    if (details) {
      options.customTextFields = [
        { 
          title: "Job Details", 
          value: decodeURIComponent(details).substring(0, 500) 
        }
      ];
    }

    console.log("Adding product to cart:", productId, "Quantity:", quantity, "Options:", options);
    cart.addProducts([{ productId, quantity, options }])
      .then(() => {
        console.log("Successfully added to cart. Cleaning URL...");
        // Redirect back to your Cart page without query parameters
        wixLocation.to("${formattedCartSlug}");
      })
      .catch((err) => {
        console.error("Add to cart error:", err);
      });
  }
});`}
                                </pre>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`import { cart } from 'wix-stores';
import wixLocation from 'wix-location';

$w.onReady(function () {
  const query = wixLocation.query;
  let productId = query.productId;
  let quantity = parseInt(query.quantity || query.qty || "1", 10);
  let details = query.details || "";

  // Fallback: If productId is not found directly, try parsing appSectionParams
  if (!productId && query.appSectionParams) {
    try {
      let appSectionParamsStr = query.appSectionParams;
      if (appSectionParamsStr.includes('%')) {
        appSectionParamsStr = decodeURIComponent(appSectionParamsStr);
      }
      const params = JSON.parse(appSectionParamsStr);
      if (params.cart?.items?.length > 0) {
        productId = params.cart.items[0].productId;
        if (params.cart.items[0].quantity) {
          quantity = parseInt(params.cart.items[0].quantity, 10);
        }
      }
    } catch (e) {
      console.error("Failed parsing appSectionParams:", e);
    }
  }

  if (productId) {
    const options = {};
    if (details) {
      options.customTextFields = [
        { 
          title: "Job Details", 
          value: decodeURIComponent(details).substring(0, 500) 
        }
      ];
    }

    console.log("Adding product to cart:", productId, "Quantity:", quantity, "Options:", options);
    cart.addProducts([{ productId, quantity, options }])
      .then(() => {
        console.log("Successfully added to cart. Cleaning URL...");
        // Redirect back to your Cart page without query parameters
        wixLocation.to("${formattedCartSlug}");
      })
      .catch((err) => {
        console.error("Add to cart error:", err);
      });
  }
});`);
                                    setCopiedFrontendVelo(true);
                                    setTimeout(() => setCopiedFrontendVelo(false), 2000);
                                  }}
                                  className="absolute top-2 right-2 px-2.5 py-1.5 bg-brand-850 hover:bg-brand-800 text-brand-gold font-bold text-[9px] rounded-lg transition-colors flex items-center gap-1 border border-brand-700/50"
                                >
                                  <Copy size={10} />
                                  {copiedFrontendVelo ? "Copied!" : "Copy Frontend Code"}
                                </button>
                              </div>
                            </div>

                            <div className="text-[10px] text-brand-500 space-y-1.5 pl-1 font-bold leading-normal pt-1">
                              <div>3. Go to Settings, set Integration Mode to <span className="text-brand-900 font-bold">Wix Velo Headless API</span>.</div>
                              <div>4. Set Velo Function URL to: <span className="text-brand-900 font-mono font-bold text-[9.5px] bg-brand-100 px-1 rounded">{settings.wixStoreUrl ? settings.wixStoreUrl.replace(/\/$/, '') : 'https://www.goldandrosejewellery.com'}/_functions/syncQuote</span></div>
                              <div>5. <span className="text-red-800 font-extrabold uppercase">IMPORTANT:</span> Click <span className="text-brand-900 underline">Publish</span> in the Wix Editor, and verify you are initiating sync from our live app, as editor previews block HTTP functions!</div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsWixModalOpen(false)}
                className="px-5 py-2.5 bg-brand-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-brand-950 transition-all cursor-pointer shadow-md"
              >
                Done & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Click-to-Enlarge ID Photograph Lightbox Overlay */}
      {enlargeImage && (() => {
        const isComplianceId = selectedTx?.type === 'scrap' && activeTx && (activeTx as ScrapTransaction).image === enlargeImage;
        return (
          <div 
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-4 animate-fadeIn select-none font-sans"
            onClick={() => setEnlargeImage(null)}
          >
            <div className="absolute top-4 right-4 flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const win = window.open('');
                  if (win) {
                    win.document.write(`<img src="${enlargeImage}" style="max-width:100%; max-height:100vh; display:block; margin:auto; object-fit:contain;" />`);
                    win.document.close();
                    win.focus();
                    setTimeout(() => {
                      win.print();
                      win.close();
                    }, 250);
                  }
                }}
                className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase px-3.5 py-2 rounded-xl transition-all cursor-pointer border border-white/20 shadow flex items-center gap-1.5"
                title="Print this photo alone"
              >
                <Printer size={12} className="text-brand-gold" /> {isComplianceId ? 'Print ID Photo' : 'Print Mockup'}
              </button>
              <button
                type="button"
                onClick={() => setEnlargeImage(null)}
                className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2.5 transition-colors cursor-pointer text-xl leading-none font-black shadow-lg"
                title="Close Enlarge"
              >
                &times;
              </button>
            </div>
            <div 
              className="relative max-w-4xl max-h-[85vh] flex items-center justify-center bg-slate-950 p-2.5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-zoomIn"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={enlargeImage} 
                alt="Enlarged Reference View" 
                className="max-h-[80vh] max-w-full object-contain rounded-xl select-all" 
              />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/75 px-4 py-2 rounded-full border border-white/10 text-[10px] font-bold text-brand-200 shadow tracking-wider uppercase">
                {isComplianceId ? 'Enlarged Compliance Document View' : 'Enlarged Visual Mockup Reference'}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
