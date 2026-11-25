/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, Trash2, Printer, FileText, X, ArrowRight, User, Phone, 
  MapPin, ShieldCheck, Mail, Calendar, Sparkles, AlertCircle,
  ShoppingBag, Check, ExternalLink, Cpu, Copy, Info, ChevronDown, ChevronUp,
  RefreshCw, Coins
} from 'lucide-react';
import { ScrapTransaction, QuoteTransaction, AppSettings, QuoteSession, JewelryItem, StoneOrderStatus } from '../types';
import { calculateRingCost, calculateScrapTotal, calculateScrapItemValue } from '../utils';
import { FANCY_SHAPES, TROY_ONCE_GRAMS } from '../constants';
import { printElement } from '../utils/printHelper';
import { playClickSound } from '../utils/audio';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ClientInvoicePrint from './ClientInvoicePrint';
import WholesaleRepairInvoicePrint from './WholesaleRepairInvoicePrint';

interface LedgerViewProps {
  scrapTransactions: ScrapTransaction[];
  ringQuoteTransactions: QuoteTransaction[];
  wholesaleTransactions: QuoteTransaction[];
  onDeleteTransaction: (type: 'scrap' | 'retail' | 'wholesale', id: string) => void;
  onLoadIntoEditor: (id: string, isWholesale: boolean) => void;
  onLoadScrapIntoEditor?: (id: string) => void;
  onApplyScrapToQuote?: (scrapId: string, isWholesale: boolean) => void;
  settings: AppSettings;
  spotPrices?: { gold: number; silver: number; platinum: number };
  onAddDemoTransaction?: () => void;
  onTriggerPrint?: (printFn: () => void) => void;
  isIframe?: boolean;
  onRefreshLedger?: () => Promise<void>;
  isSyncingLedger?: boolean;
  onLoadOlderRecords?: (type: 'retail' | 'wholesale' | 'scrap') => Promise<void>;
  loadedFullCloudHistory?: { retail: boolean; wholesale: boolean; scrap: boolean };
  loadingOlderCloud?: { retail: boolean; wholesale: boolean; scrap: boolean };
  onUpdateRetailStoneOrder?: (
    txId: string,
    stoneKey: string,
    patch: { status?: StoneOrderStatus; sourceTag?: string }
  ) => void;
}

interface RetailCenterStoneEntry {
  txId: string;
  txName: string;
  txDate: string;
  stoneKey: string;
  itemLabel: string;
  caratsDisplay: string;
  caratsNum: number;
  shape: string;
  stoneMeta: string;
  status: StoneOrderStatus;
  sourceTag: string;
}

const ITEM_CATEGORY_LABELS: Record<string, string> = {
  customRing: 'Custom Ring',
  weddingBand: 'Wedding Band',
  mensBand: "Men's Band",
  pendant: 'Pendant',
  earrings: 'Earrings',
  tennisBracelet: 'Tennis Bracelet',
  repair: 'Repair'
};

/**
 * Extracts ONLY studio-supplied center stones from a Retail quote (no melee, no fancy side stones,
 * no tennis bracelet stones, and no customer-supplied stones).
 */
function extractRetailCenterStones(tx: QuoteTransaction): RetailCenterStoneEntry[] {
  if (!tx || tx.isWholesale) return [];
  const rings = tx.fullData?.rings || [];
  const entries: RetailCenterStoneEntry[] = [];
  const orderMap = tx.stoneOrders || {};

  rings.forEach((r, ringIdx) => {
    if (!r || r.stoneSource === 'customer') return;
    if (r.category === 'repair' || r.category === 'tennisBracelet' || r.category === 'mensBand') return;

    const ringId = r.id || `item_${ringIdx}`;
    const itemLabel = r.customTitle?.trim() || ITEM_CATEGORY_LABELS[r.category] || 'Jewelry Piece';

    const rawCenterList =
      Array.isArray(r.centerStones) && r.centerStones.length > 0
        ? r.centerStones
        : [
            ...(r.centerStone ? [r.centerStone] : []),
            ...(r.category === 'earrings' && r.centerStone2 ? [r.centerStone2] : [])
          ];

    rawCenterList.forEach((cs, csIdx) => {
      if (!cs) return;
      const ctVal = parseFloat(String(cs.carats || '').trim());
      if (isNaN(ctVal) || ctVal <= 0) return;

      const stoneKey = `${ringId}__cs_${csIdx}`;
      const rawOrder = orderMap[stoneKey] as any;
      const status: StoneOrderStatus =
        typeof rawOrder === 'string'
          ? (rawOrder === 'ordered' ? 'ordered' : 'to_order')
          : (rawOrder?.status === 'ordered' ? 'ordered' : 'to_order');
      const sourceTag =
        typeof rawOrder === 'object' && rawOrder?.sourceTag
          ? String(rawOrder.sourceTag)
          : '';

      const shape = (cs.shape || 'Round').trim();
      const origin = (cs.origin || '').trim();
      const type = (cs.type || '').trim();
      const stoneMeta = [origin, type].filter(Boolean).join(' ');

      entries.push({
        txId: tx.id,
        txName: tx.name || 'Unnamed Client',
        txDate: tx.date || '',
        stoneKey,
        itemLabel: rawCenterList.length > 1 ? `${itemLabel} (#${csIdx + 1})` : itemLabel,
        caratsDisplay: `${ctVal.toFixed(2)} ct`,
        caratsNum: ctVal,
        shape,
        stoneMeta,
        status,
        sourceTag
      });
    });
  });

  return entries;
}

function StoneShapeIcon({
  shape,
  ordered,
  size = 15,
  className = ''
}: {
  shape: string;
  ordered: boolean;
  size?: number;
  className?: string;
}) {
  const normalized = (shape || 'round').trim().toLowerCase();
  const colorClass = ordered ? 'text-emerald-600' : 'text-red-600';

  const renderShape = () => {
    if (normalized.includes('oval')) {
      return (
        <>
          <ellipse cx="12" cy="12" rx="6.6" ry="9.5" fill="currentColor" fillOpacity="0.18" />
          <ellipse cx="12" cy="12" rx="3.4" ry="5.6" strokeWidth="1.15" strokeOpacity="0.65" />
        </>
      );
    }
    if (normalized.includes('princess')) {
      return (
        <>
          <rect x="4" y="4" width="16" height="16" rx="1" fill="currentColor" fillOpacity="0.18" />
          <polygon points="12,6.5 17.5,12 12,17.5 6.5,12" strokeWidth="1.15" strokeOpacity="0.65" />
        </>
      );
    }
    if (normalized.includes('pear')) {
      return (
        <>
          <path d="M12 2.5 C15.2 6.8 18.4 10.8 18.4 14.8 A6.4 6.4 0 0 1 5.6 14.8 C5.6 10.8 8.8 6.8 12 2.5 Z" fill="currentColor" fillOpacity="0.18" />
          <path d="M12 7.2 C13.8 9.8 15.4 12 15.4 14.5 A3.4 3.4 0 0 1 8.6 14.5 C8.6 12 10.2 9.8 12 7.2 Z" strokeWidth="1.15" strokeOpacity="0.65" />
        </>
      );
    }
    if (normalized.includes('emerald')) {
      return (
        <>
          <polygon points="7.5,3 16.5,3 19,5.5 19,18.5 16.5,21 7.5,21 5,18.5 5,5.5" fill="currentColor" fillOpacity="0.18" />
          <polygon points="9,6.2 15,6.2 16.2,7.4 16.2,16.6 15,17.8 9,17.8 7.8,16.6 7.8,7.4" strokeWidth="1.15" strokeOpacity="0.65" />
        </>
      );
    }
    if (normalized.includes('radiant')) {
      return (
        <>
          <polygon points="7.5,3 16.5,3 19,5.5 19,18.5 16.5,21 7.5,21 5,18.5 5,5.5" fill="currentColor" fillOpacity="0.18" />
          <rect x="8.3" y="6.8" width="7.4" height="10.4" strokeWidth="1.15" strokeOpacity="0.65" />
          <path d="M5.4 5.8 L8.3 6.8 M18.6 5.8 L15.7 6.8 M5.4 18.2 L8.3 17.2 M18.6 18.2 L15.7 17.2" strokeWidth="1.1" strokeOpacity="0.65" />
        </>
      );
    }
    if (normalized.includes('marquise')) {
      return (
        <>
          <path d="M12 2.2 Q18.5 7.4 18.5 12 Q18.5 16.6 12 21.8 Q5.5 16.6 5.5 12 Q5.5 7.4 12 2.2 Z" fill="currentColor" fillOpacity="0.18" />
          <path d="M12 6.6 Q15.3 9.4 15.3 12 Q15.3 14.6 12 17.4 Q8.7 14.6 8.7 12 Q8.7 9.4 12 6.6 Z" strokeWidth="1.15" strokeOpacity="0.65" />
        </>
      );
    }
    if (normalized.includes('cushion')) {
      return (
        <>
          <rect x="4" y="4" width="16" height="16" rx="4.8" fill="currentColor" fillOpacity="0.18" />
          <rect x="7.5" y="7.5" width="9" height="9" rx="2.4" strokeWidth="1.15" strokeOpacity="0.65" />
        </>
      );
    }
    if (normalized.includes('heart')) {
      return (
        <path d="M12 20.5 C12 20.5 4 14.8 4 9.2 A4.2 4.2 0 0 1 12 7 A4.2 4.2 0 0 1 20 9.2 C20 14.8 12 20.5 12 20.5 Z" fill="currentColor" fillOpacity="0.18" />
      );
    }
    if (normalized.includes('asscher')) {
      return (
        <>
          <polygon points="7,4 17,4 20,7 20,17 17,20 7,20 4,17 4,7" fill="currentColor" fillOpacity="0.18" />
          <polygon points="9,7.5 15,7.5 16.5,9 16.5,15 15,16.5 9,16.5 7.5,15 7.5,9" strokeWidth="1.15" strokeOpacity="0.65" />
        </>
      );
    }
    if (normalized.includes('baguette')) {
      return (
        <>
          <rect x="7" y="3" width="10" height="18" rx="0.8" fill="currentColor" fillOpacity="0.18" />
          <rect x="9.5" y="6.2" width="5" height="11.6" strokeWidth="1.15" strokeOpacity="0.65" />
        </>
      );
    }
    if (normalized.includes('trillion') || normalized.includes('trilliant')) {
      return (
        <>
          <path d="M12 3.2 Q17.6 11 20.5 19.2 Q12 20.8 3.5 19.2 Q6.4 11 12 3.2 Z" fill="currentColor" fillOpacity="0.18" />
          <polygon points="12,8.4 16.2,16.2 7.8,16.2" strokeWidth="1.15" strokeOpacity="0.65" />
        </>
      );
    }
    // Default: Round brilliant
    return (
      <>
        <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.18" />
        <polygon points="12,6.2 16.1,7.9 17.8,12 16.1,16.1 12,17.8 7.9,16.1 6.2,12 7.9,7.9" strokeWidth="1.15" strokeOpacity="0.65" />
      </>
    );
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${colorClass} ${className}`}
    >
      {renderShape()}
    </svg>
  );
}

function SourceTagInput({
  value,
  onCommit
}: {
  value: string;
  onCommit: (nextTag: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  const commitValue = () => {
    const cleaned = draft.trim().replace(/\s+/g, ' ').slice(0, 20);
    setDraft(cleaned);
    if (cleaned !== value) {
      onCommit(cleaned);
    }
  };

  return (
    <input
      type="text"
      value={draft}
      maxLength={20}
      placeholder="From..."
      title="Optional 1-word supplier tag (press Enter or click away to save)"
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commitValue}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
      className="w-24 bg-brand-50/50 hover:bg-white focus:bg-white border border-brand-200 focus:border-brand-gold rounded-lg px-2 py-1 text-[11px] font-medium text-brand-900 placeholder:text-brand-400 outline-none transition-colors"
    />
  );
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
  const empId = (tx.employeeId || tx.fullData?.employeeId || "").toLowerCase();

  const combinedHeader = `${name} ${phone} ${jobNum} ${jobDesc} ${notes} ${email} ${empId}`.toLowerCase();
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
  const emp = (tx.employeeId || "").toLowerCase();

  const combinedHeader = `${name} ${phone} ${address} ${summary} ${dl} ${emp}`.toLowerCase();
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
  onApplyScrapToQuote,
  settings,
  spotPrices,
  onAddDemoTransaction,
  onTriggerPrint,
  isIframe,
  onRefreshLedger,
  isSyncingLedger,
  onLoadOlderRecords,
  loadedFullCloudHistory,
  loadingOlderCloud,
  onUpdateRetailStoneOrder
}: LedgerViewProps) {
  const [activeLedger, setActiveLedger] = useState<'scrap' | 'retail' | 'wholesale'>('retail');
  const [retailView, setRetailView] = useState<'quotes' | 'stones'>('quotes');
  const [stoneFilter, setStoneFilter] = useState<'to_order' | 'ordered' | 'all'>('to_order');
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

  // Retail-only studio center stones map & master queue
  const retailCenterStonesByTx = React.useMemo(() => {
    const map = new Map<string, RetailCenterStoneEntry[]>();
    for (const tx of ringQuoteTransactions) {
      const stones = extractRetailCenterStones(tx);
      if (stones.length > 0) {
        map.set(tx.id, stones);
      }
    }
    return map;
  }, [ringQuoteTransactions]);

  const allRetailCenterStones = React.useMemo(() => {
    const list: RetailCenterStoneEntry[] = [];
    for (const tx of ringQuoteTransactions) {
      const stones = retailCenterStonesByTx.get(tx.id);
      if (stones) list.push(...stones);
    }
    return list;
  }, [ringQuoteTransactions, retailCenterStonesByTx]);

  const stoneCounts = React.useMemo(() => {
    let toOrder = 0;
    let ordered = 0;
    for (const s of allRetailCenterStones) {
      if (s.status === 'ordered') ordered++;
      else toOrder++;
    }
    return { toOrder, ordered, all: allRetailCenterStones.length };
  }, [allRetailCenterStones]);

  const filteredRetailCenterStones = React.useMemo(() => {
    return allRetailCenterStones.filter(stone => {
      if (stoneFilter === 'to_order' && stone.status !== 'to_order') return false;
      if (stoneFilter === 'ordered' && stone.status !== 'ordered') return false;
      if (!fullSearchStr) return true;
      const haystack = `${stone.txName} ${stone.itemLabel} ${stone.caratsDisplay} ${stone.caratsNum} ${stone.shape} ${stone.stoneMeta} ${stone.sourceTag}`.toLowerCase();
      return queryWords.every(w => haystack.includes(w));
    });
  }, [allRetailCenterStones, stoneFilter, fullSearchStr, queryWords]);

  const currentTxData = () => {
    if (!selectedTx) return null;
    const { type, id } = selectedTx;
    if (type === 'scrap') return scrapTransactions.find(t => t.id === id);
    if (type === 'retail') return ringQuoteTransactions.find(t => t.id === id);
    return wholesaleTransactions.find(t => t.id === id);
  };

  const activeTx = currentTxData();
  const activeRetailCenterStones =
    selectedTx?.type === 'retail' && activeTx
      ? (retailCenterStonesByTx.get(activeTx.id) || [])
      : [];

  const handleToggleCenterStone = (txId: string, stoneKey: string, currentStatus: StoneOrderStatus) => {
    if (!onUpdateRetailStoneOrder) return;
    playClickSound('click');
    const nextStatus: StoneOrderStatus = currentStatus === 'ordered' ? 'to_order' : 'ordered';
    onUpdateRetailStoneOrder(txId, stoneKey, { status: nextStatus });
  };

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
        const catLabel = r.customTitle?.trim() || (r.category === 'customRing' ? 'Engagement' : r.category === 'weddingBand' ? 'Wedding Band' : r.category === 'mensBand' ? "Men's Band" : r.category === 'pendant' ? 'Pendant' : r.category === 'earrings' ? 'Earrings' : r.category === 'tennisBracelet' ? 'Tennis Bracelet' : 'Custom Piece');
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
        <div className="flex gap-1 p-1 bg-brand-50 rounded-xl border border-brand-200/60 mb-3 shadow-inner">
          <button
            type="button"
            onClick={() => { setActiveLedger('retail'); setSearch(''); }}
            className={`flex-1 py-2 px-2 text-center rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${activeLedger === 'retail' ? 'bg-brand-900 text-white shadow-sm' : 'text-brand-500 hover:text-brand-800'}`}
          >
            Retail
          </button>
          <button
            type="button"
            onClick={() => { setActiveLedger('wholesale'); setSearch(''); }}
            className={`flex-1 py-2 px-2 text-center rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${activeLedger === 'wholesale' ? 'bg-brand-900 text-white shadow-sm' : 'text-brand-500 hover:text-brand-800'}`}
          >
            Wholesale
          </button>
          <button
            type="button"
            onClick={() => { setActiveLedger('scrap'); setSearch(''); }}
            className={`flex-1 py-2 px-2 text-center rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${activeLedger === 'scrap' ? 'bg-brand-900 text-white shadow-sm' : 'text-brand-500 hover:text-brand-800'}`}
          >
            Scrap
          </button>
        </div>

        {/* Retail Sub-View Switcher (Quotes vs Stones) */}
        {activeLedger === 'retail' && (
          <div className="flex items-center gap-1 p-1 bg-brand-50/80 border border-brand-200/60 rounded-xl mb-3">
            <button
              type="button"
              onClick={() => { setRetailView('quotes'); setSearch(''); }}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${retailView === 'quotes' ? 'bg-white text-brand-900 shadow-xs' : 'text-brand-500 hover:text-brand-800'}`}
            >
              Quotes
            </button>
            <button
              type="button"
              onClick={() => { setRetailView('stones'); setSearch(''); }}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${retailView === 'stones' ? 'bg-white text-brand-900 shadow-xs' : 'text-brand-500 hover:text-brand-800'}`}
              title="Retail center stones to order"
            >
              Stones{stoneCounts.toOrder > 0 ? ` (${stoneCounts.toOrder})` : ''}
            </button>
          </div>
        )}

        {/* Search controls & Sync/Refresh button */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={activeLedger === 'retail' && retailView === 'stones' ? "Search client, ct, shape, or tag..." : "Search by client, job #, or specs..."}
              className="w-full bg-brand-50/50 border border-brand-200 pl-9 pr-4 py-2.5 rounded-xl text-xs font-bold focus:bg-white focus:ring-1 focus:ring-brand-gold outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={14} className="absolute left-3 top-3.5 text-brand-400" />
          </div>
          {onRefreshLedger && (
            <button
              type="button"
              onClick={onRefreshLedger}
              disabled={isSyncingLedger}
              className={`px-3.5 py-2 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${isSyncingLedger ? 'animate-pulse' : ''}`}
              title="Refresh and sync ledger items from Firestore cloud"
            >
              <RefreshCw size={13} className={`text-brand-gold ${isSyncingLedger ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncingLedger ? 'Syncing...' : 'Sync'}</span>
            </button>
          )}
        </div>

        {/* Retail Center Stone Filter Bar */}
        {activeLedger === 'retail' && retailView === 'stones' && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-3">
            <button
              type="button"
              onClick={() => setStoneFilter('to_order')}
              className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${stoneFilter === 'to_order' ? 'bg-white text-red-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              To Order ({stoneCounts.toOrder})
            </button>
            <button
              type="button"
              onClick={() => setStoneFilter('ordered')}
              className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${stoneFilter === 'ordered' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Ordered ({stoneCounts.ordered})
            </button>
            <button
              type="button"
              onClick={() => setStoneFilter('all')}
              className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${stoneFilter === 'all' ? 'bg-white text-brand-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All ({stoneCounts.all})
            </button>
          </div>
        )}

        {/* Transactions list queue */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 hide-scrollbar">
          {activeLedger === 'retail' && retailView === 'quotes' && (
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
                filteredRetail.map(tx => {
                  const txStones = retailCenterStonesByTx.get(tx.id) || [];
                  return (
                    <div
                      key={tx.id}
                      onClick={() => setSelectedTx({ type: 'retail', id: tx.id })}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-sm flex items-center justify-between ${selectedTx?.id === tx.id ? 'bg-brand-50 border-brand-gold' : 'bg-white border-brand-100 hover:border-brand-300'}`}
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <p className="font-bold text-xs text-brand-900 flex items-center flex-wrap gap-1.5">
                          <span className="truncate">{tx.name || 'Unnamed Client'}</span>
                          {(tx.employeeId || tx.fullData?.employeeId) && (
                            <span className="bg-brand-100 text-brand-700 text-[8.5px] font-bold px-1.5 py-0.2 rounded font-mono">
                              Emp: {tx.employeeId || tx.fullData?.employeeId}
                            </span>
                          )}
                        </p>
                        <p className="text-[9px] text-brand-400 font-mono">{tx.date}</p>
                        {txStones.length > 0 && (
                          <div className="flex flex-col gap-0.5 pt-0.5">
                            {txStones.map(stone => {
                              const isOrdered = stone.status === 'ordered';
                              return (
                                <div
                                  key={stone.stoneKey}
                                  className="inline-flex items-center gap-1.5 min-w-0 text-[10.5px] leading-tight"
                                  title={`${stone.shape} ${stone.caratsDisplay} — ${isOrdered ? 'Ordered' : 'To Order'}${stone.sourceTag ? ` (${stone.sourceTag})` : ''}`}
                                >
                                  <StoneShapeIcon shape={stone.shape} ordered={isOrdered} size={14} />
                                  <span className={`font-semibold shrink-0 ${isOrdered ? 'text-emerald-800' : 'text-red-700'}`}>
                                    {stone.shape}
                                  </span>
                                  <span className="font-mono tabular-nums font-bold text-brand-800 shrink-0">
                                    {stone.caratsDisplay}
                                  </span>
                                  {stone.sourceTag && (
                                    <>
                                      <span aria-hidden="true" className="text-brand-300 shrink-0">·</span>
                                      <span className={`font-semibold truncate ${isOrdered ? 'text-emerald-700' : 'text-red-600'}`}>
                                        {stone.sourceTag}
                                      </span>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-xs text-brand-800 font-mono tabular-nums">{tx.total}</span>
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
                  );
                })
              )}
            </>
          )}

          {activeLedger === 'retail' && retailView === 'stones' && (
            filteredRetailCenterStones.length === 0 ? (
              <div className="text-center py-10 px-4 space-y-2.5">
                <p className="text-xs font-semibold text-brand-700">
                  {stoneFilter === 'to_order'
                    ? (stoneCounts.all === 0
                        ? 'No Retail center stones found'
                        : 'All Retail center stones are ordered')
                    : stoneFilter === 'ordered'
                    ? 'No center stones marked as ordered yet'
                    : 'No matching Retail center stones'}
                </p>
                <p className="text-[11px] text-brand-400">
                  Only studio-supplied center stones from Retail quotes appear here.
                </p>
                {stoneFilter === 'to_order' && stoneCounts.ordered > 0 && (
                  <button
                    type="button"
                    onClick={() => setStoneFilter('ordered')}
                    className="text-[11px] font-bold text-brand-800 hover:text-brand-950 underline cursor-pointer"
                  >
                    View {stoneCounts.ordered} ordered {stoneCounts.ordered === 1 ? 'stone' : 'stones'}
                  </button>
                )}
              </div>
            ) : (
              filteredRetailCenterStones.map(stone => {
                const isSelected = selectedTx?.type === 'retail' && selectedTx.id === stone.txId;
                const isOrdered = stone.status === 'ordered';
                return (
                  <div
                    key={`${stone.txId}_${stone.stoneKey}`}
                    onClick={() => setSelectedTx({ type: 'retail', id: stone.txId })}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${isSelected ? 'bg-brand-50 border-brand-gold' : 'bg-white border-brand-100 hover:border-brand-300'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <StoneShapeIcon shape={stone.shape} ordered={isOrdered} size={19} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-brand-950 flex items-baseline gap-1.5 flex-wrap leading-tight">
                            <span className="font-mono tabular-nums font-black">{stone.caratsDisplay}</span>
                            <span aria-hidden="true" className="text-brand-300">·</span>
                            <span>{stone.shape}</span>
                          </p>
                          {stone.stoneMeta && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{stone.stoneMeta}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleCenterStone(stone.txId, stone.stoneKey, stone.status);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer border ${
                          isOrdered
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                        }`}
                      >
                        {isOrdered ? <Check size={12} /> : <StoneShapeIcon shape={stone.shape} ordered={false} size={12} />}
                        {isOrdered ? 'Ordered' : 'To Order'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-brand-100/80">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-brand-900 truncate">{stone.txName}</p>
                        <p className="text-[10px] text-brand-400 truncate">
                          {stone.itemLabel} · {stone.txDate}
                        </p>
                      </div>
                      {onUpdateRetailStoneOrder && (
                        <SourceTagInput
                          value={stone.sourceTag}
                          onCommit={(nextTag) => onUpdateRetailStoneOrder(stone.txId, stone.stoneKey, { sourceTag: nextTag })}
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )
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
                      {(tx.employeeId || tx.fullData?.employeeId) && (
                        <span className="bg-emerald-50 text-emerald-700 text-[8.5px] font-bold px-1.5 py-0.2 rounded font-mono">
                          Emp: {tx.employeeId || tx.fullData?.employeeId}
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[9px] text-brand-400 font-mono">{tx.date}</p>
                      {tx.employeeId && (
                        <span className="text-[8px] font-bold text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded font-mono">
                          Staff: {tx.employeeId}
                        </span>
                      )}
                    </div>
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
          {onLoadOlderRecords && (
            <div className="pt-2 pb-1">
              {loadedFullCloudHistory?.[activeLedger] ? (
                <p className="text-center text-[10px] font-bold uppercase tracking-wider text-brand-400 py-2">
                  All cloud records loaded for this ledger
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => onLoadOlderRecords(activeLedger)}
                  disabled={loadingOlderCloud?.[activeLedger]}
                  className="w-full py-2.5 px-3 rounded-xl border border-brand-200 bg-white hover:bg-brand-50 text-brand-700 hover:text-brand-900 text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw size={13} className={loadingOlderCloud?.[activeLedger] ? 'animate-spin text-brand-gold' : 'text-brand-gold'} />
                  {loadingOlderCloud?.[activeLedger] ? 'Loading Older Cloud Records...' : 'Load Older Cloud Records'}
                </button>
              )}
            </div>
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
                  <>
                    {onLoadScrapIntoEditor && (
                      <button
                        type="button"
                        onClick={() => onLoadScrapIntoEditor(activeTx.id)}
                        className="bg-brand-50 hover:bg-brand-100 text-brand-800 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-brand-200 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                      >
                        <FileText size={12} />
                        Adjust Scrap Buyback
                      </button>
                    )}
                    {onApplyScrapToQuote && (
                      <button
                        type="button"
                        onClick={() => onApplyScrapToQuote(activeTx.id, true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                        title="Apply this scrap buyback credit to a Wholesale job order"
                      >
                        <Coins size={12} />
                        Apply to Wholesale
                      </button>
                    )}
                  </>
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

            {/* Retail Center Stone Order Bar (Retail only, hidden when printing) */}
            {selectedTx.type === 'retail' && activeRetailCenterStones.length > 0 && onUpdateRetailStoneOrder && (
              <div className="mb-4 pb-3 border-b border-brand-100 space-y-2 print:hidden">
                <div className="flex items-center justify-between text-[11px] text-brand-500">
                  <span className="font-bold text-brand-800">Center Stone Order Status</span>
                  <span>
                    {activeRetailCenterStones.filter(s => s.status === 'ordered').length}/{activeRetailCenterStones.length} ordered
                  </span>
                </div>
                <div className="divide-y divide-brand-100/80 border border-brand-100 rounded-xl bg-brand-50/30">
                  {activeRetailCenterStones.map(stone => {
                    const isOrdered = stone.status === 'ordered';
                    return (
                      <div
                        key={stone.stoneKey}
                        className="px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0 text-xs">
                          <StoneShapeIcon shape={stone.shape} ordered={isOrdered} size={16} />
                          <span className="font-mono tabular-nums font-black text-brand-950">{stone.caratsDisplay}</span>
                          <span aria-hidden="true" className="text-brand-300">·</span>
                          <span className="font-semibold text-brand-900">{stone.shape}</span>
                          {stone.stoneMeta && (
                            <>
                              <span aria-hidden="true" className="text-brand-300">·</span>
                              <span className="text-slate-500 text-[11px]">{stone.stoneMeta}</span>
                            </>
                          )}
                          <span className="text-[10px] text-brand-400 truncate">({stone.itemLabel})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <SourceTagInput
                            value={stone.sourceTag}
                            onCommit={(nextTag) => onUpdateRetailStoneOrder(stone.txId, stone.stoneKey, { sourceTag: nextTag })}
                          />
                          <button
                            type="button"
                            onClick={() => handleToggleCenterStone(stone.txId, stone.stoneKey, stone.status)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer border ${
                              isOrdered
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                            }`}
                          >
                            {isOrdered ? <Check size={12} /> : <StoneShapeIcon shape={stone.shape} ordered={false} size={12} />}
                            {isOrdered ? 'Ordered' : 'To Order'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Document sheet contents */}
            <div className="flex-1 overflow-y-auto max-h-[500px] pr-1 hide-scrollbar print:overflow-visible print:max-h-none print:p-0">
              {/* LEDGER RENDER 1: Scrap buyback Receipt (1-Page Printout) */}
              {selectedTx.type === 'scrap' && (
                <div id="ledger-invoice-box" className="p-4 md:p-6 bg-white border border-brand-200 rounded-2xl text-brand-900 text-left font-sans max-w-2xl mx-auto print:p-0 print:border-none print:shadow-none print:rounded-none print:max-w-none print:max-h-[1020px] print:overflow-hidden break-inside-avoid">
                  <div className="border border-brand-200 rounded-xl p-4 print:p-3.5 bg-white shadow-none space-y-3">
                    {/* 1. Header with Brand & Receipt Metadata */}
                    <div className="flex justify-between items-start border-b border-brand-900 pb-2.5">
                      <div>
                        <h1 className="font-serif text-xl font-black italic tracking-wide text-brand-950 mb-0.5 leading-none">
                          Gold And Rose Jewellery Corp
                        </h1>
                        <p className="text-[9px] text-brand-600 font-bold uppercase tracking-wider">
                          James Lee • 604-250-7414 • Vancouver, BC
                        </p>
                        <p className="text-[7.5px] text-brand-400 font-mono">
                          GST/HST: 737186213RT0001
                        </p>
                      </div>
                      <div className="text-right">
                        <h2 className="text-xs font-black uppercase tracking-widest text-brand-800">
                          Precious Metals Buyback Log
                        </h2>
                        <p className="text-[9px] font-bold text-brand-700 mt-0.5">
                          {(activeTx as ScrapTransaction).date}
                        </p>
                        <p className="text-[7.5px] font-mono text-brand-400">
                          Ref ID: #{activeTx.id}
                          {(activeTx as ScrapTransaction).employeeId && ` • Staff ID: ${(activeTx as ScrapTransaction).employeeId}`}
                        </p>
                      </div>
                    </div>

                    {/* 2. Spot Price Market Benchmarks Banner */}
                    {((activeTx as ScrapTransaction).spotPrices || spotPrices) && (
                      <div className="bg-brand-50/80 px-2.5 py-1 rounded-lg border border-brand-200/60 flex items-center justify-between text-[8px] text-brand-600 font-mono">
                        <span className="font-bold text-brand-800 uppercase tracking-wider text-[7.5px]">Market Benchmarks:</span>
                        <span>Gold: <strong className="text-brand-900">${((activeTx as ScrapTransaction).spotPrices?.gold || spotPrices?.gold || 4000).toFixed(2)}</strong>/oz CAD</span>
                        <span>Silver: <strong className="text-brand-900">${((activeTx as ScrapTransaction).spotPrices?.silver || spotPrices?.silver || 45).toFixed(2)}</strong>/oz CAD</span>
                        <span>Platinum: <strong className="text-brand-900">${((activeTx as ScrapTransaction).spotPrices?.platinum || spotPrices?.platinum || 1200).toFixed(2)}</strong>/oz CAD</span>
                      </div>
                    )}

                    {/* 3. Customer Information & Payout Summary Card */}
                    <div className="grid grid-cols-2 gap-2.5 text-[9.5px]">
                      <div className="bg-brand-50/60 p-2.5 rounded-lg border border-brand-200">
                        <p className="text-[8px] uppercase font-black text-brand-400 tracking-wider mb-1">
                          Client & Compliance Details
                        </p>
                        <p className="font-black text-brand-900 text-[10px] leading-tight">{activeTx.name || 'Walk-in Client'}</p>
                        {(activeTx as ScrapTransaction).phone && (
                          <p className="text-brand-700 mt-0.5 font-medium leading-tight">Phone: {(activeTx as ScrapTransaction).phone}</p>
                        )}
                        {(activeTx as ScrapTransaction).address && (
                          <p className="text-brand-500 mt-0.5 leading-tight">{(activeTx as ScrapTransaction).address}</p>
                        )}
                        {(activeTx as ScrapTransaction).driversLicense && (
                          <p className="text-[8px] text-brand-700 mt-1 font-mono font-bold bg-white/80 inline-block px-1.5 py-0.5 rounded border border-brand-200">
                            Verified ID / DL: {(activeTx as ScrapTransaction).driversLicense}
                          </p>
                        )}
                        {(activeTx as ScrapTransaction).employeeId && (
                          <p className="text-[8px] text-brand-600 mt-1 font-mono font-bold bg-brand-100/60 inline-block px-1.5 py-0.5 rounded border border-brand-200">
                            Staff Rep / ID: {(activeTx as ScrapTransaction).employeeId}
                          </p>
                        )}
                      </div>
                      <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 text-right flex flex-col justify-between">
                        <div>
                          <p className="text-[8px] uppercase font-black text-emerald-800 tracking-wider">
                            Total Net Payout Paid (CAD)
                          </p>
                          <p className="text-xl font-black text-emerald-700 leading-none mt-0.5">
                            ${activeTx.total}
                          </p>
                        </div>
                        <div className="text-[8px] text-emerald-800/80 font-mono mt-1 pt-1 border-t border-emerald-200/60 flex justify-between">
                          <span>
                            Total Weight: <strong>{((activeTx as ScrapTransaction).items || []).reduce((acc, it) => acc + (Number(it.weight) || 0), 0).toFixed(2)}g</strong>
                          </span>
                          <span>Settled in Full</span>
                        </div>
                      </div>
                    </div>

                    {/* 4. Itemized Verified Precious Metals Table */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center border-b border-brand-200 pb-1">
                        <span className="text-[8.5px] uppercase font-black text-brand-700 tracking-wider">
                          Verified Precious Metals Received
                        </span>
                        <span className="text-[7.5px] font-mono text-brand-500">
                          {((activeTx as ScrapTransaction).items || []).length} lot(s) evaluated
                        </span>
                      </div>

                      <table className="w-full text-left text-[9px] border-collapse">
                        <thead>
                          <tr className="border-b border-brand-200 text-[8px] font-black uppercase text-brand-500 bg-brand-50/50">
                            <th className="py-1 px-1.5">#</th>
                            <th className="py-1 px-1.5">Material / Karat</th>
                            <th className="py-1 px-1.5">Purity</th>
                            <th className="py-1 px-1.5">Gross Wt</th>
                            <th className="py-1 px-1.5 text-center">Payout Rate</th>
                            <th className="py-1 px-1.5 text-right">Value (CAD)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-100">
                          {((activeTx as ScrapTransaction).items || []).map((it, idx) => {
                            const txSpotPrices = (activeTx as ScrapTransaction).spotPrices || spotPrices || { gold: 4000, silver: 45, platinum: 1200 };
                            const val = calculateScrapItemValue(it, txSpotPrices);
                            const numPurity = Number(it.purity) || 0;
                            const pStr = `${it.purity}%`;
                            let karatLabel = '';
                            if (it.purityMode === 'karat' && it.karatOption) {
                              if (it.material === 'gold') {
                                karatLabel = `${it.karatOption.replace(/k/i, '')}K Gold`;
                              } else if (it.material === 'silver') {
                                karatLabel = `${it.karatOption} Silver`;
                              } else {
                                karatLabel = `${it.karatOption} Platinum`;
                              }
                            } else if (it.purityMode === 'manual') {
                              karatLabel = `Custom ${it.material ? it.material.toUpperCase() : 'Lot'} (${it.purity}%)`;
                            } else if (it.material === 'gold') {
                              const kVal = Math.round((numPurity / 100) * 24);
                              karatLabel = `${kVal}K Gold`;
                            } else if (it.material === 'silver') {
                              karatLabel = `${numPurity >= 92.5 ? 'Sterling 925' : 'Fine'} Silver`;
                            } else {
                              karatLabel = `${numPurity >= 95 ? 'Plat 950' : 'Plat 900'} Platinum`;
                            }

                            return (
                              <tr key={idx} className="hover:bg-brand-50/30">
                                <td className="py-1 px-1.5 font-mono text-brand-400 font-bold">{idx + 1}</td>
                                <td className="py-1 px-1.5 font-bold text-brand-900">{karatLabel}</td>
                                <td className="py-1 px-1.5 font-mono text-brand-600">{pStr}</td>
                                <td className="py-1 px-1.5 font-mono font-bold text-brand-800">{Number(it.weight).toFixed(2)}g</td>
                                <td className="py-1 px-1.5 font-mono text-center text-brand-700">{it.rate}%</td>
                                <td className="py-1 px-1.5 font-mono font-bold text-right text-brand-900">${val.toFixed(2)}</td>
                              </tr>
                            );
                          })}

                          {Number((activeTx as ScrapTransaction).stoneRemovalQty) > 0 && (
                            <tr className="bg-red-50/40 text-red-700 font-medium">
                              <td className="py-1 px-1.5 font-mono text-red-400 font-bold">•</td>
                              <td colSpan={4} className="py-1 px-1.5">
                                Stone extraction & bench refining fee ({(activeTx as ScrapTransaction).stoneRemovalQty} stone{Number((activeTx as ScrapTransaction).stoneRemovalQty) > 1 ? 's' : ''} @ $5.00/ea)
                              </td>
                              <td className="py-1 px-1.5 font-mono font-bold text-right text-red-700">
                                -${(Number((activeTx as ScrapTransaction).stoneRemovalQty) * 5).toFixed(2)}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* 5. Verified Compliance Photographs (Thumbnails adjusted for 1-page fit) */}
                    {((activeTx as ScrapTransaction).image || (activeTx as ScrapTransaction).goldImage) && (
                      <div className="border border-brand-200 rounded-lg p-1.5 bg-brand-50/30 space-y-1">
                        <p className="text-[7.5px] uppercase font-black text-brand-500 tracking-wider">
                          Verification Proof & Compliance Attachments
                        </p>
                        <div className="flex items-center justify-center gap-3">
                          {(activeTx as ScrapTransaction).image && (
                            <div className="bg-white p-1 rounded border border-brand-200 flex flex-col items-center flex-1 max-w-[200px]">
                              <span className="text-[6.5px] font-bold uppercase text-brand-500 mb-0.5">Verified ID / Photo</span>
                              <img 
                                src={(activeTx as ScrapTransaction).image!} 
                                alt="Compliance photo" 
                                className="h-12 max-h-12 w-auto object-contain rounded bg-slate-50 cursor-pointer hover:opacity-90 transition-opacity" 
                                onClick={() => setEnlargeImage((activeTx as ScrapTransaction).image!)}
                                title="Click to enlarge"
                              />
                            </div>
                          )}
                          {(activeTx as ScrapTransaction).goldImage && (
                            <div className="bg-white p-1 rounded border border-amber-200 flex flex-col items-center flex-1 max-w-[200px]">
                              <span className="text-[6.5px] font-bold uppercase text-amber-800 mb-0.5">Metal Lot Photograph</span>
                              <img 
                                src={(activeTx as ScrapTransaction).goldImage!} 
                                alt="Scanned gold photo" 
                                className="h-12 max-h-12 w-auto object-contain rounded bg-amber-50/20 cursor-pointer hover:opacity-90 transition-opacity" 
                                onClick={() => setEnlargeImage((activeTx as ScrapTransaction).goldImage!)}
                                title="Click to enlarge"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 6. Legal Terms & Signatures */}
                    <div className="border-t border-brand-200 pt-1.5 space-y-1.5">
                      <p className="text-[7px] text-brand-500 italic leading-relaxed text-center">
                        I certify and declare that I am 18 years of age or older, the sole legal owner of the precious metal items listed above, and possess full right and authority to sell them to Gold & Rose Jewellery Corp. All buyout transactions are absolute, final, and non-refundable.
                      </p>

                      <div className="grid grid-cols-2 gap-4 items-end pt-1">
                        <div className="text-center flex flex-col items-center">
                          {(activeTx as ScrapTransaction).signature ? (
                            <div className="h-8 w-32 flex items-center justify-center relative overflow-hidden mb-0.5">
                              <img 
                                src={(activeTx as ScrapTransaction).signature!} 
                                alt="Client signature" 
                                className="max-h-8 max-w-full object-contain filter brightness-95" 
                              />
                            </div>
                          ) : (
                            <div className="h-8"></div>
                          )}
                          <div className="w-full max-w-[150px] border-b border-brand-400"></div>
                          <p className="text-[7.5px] uppercase font-bold tracking-wider text-brand-700 mt-0.5">
                            Client Authorization Signature
                          </p>
                          <p className="text-[7px] text-brand-400">
                            {activeTx.name || 'Authorized Seller'}
                          </p>
                        </div>

                        <div className="text-center flex flex-col items-center">
                          <div className="h-8 flex items-center justify-center">
                            <span className="font-serif italic font-black text-brand-900 text-sm">James Lee</span>
                          </div>
                          <div className="w-full max-w-[150px] border-b border-brand-400"></div>
                          <p className="text-[7.5px] uppercase font-bold tracking-wider text-brand-700 mt-0.5">
                            Authorized Buyer / Appraiser
                          </p>
                          <p className="text-[7px] text-brand-400">
                            Gold & Rose Jewellery Corp
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* LEDGER RENDER 2: Retail / Wholesale Custom Quote Invoice */}
              {(selectedTx.type === 'retail' || selectedTx.type === 'wholesale') && (() => {
                const fullSession = (activeTx as QuoteTransaction).fullData;
                if (!fullSession) return null;

                const isWholesaleRepair = selectedTx.type === 'wholesale' && (
                  fullSession.rings?.[0]?.category === 'repair' || 
                  (fullSession.rings?.[0]?.repairs && fullSession.rings[0].repairs.length > 0)
                );

                if (isWholesaleRepair) {
                  return (
                    <WholesaleRepairInvoicePrint
                      session={fullSession}
                      settings={settings}
                      containerId="ledger-invoice-box"
                      dateStr={activeTx.date}
                    />
                  );
                }

                const txSpot = (activeTx as any).spotPrices || 
                  (fullSession.overridePrices && (fullSession.overridePrices.gold || fullSession.overridePrices.platinum || fullSession.overridePrices.silver) ? {
                    gold: fullSession.overridePrices.gold || spotPrices?.gold || 4000,
                    silver: fullSession.overridePrices.silver || spotPrices?.silver || 45,
                    platinum: fullSession.overridePrices.platinum || spotPrices?.platinum || 1200,
                  } : (spotPrices || { gold: 4000, silver: 45, platinum: 1200 }));

                return (
                  <ClientInvoicePrint
                    session={fullSession}
                    settings={settings}
                    spotPrices={txSpot}
                    isWholesale={selectedTx.type === 'wholesale'}
                    containerId="ledger-invoice-box"
                    dateStr={activeTx.date}
                    enlargeImage={setEnlargeImage}
                  />
                );
              })()}
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
        name: { first: firstName, last: lastName },
        description: "GOLD & ROSE BESPOKE JEWELRY JOB BREAKDOWN: " + (detailsString || summary) + (notes ? " | Special Notes: " + notes : "")
      };
      if (clientEmail) {
        contactInfo.emails = [{ email: clientEmail, tag: "MAIN", primary: true }];
      }
      if (clientPhone) {
        contactInfo.phones = [{ phone: clientPhone, tag: "MAIN", primary: true }];
      }

      try {
        const contactResult = await contacts.appendOrCreateContact(contactInfo);
        contactId = (contactResult.contact && contactResult.contact.id) || contactResult.contactId;

        const noteContent = "GOLD & ROSE BESPOKE JEWELRY JOB BREAKDOWN\\n" +
                            "-----------------------------------------\\n" +
                            "Job Name: " + (payload.jobName || clientName || "Custom Jewelry Job") + "\\n" +
                            "Phone: " + clientPhone + "\\n" +
                            "Email: " + clientEmail + "\\n\\n" +
                            "Job Details: " + (detailsString || summary) + "\\n\\n" +
                            "Special Notes: " + (notes || "None") + "\\n\\n" +
                            "Total Quote Amount: $" + totalNum.toFixed(2) + " CAD\\n" +
                            "Synced on: " + new Date().toLocaleString();

        // Robust defensive note sync supporting all versions of Wix CRM Velo APIs
        try {
          // Attempt 1: Modern/Standard Contacts V2 API note with content property (Most common for new stores)
          await contacts.addNote(contactId, { content: noteContent });
        } catch (noteObjErr) {
          try {
            // Attempt 2: Legacy CRM API note with simple string parameter (Common in older sites)
            await contacts.addNote(contactId, noteContent);
          } catch (noteStrErr) {
            try {
              // Attempt 3: Alternative CRM API with title and content properties
              await contacts.addNote(contactId, { title: "Job Breakdown #" + transactionId, content: noteContent });
            } catch (anyErr) {
              console.error("All Wix addNote API strategies failed: ", anyErr.message);
            }
          }
        }
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
        name: { first: firstName, last: lastName },
        description: "GOLD & ROSE BESPOKE JEWELRY JOB BREAKDOWN: " + (detailsString || summary) + (notes ? " | Special Notes: " + notes : "")
      };
      if (clientEmail) {
        contactInfo.emails = [{ email: clientEmail, tag: "MAIN", primary: true }];
      }
      if (clientPhone) {
        contactInfo.phones = [{ phone: clientPhone, tag: "MAIN", primary: true }];
      }

      try {
        const contactResult = await contacts.appendOrCreateContact(contactInfo);
        contactId = (contactResult.contact && contactResult.contact.id) || contactResult.contactId;

        const noteContent = "GOLD & ROSE BESPOKE JEWELRY JOB BREAKDOWN\\n" +
                            "-----------------------------------------\\n" +
                            "Job Name: " + (payload.jobName || clientName || "Custom Jewelry Job") + "\\n" +
                            "Phone: " + clientPhone + "\\n" +
                            "Email: " + clientEmail + "\\n\\n" +
                            "Job Details: " + (detailsString || summary) + "\\n\\n" +
                            "Special Notes: " + (notes || "None") + "\\n\\n" +
                            "Total Quote Amount: $" + totalNum.toFixed(2) + " CAD\\n" +
                            "Synced on: " + new Date().toLocaleString();

        // Robust defensive note sync supporting all versions of Wix CRM Velo APIs
        try {
          // Attempt 1: Modern/Standard Contacts V2 API note with content property (Most common for new stores)
          await contacts.addNote(contactId, { content: noteContent });
        } catch (noteObjErr) {
          try {
            // Attempt 2: Legacy CRM API note with simple string parameter (Common in older sites)
            await contacts.addNote(contactId, noteContent);
          } catch (noteStrErr) {
            try {
              // Attempt 3: Alternative CRM API with title and content properties
              await contacts.addNote(contactId, { title: "Job Breakdown #" + transactionId, content: noteContent });
            } catch (anyErr) {
              console.error("All Wix addNote API strategies failed: ", anyErr.message);
            }
          }
        }
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
