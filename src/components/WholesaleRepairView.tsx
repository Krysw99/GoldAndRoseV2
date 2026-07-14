/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Camera, Check, Printer, Coins, FileText, Sparkles, 
  X, Edit2, Save, Undo, Image as ImageIcon, PenTool, Lock, Unlock, HelpCircle, CheckCircle, AlertCircle
} from 'lucide-react';
import { 
  QuoteSession, JewelryItem, RepairSelection, AddonItem, 
  AppSettings, WholesaleSettings, RepairPricingSettings, ScrapTransaction, QuoteTransaction
} from '../types';
import { playClickSound } from '../utils/audio';
import { calculateRingCost, genId } from '../utils';
import SignaturePad from './SignaturePad';
import { printElement } from '../utils/printHelper';

interface WholesaleRepairViewProps {
  session: QuoteSession;
  onChangeSession: React.Dispatch<React.SetStateAction<QuoteSession>>;
  onSaveQuote: () => void;
  onLaunchSketch: (type: 'sketch' | 'photo', index?: number | null) => void;
  settings: AppSettings;
  spotPrices: { gold: number; silver: number; platinum: number };
  scrapTransactions: ScrapTransaction[];
  onTriggerPrint: (printFn: () => void) => void;
  isIframe: boolean;
  embedMode?: boolean;
}

// All standard operations with their display parameters and categories
interface RepairConfig {
  id: string;
  category: 'Sizing' | 'Stones & Engraving' | 'Plating & Polish';
  name: string;
  desc: string;
  hasQty?: boolean;
  qtyLabel?: string;
  hasExtraQty?: boolean; // e.g. sizes added
  extraQtyLabel?: string;
  hasOptions?: boolean; // e.g. replating options
}

const REPAIR_OPERATIONS: RepairConfig[] = [
  // Sizing
  { id: 'resizeUp14kThin', category: 'Sizing', name: 'Resize Up 14k (Thin Band)', desc: 'Base charge + fee per size added', hasExtraQty: true, extraQtyLabel: 'Sizes Added' },
  { id: 'resizeUp14kThick', category: 'Sizing', name: 'Resize Up 14k (Thick Band)', desc: 'Base charge + fee per size added', hasExtraQty: true, extraQtyLabel: 'Sizes Added' },
  { id: 'resizeUp18k', category: 'Sizing', name: 'Resize Up 18k Gold', desc: 'Base charge + fee per size added', hasExtraQty: true, extraQtyLabel: 'Sizes Added' },
  { id: 'resizeUp22k', category: 'Sizing', name: 'Resize Up 22k Gold', desc: 'Base charge + fee per size added', hasExtraQty: true, extraQtyLabel: 'Sizes Added' },
  { id: 'resizeDownFlat', category: 'Sizing', name: 'Resize Down Flat', desc: 'Flat sizing down charge' },
  { id: 'stretchRing', category: 'Sizing', name: 'Stretch Ring', desc: 'Symmetrical metal stretching' },

  // Stones & Engraving
  { id: 'resetMelee', category: 'Stones & Engraving', name: 'Reset Melee Stone(s)', desc: 'Re-securing or laying melee', hasQty: true, qtyLabel: 'Stone Qty' },
  { id: 'resetCenter', category: 'Stones & Engraving', name: 'Reset Center Stone', desc: 'Laying/securing larger center', hasQty: true, qtyLabel: 'Stone Qty' },
  { id: 'prongRetip', category: 'Stones & Engraving', name: 'Prong Retip', desc: 'Adding metal tips to prongs', hasQty: true, qtyLabel: 'Prong Qty' },
  { id: 'laserEngravingSimple', category: 'Stones & Engraving', name: 'Laser Engraving (Simple)', desc: 'Standard block text engraving' },
  { id: 'laserEngravingAdvanced', category: 'Stones & Engraving', name: 'Laser Engraving (Advanced)', desc: 'Detailed script, symbols, or graphics' },

  // Plating & Polish
  { id: 'simplePolishCleanup', category: 'Plating & Polish', name: 'Simple Polish & Cleanup', desc: 'High-speed luster restoration' },
  { id: 'heavyCleanupPolish', category: 'Plating & Polish', name: 'Heavy Restorative Polish', desc: 'Deep dent/scratch removal & buffing', hasQty: true, qtyLabel: 'Aesthetic Cost ($)' },
  { id: 'replating', category: 'Plating & Polish', name: 'Replating & Metal Overlay', desc: 'Base plating charge + specific upcharges', hasOptions: true },
  { id: 'laserChainRepair', category: 'Plating & Polish', name: 'Laser Chain Solder / Repair', desc: 'Precision laser chain weld link', hasQty: true, qtyLabel: 'Welds Qty' }
];

export default function WholesaleRepairView({
  session,
  onChangeSession,
  onSaveQuote,
  onLaunchSketch,
  settings,
  spotPrices,
  scrapTransactions,
  onTriggerPrint,
  isIframe,
  embedMode = false
}: WholesaleRepairViewProps) {

  // Local active wholesale profile state
  const [profileId, setProfileId] = useState<string>(session.wholesaleProfileId || '');
  const [unlockedPriceIds, setUnlockedPriceIds] = useState<Record<string, boolean>>({});
  const [heavyPolishPrice, setHeavyPolishPrice] = useState<number>(0);
  const [selectedPlatingColors, setSelectedPlatingColors] = useState<Record<string, boolean>>({});

  // Fetch the current repair pricing object based on selected profile or master settings
  const getActiveRepairPricing = (): RepairPricingSettings => {
    let activeWholesale: any;
    if (profileId) {
      const p = (settings.wholesaleProfiles || []).find(prof => prof.id === profileId);
      if (p) activeWholesale = p.settings;
    }
    if (!activeWholesale) {
      activeWholesale = settings.wholesale;
    }
    
    // Ensure default fallback values are loaded if keys are missing
    const defaultPricing = (settings.wholesale.repairPricing || {}) as any;
    return {
      resizeUp14kThin_base: activeWholesale.repairPricing?.resizeUp14kThin_base ?? defaultPricing.resizeUp14kThin_base ?? 50,
      resizeUp14kThin_extra: activeWholesale.repairPricing?.resizeUp14kThin_extra ?? defaultPricing.resizeUp14kThin_extra ?? 70,
      resizeUp14kThick_base: activeWholesale.repairPricing?.resizeUp14kThick_base ?? defaultPricing.resizeUp14kThick_base ?? 60,
      resizeUp14kThick_extra: activeWholesale.repairPricing?.resizeUp14kThick_extra ?? defaultPricing.resizeUp14kThick_extra ?? 80,
      resizeUp18k_base: activeWholesale.repairPricing?.resizeUp18k_base ?? defaultPricing.resizeUp18k_base ?? 80,
      resizeUp18k_extra: activeWholesale.repairPricing?.resizeUp18k_extra ?? defaultPricing.resizeUp18k_extra ?? 100,
      resizeUp22k_base: activeWholesale.repairPricing?.resizeUp22k_base ?? defaultPricing.resizeUp22k_base ?? 100,
      resizeUp22k_extra: activeWholesale.repairPricing?.resizeUp22k_extra ?? defaultPricing.resizeUp22k_extra ?? 120,
      resizeDownFlat: activeWholesale.repairPricing?.resizeDownFlat ?? defaultPricing.resizeDownFlat ?? 40,
      stretchRing: activeWholesale.repairPricing?.stretchRing ?? defaultPricing.stretchRing ?? 25,
      resetMelee: activeWholesale.repairPricing?.resetMelee ?? defaultPricing.resetMelee ?? 5,
      resetCenter: activeWholesale.repairPricing?.resetCenter ?? defaultPricing.resetCenter ?? 35,
      laserEngravingSimple: activeWholesale.repairPricing?.laserEngravingSimple ?? defaultPricing.laserEngravingSimple ?? 30,
      laserEngravingAdvanced: activeWholesale.repairPricing?.laserEngravingAdvanced ?? defaultPricing.laserEngravingAdvanced ?? 40,
      prongRetip: activeWholesale.repairPricing?.prongRetip ?? defaultPricing.prongRetip ?? 30,
      replatingBase: activeWholesale.repairPricing?.replatingBase ?? defaultPricing.replatingBase ?? 50,
      replatingOptionRhodium: activeWholesale.repairPricing?.replatingOptionRhodium ?? defaultPricing.replatingOptionRhodium ?? 0,
      replatingOption14kYellow: activeWholesale.repairPricing?.replatingOption14kYellow ?? defaultPricing.replatingOption14kYellow ?? 0,
      replatingOption24k: activeWholesale.repairPricing?.replatingOption24k ?? defaultPricing.replatingOption24k ?? 0,
      replatingOptionBlackRuthenium: activeWholesale.repairPricing?.replatingOptionBlackRuthenium ?? defaultPricing.replatingOptionBlackRuthenium ?? 0,
      replatingOptionNickel: activeWholesale.repairPricing?.replatingOptionNickel ?? defaultPricing.replatingOptionNickel ?? 0,
      replatingOptionRose: activeWholesale.repairPricing?.replatingOptionRose ?? defaultPricing.replatingOptionRose ?? 0,
      laserChainRepair: activeWholesale.repairPricing?.laserChainRepair ?? defaultPricing.laserChainRepair ?? 20,
      simplePolishCleanup: activeWholesale.repairPricing?.simplePolishCleanup ?? defaultPricing.simplePolishCleanup ?? 20,
      heavyCleanupPolishMin: activeWholesale.repairPricing?.heavyCleanupPolishMin ?? defaultPricing.heavyCleanupPolishMin ?? 50,
      heavyCleanupPolishMax: activeWholesale.repairPricing?.heavyCleanupPolishMax ?? defaultPricing.heavyCleanupPolishMax ?? 150,
    };
  };

  const repairPricing = getActiveRepairPricing();

  // Initialize the session with a single "repair" category item if empty or wrong category
  useEffect(() => {
    if (embedMode) return;
    const activeItem = session.rings[0];
    if (!activeItem || activeItem.category !== 'repair') {
      const emptyRepairItem: JewelryItem = {
        id: genId(),
        category: 'repair',
        stoneSource: 'our',
        custCenterCt: '',
        custMeleeCount: '',
        material: 'gold',
        metalColor: 'Yellow',
        goldKarat: 14,
        fancy: [],
        melee: [],
        clientStones: [],
        centerStones: [],
        addons: [],
        showEngraving: false,
        engravingText: '',
        engravingFont: "'Times New Roman', Times, serif",
        designNotes: [],
        discount: '',
        discountType: '$',
        applyDesignFee: false,
        goldGrams: '',
        referenceSketches: [],
        referencePhotos: [],
        repairs: [],
        repairNotes: ''
      };
      
      onChangeSession(prev => ({
        ...prev,
        rings: [emptyRepairItem],
        activeSubTab: emptyRepairItem.id
      }));
    }
  }, [session, onChangeSession, embedMode]);

  const activeItem = (session.rings.find(r => r.id === session.activeSubTab) || session.rings[0] || {
    id: '',
    category: 'repair',
    stoneSource: 'our',
    custCenterCt: '',
    custMeleeCount: '',
    material: 'gold',
    metalColor: 'Yellow',
    goldKarat: 14,
    fancy: [],
    melee: [],
    clientStones: [],
    centerStones: [],
    addons: [],
    showEngraving: false,
    engravingText: '',
    engravingFont: "'Times New Roman', Times, serif",
    designNotes: [],
    discount: '',
    discountType: '$',
    applyDesignFee: false,
    goldGrams: '',
    referenceSketches: [],
    referencePhotos: [],
    repairs: [],
    repairNotes: ''
  }) as JewelryItem;

  const currentRepairs = activeItem.repairs || [];
  const currentAddons = activeItem.addons || [];

  // Helper to sync changes back to AppState
  const updateItemFields = (fields: Partial<JewelryItem>) => {
    onChangeSession(prev => {
      const updatedRings = prev.rings.map(r => {
        const isTarget = embedMode ? r.id === prev.activeSubTab : r.id === (prev.rings[0]?.id || '');
        if (isTarget) {
          return { ...r, ...fields };
        }
        return r;
      });
      return { ...prev, rings: updatedRings };
    });
  };

  // Synchronize state when the wholesale profile changes
  const handleProfileChange = (pId: string) => {
    playClickSound('tab');
    setProfileId(pId);
    onChangeSession(prev => ({
      ...prev,
      wholesaleProfileId: pId
    }));
  };

  // Standard repair list pricing formulas
  const calculateStandardPriceForOp = (opId: string, currentQty: number, currentExtraQty: number, activePlating: Record<string, boolean>, heavyVal: number): number => {
    switch (opId) {
      case 'resizeUp14kThin':
        return repairPricing.resizeUp14kThin_base + (Math.max(0, currentExtraQty) * repairPricing.resizeUp14kThin_extra);
      case 'resizeUp14kThick':
        return repairPricing.resizeUp14kThick_base + (Math.max(0, currentExtraQty) * repairPricing.resizeUp14kThick_extra);
      case 'resizeUp18k':
        return repairPricing.resizeUp18k_base + (Math.max(0, currentExtraQty) * repairPricing.resizeUp18k_extra);
      case 'resizeUp22k':
        return repairPricing.resizeUp22k_base + (Math.max(0, currentExtraQty) * repairPricing.resizeUp22k_extra);
      case 'resizeDownFlat':
        return repairPricing.resizeDownFlat;
      case 'stretchRing':
        return repairPricing.stretchRing;
      case 'resetMelee':
        return currentQty * repairPricing.resetMelee;
      case 'resetCenter':
        return currentQty * repairPricing.resetCenter;
      case 'prongRetip':
        return currentQty * repairPricing.prongRetip;
      case 'laserEngravingSimple':
        return repairPricing.laserEngravingSimple;
      case 'laserEngravingAdvanced':
        return repairPricing.laserEngravingAdvanced;
      case 'simplePolishCleanup':
        return repairPricing.simplePolishCleanup;
      case 'heavyCleanupPolish':
        return heavyVal || repairPricing.heavyCleanupPolishMin;
      case 'replating':
        let replatingCost = repairPricing.replatingBase;
        if (activePlating.Rhodium) replatingCost += repairPricing.replatingOptionRhodium;
        if (activePlating.Yellow14k) replatingCost += repairPricing.replatingOption14kYellow;
        if (activePlating.Gold24k) replatingCost += repairPricing.replatingOption24k;
        if (activePlating.BlackRuthenium) replatingCost += repairPricing.replatingOptionBlackRuthenium;
        if (activePlating.Nickel) replatingCost += repairPricing.replatingOptionNickel;
        if (activePlating.Rose) replatingCost += repairPricing.replatingOptionRose;
        return replatingCost;
      case 'laserChainRepair':
        return currentQty * repairPricing.laserChainRepair;
      default:
        return 0;
    }
  };

  // Toggle/check a repair task
  const handleToggleRepair = (config: RepairConfig, checked: boolean) => {
    playClickSound('click');
    if (checked) {
      // Find default quantities
      const defaultQty = config.hasQty ? 1 : 0;
      const defaultExtraQty = config.hasExtraQty ? 1 : 0;
      
      let optionStr = '';
      if (config.id === 'replating') {
        optionStr = 'Rhodium';
        setSelectedPlatingColors({ Rhodium: true });
      }

      const initialHeavyVal = config.id === 'heavyCleanupPolish' ? repairPricing.heavyCleanupPolishMin : 0;
      if (config.id === 'heavyCleanupPolish') {
        setHeavyPolishPrice(repairPricing.heavyCleanupPolishMin);
      }

      const computedPrice = calculateStandardPriceForOp(
        config.id, 
        defaultQty, 
        defaultExtraQty, 
        config.id === 'replating' ? { Rhodium: true } : {}, 
        initialHeavyVal
      );

      const newSelection: RepairSelection = {
        id: config.id,
        type: config.category,
        name: config.name,
        qty: defaultQty,
        extraQty: defaultExtraQty,
        option: optionStr,
        price: computedPrice
      };

      updateItemFields({
        repairs: [...currentRepairs, newSelection]
      });
    } else {
      // Remove operation
      updateItemFields({
        repairs: currentRepairs.filter(r => r.id !== config.id)
      });
      // Reset lock override
      setUnlockedPriceIds(prev => {
        const c = { ...prev };
        delete c[config.id];
        return c;
      });
    }
  };

  // Handle updates to fields within an active repair task (like qty, extra size increments, overrides)
  const handleUpdateRepairField = (opId: string, updates: Partial<RepairSelection>) => {
    const updatedRepairs = currentRepairs.map(rep => {
      if (rep.id === opId) {
        const merged = { ...rep, ...updates };
        
        // Re-calculate pricing
        if (updates.customPrice !== undefined) {
          merged.price = updates.customPrice;
        } else if (!unlockedPriceIds[opId]) {
          // Calculate standard calculated price
          const activePlatingColors = opId === 'replating' ? selectedPlatingColors : {};
          const activeHeavyPrice = opId === 'heavyCleanupPolish' ? (updates.qty ?? rep.qty) : 0;
          
          merged.price = calculateStandardPriceForOp(
            opId,
            merged.qty,
            merged.extraQty || 0,
            activePlatingColors,
            activeHeavyPrice
          );
        }
        return merged;
      }
      return rep;
    });

    updateItemFields({ repairs: updatedRepairs });
  };

  // Custom replating options toggle
  const handleTogglePlatingOption = (color: string, checked: boolean) => {
    playClickSound('click');
    const updatedColors = { ...selectedPlatingColors, [color]: checked };
    setSelectedPlatingColors(updatedColors);

    // Sync back to currentRepairs replating item
    const replatingRep = currentRepairs.find(r => r.id === 'replating');
    if (replatingRep) {
      const selectedOptions = Object.keys(updatedColors).filter(k => updatedColors[k]).join(', ');
      const computedPrice = calculateStandardPriceForOp(
        'replating',
        replatingRep.qty,
        replatingRep.extraQty || 0,
        updatedColors,
        0
      );

      handleUpdateRepairField('replating', {
        option: selectedOptions,
        price: unlockedPriceIds['replating'] ? (replatingRep.customPrice ?? computedPrice) : computedPrice
      });
    }
  };

  // Custom heavy polish price slider/input change
  const handleHeavyPolishValueChange = (val: number) => {
    setHeavyPolishPrice(val);
    const heavyRep = currentRepairs.find(r => r.id === 'heavyCleanupPolish');
    if (heavyRep) {
      handleUpdateRepairField('heavyCleanupPolish', {
        qty: val, // use qty slot to store heavy value
        price: unlockedPriceIds['heavyCleanupPolish'] ? (heavyRep.customPrice ?? val) : val
      });
    }
  };

  // Toggle Price Override Lock
  const handleTogglePriceOverrideLock = (opId: string) => {
    playClickSound('click');
    const isUnlocked = unlockedPriceIds[opId];
    const targetRep = currentRepairs.find(r => r.id === opId);
    if (!targetRep) return;

    if (isUnlocked) {
      // Re-locking: recompute standard price and scrap custom price
      const activePlatingColors = opId === 'replating' ? selectedPlatingColors : {};
      const activeHeavyPrice = opId === 'heavyCleanupPolish' ? targetRep.qty : 0;
      const stdPrice = calculateStandardPriceForOp(opId, targetRep.qty, targetRep.extraQty || 0, activePlatingColors, activeHeavyPrice);
      
      setUnlockedPriceIds(prev => ({ ...prev, [opId]: false }));
      handleUpdateRepairField(opId, { customPrice: undefined, price: stdPrice });
    } else {
      // Unlocking: allow user to customize
      setUnlockedPriceIds(prev => ({ ...prev, [opId]: true }));
      handleUpdateRepairField(opId, { customPrice: targetRep.price });
    }
  };

  // Custom addon operations
  const handleAddCustomAddon = () => {
    playClickSound('click');
    const newAddon: AddonItem = {
      desc: '',
      fee: ''
    };
    updateItemFields({
      addons: [...currentAddons, newAddon]
    });
  };

  const handleUpdateAddon = (index: number, fields: Partial<AddonItem>) => {
    const updated = currentAddons.map((add, idx) => {
      if (idx === index) {
        return { ...add, ...fields };
      }
      return add;
    });
    updateItemFields({ addons: updated });
  };

  const handleRemoveAddon = (index: number) => {
    playClickSound('delete');
    const updated = currentAddons.filter((_, idx) => idx !== index);
    updateItemFields({ addons: updated });
  };

  // Total invoice cost calculations
  const subtotalRepairs = currentRepairs.reduce((acc, r) => acc + (Number(r.price) || 0), 0);
  const subtotalAddons = currentAddons.reduce((acc, a) => acc + (Number(a.fee) || 0), 0);
  const subtotalTotal = subtotalRepairs + subtotalAddons;

  const discountVal = parseFloat(activeItem.discount || '0') || 0;
  const computedDiscount = activeItem.discountType === '%' ? subtotalTotal * (discountVal / 100) : discountVal;
  
  const postDiscountSubtotal = Math.max(0, subtotalTotal - computedDiscount);
  const scrapCredit = Number(session.scrapCredit) || 0;
  const netBeforeTax = Math.max(0, postDiscountSubtotal - scrapCredit);
  const taxAmount = session.applyTax ? netBeforeTax * 0.12 : 0; // 12% standard CAD retail/wholesale taxes
  const grandTotal = netBeforeTax + taxAmount;

  // Print friendly triggered invoice trigger
  const handlePrintQuoteInvoice = () => {
    playClickSound('click');
    onTriggerPrint(() => printElement('wholesale-repair-invoice-print'));
  };

  // Saving the repair order to wholesale ledger
  const handleSaveToLedger = () => {
    if (!session.cName.trim()) {
      alert("Please provide a Wholesale Client or Store Name before saving.");
      return;
    }

    playClickSound('click');
    onSaveQuote();
  };

  // Clean / Reset state
  const handleClearRepairSheet = () => {
    if (!window.confirm("Are you sure you want to completely clear this wholesale repair sheet?")) return;
    playClickSound('clear');
    onChangeSession(prev => ({
      ...prev,
      cName: '',
      cPhone: '',
      cEmail: '',
      jobNum: '',
      jobDesc: '',
      applyTax: false,
      notes: '',
      scrapCredit: 0,
      signatureImg: null,
      rings: [
        {
          id: genId(),
          category: 'repair',
          stoneSource: 'our',
          custCenterCt: '',
          custMeleeCount: '',
          material: 'gold',
          metalColor: 'Yellow',
          goldKarat: 14,
          fancy: [],
          melee: [],
          clientStones: [],
          centerStones: [],
          addons: [],
          showEngraving: false,
          engravingText: '',
          engravingFont: "'Times New Roman', Times, serif",
          designNotes: [],
          discount: '',
          discountType: '$',
          applyDesignFee: false,
          goldGrams: '',
          referenceSketches: [],
          referencePhotos: [],
          repairs: [],
          repairNotes: ''
        }
      ]
    }));
    setUnlockedPriceIds({});
    setSelectedPlatingColors({});
    setHeavyPolishPrice(0);
  };

  // Mock Camera Upload snapshot generator
  const handleAddMockPhoto = () => {
    playClickSound('click');
    const mockPhotos = [
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    ];
    const chosen = mockPhotos[Math.floor(Math.random() * mockPhotos.length)];
    
    // Add reference photo
    const existingPhotos = Array.isArray(activeItem.referencePhotos) ? [...activeItem.referencePhotos] : [];
    updateItemFields({
      referencePhotos: [...existingPhotos, chosen]
    });
  };

  // Group REPAIR_OPERATIONS by Category for cleaner bento card display
  const groupSizing = REPAIR_OPERATIONS.filter(o => o.category === 'Sizing');
  const groupStones = REPAIR_OPERATIONS.filter(o => o.category === 'Stones & Engraving');
  const groupPlating = REPAIR_OPERATIONS.filter(o => o.category === 'Plating & Polish');

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: HEADER & CLIENT INFO */}
      {!embedMode && (
        <div className="bg-white p-5 rounded-3xl border border-brand-150 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-brand-50 pb-3">
            <div>
              <h2 className="font-serif text-lg font-black italic text-brand-900 flex items-center gap-2">
                <Sparkles className="text-brand-gold animate-pulse shrink-0" size={18} />
                Wholesale Repair & Job Sheet
              </h2>
              <p className="text-[10px] text-brand-400 font-bold uppercase tracking-widest mt-0.5 font-mono">Bespoke Jewelry Restoration & Sizing Workspace</p>
            </div>

            {/* Wholesale Profiles dropdown */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[9px] font-black text-brand-500 uppercase tracking-wider font-mono">Client Profile:</span>
              <select
                className="bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-xl text-xs font-black outline-none w-full sm:w-56 cursor-pointer text-brand-800"
                value={profileId}
                onChange={(e) => handleProfileChange(e.target.value)}
              >
                <option value="">Default Wholesale Pricing</option>
                {(settings.wholesaleProfiles || []).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Client Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[9px] font-black text-brand-500 uppercase tracking-wider font-mono block mb-1">Wholesale Client / Store Name</label>
              <input
                type="text"
                placeholder="e.g. Burnaby Fine Jewellers"
                className="w-full bg-brand-50/40 border border-brand-200 px-3 py-2.5 rounded-xl text-xs font-bold focus:bg-white transition-all outline-none"
                value={session.cName}
                onChange={(e) => onChangeSession(prev => ({ ...prev, cName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-brand-500 uppercase tracking-wider font-mono block mb-1">Client Contact Phone</label>
              <input
                type="text"
                placeholder="e.g. (604) 555-0199"
                className="w-full bg-brand-50/40 border border-brand-200 px-3 py-2.5 rounded-xl text-xs font-bold focus:bg-white transition-all outline-none"
                value={session.cPhone}
                onChange={(e) => onChangeSession(prev => ({ ...prev, cPhone: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-brand-500 uppercase tracking-wider font-mono block mb-1">Client Email Address</label>
              <input
                type="email"
                placeholder="e.g. repairs@burnabyjewellers.ca"
                className="w-full bg-brand-50/40 border border-brand-200 px-3 py-2.5 rounded-xl text-xs font-bold focus:bg-white transition-all outline-none"
                value={session.cEmail}
                onChange={(e) => onChangeSession(prev => ({ ...prev, cEmail: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-black text-brand-500 uppercase tracking-wider font-mono block mb-1">Repair Job #</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="AUTO"
                    className="w-full bg-brand-50/40 border border-brand-200 pl-3 pr-1 py-2.5 rounded-xl text-xs font-mono font-bold outline-none"
                    value={session.jobNum}
                    onChange={(e) => onChangeSession(prev => ({ ...prev, jobNum: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-brand-500 uppercase tracking-wider font-mono block mb-1">Promised Date</label>
                <input
                  type="date"
                  className="w-full bg-brand-50/40 border border-brand-200 px-2 py-2.5 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  value={session.jobDesc} // overloading jobDesc to store promise date for repair compliance
                  onChange={(e) => onChangeSession(prev => ({ ...prev, jobDesc: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: CHECK-LIST OF STANDARD REPAIR OPERATIONS (BENTO GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* CARD 1: SIZING SERVICES */}
        <div className="bg-white p-5 rounded-3xl border border-brand-100 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-brand-50 pb-2">
              <div className="w-1.5 h-3 rounded-full bg-brand-gold animate-pulse" />
              <h3 className="text-xs font-black text-brand-900 uppercase tracking-widest font-mono">1. Sizing Operations</h3>
            </div>
            
            <div className="mt-3 space-y-2.5">
              {groupSizing.map(op => {
                const rep = currentRepairs.find(r => r.id === op.id);
                const isSelected = !!rep;
                return (
                  <div key={op.id} className={`p-3 rounded-2xl border transition-all ${isSelected ? 'bg-brand-50/45 border-brand-300' : 'bg-brand-50/10 border-brand-100 hover:border-brand-150'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded text-brand-gold focus:ring-brand-gold h-4 w-4 border-brand-200 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => handleToggleRepair(op, e.target.checked)}
                        />
                        <div className="leading-tight">
                          <span className="text-[11px] font-bold text-brand-800 block">{op.name}</span>
                          <span className="text-[8px] text-brand-400">{op.desc}</span>
                        </div>
                      </label>
                    </div>

                    {isSelected && op.hasExtraQty && (
                      <div className="mt-2 pt-2 border-t border-brand-100/50 flex items-center justify-between gap-3">
                        <span className="text-[9px] font-black text-brand-600 uppercase tracking-wider font-mono">{op.extraQtyLabel}:</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.5"
                            className="bg-white border border-brand-200 text-center text-xs font-bold rounded-lg w-16 py-1 no-spinner"
                            value={rep?.extraQty || 0}
                            onChange={(e) => handleUpdateRepairField(op.id, { extraQty: parseFloat(e.target.value) || 0 })}
                          />
                          <span className="text-[9px] text-brand-400 font-bold uppercase font-mono">sizes</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CARD 2: STONES & ENGRAVING */}
        <div className="bg-white p-5 rounded-3xl border border-brand-100 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-brand-50 pb-2">
              <div className="w-1.5 h-3 rounded-full bg-brand-gold animate-pulse" />
              <h3 className="text-xs font-black text-brand-900 uppercase tracking-widest font-mono">2. Stones & Engraving</h3>
            </div>

            <div className="mt-3 space-y-2.5">
              {groupStones.map(op => {
                const rep = currentRepairs.find(r => r.id === op.id);
                const isSelected = !!rep;
                return (
                  <div key={op.id} className={`p-3 rounded-2xl border transition-all ${isSelected ? 'bg-brand-50/45 border-brand-300' : 'bg-brand-50/10 border-brand-100 hover:border-brand-150'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded text-brand-gold focus:ring-brand-gold h-4 w-4 border-brand-200 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => handleToggleRepair(op, e.target.checked)}
                        />
                        <div className="leading-tight">
                          <span className="text-[11px] font-bold text-brand-800 block">{op.name}</span>
                          <span className="text-[8px] text-brand-400">{op.desc}</span>
                        </div>
                      </label>
                    </div>

                    {isSelected && op.hasQty && (
                      <div className="mt-2 pt-2 border-t border-brand-100/50 flex items-center justify-between gap-3">
                        <span className="text-[9px] font-black text-brand-600 uppercase tracking-wider font-mono">{op.qtyLabel}:</span>
                        <input
                          type="number"
                          className="bg-white border border-brand-200 text-center text-xs font-bold rounded-lg w-16 py-1 no-spinner"
                          value={rep?.qty || 0}
                          onChange={(e) => handleUpdateRepairField(op.id, { qty: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CARD 3: PLATING & POLISH */}
        <div className="bg-white p-5 rounded-3xl border border-brand-100 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-brand-50 pb-2">
              <div className="w-1.5 h-3 rounded-full bg-brand-gold animate-pulse" />
              <h3 className="text-xs font-black text-brand-900 uppercase tracking-widest font-mono">3. Plating, Solder & Polish</h3>
            </div>

            <div className="mt-3 space-y-2.5">
              {groupPlating.map(op => {
                const rep = currentRepairs.find(r => r.id === op.id);
                const isSelected = !!rep;
                return (
                  <div key={op.id} className={`p-3 rounded-2xl border transition-all ${isSelected ? 'bg-brand-50/45 border-brand-300' : 'bg-brand-50/10 border-brand-100 hover:border-brand-150'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded text-brand-gold focus:ring-brand-gold h-4 w-4 border-brand-200 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => handleToggleRepair(op, e.target.checked)}
                        />
                        <div className="leading-tight">
                          <span className="text-[11px] font-bold text-brand-800 block">{op.name}</span>
                          <span className="text-[8px] text-brand-400">{op.desc}</span>
                        </div>
                      </label>
                    </div>

                    {isSelected && op.id === 'replating' && (
                      <div className="mt-2.5 pt-2.5 border-t border-brand-100 space-y-1.5 text-left font-sans">
                        <span className="text-[8px] font-black text-brand-500 uppercase tracking-wider block">Metal plating selections:</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { key: 'Rhodium', label: 'Rhodium' },
                            { key: 'Yellow14k', label: '14k Yellow' },
                            { key: 'Gold24k', label: '24k Gold' },
                            { key: 'BlackRuthenium', label: 'Black Ruth.' },
                            { key: 'Nickel', label: 'Nickel' },
                            { key: 'Rose', label: 'Rose Gold' }
                          ].map(color => (
                            <label key={color.key} className="flex items-center gap-1.5 cursor-pointer text-[9px] font-semibold text-brand-700 select-none">
                              <input
                                type="checkbox"
                                className="rounded text-brand-gold focus:ring-brand-gold h-3.5 w-3.5 border-brand-200 cursor-pointer"
                                checked={!!selectedPlatingColors[color.key]}
                                onChange={(e) => handleTogglePlatingOption(color.key, e.target.checked)}
                              />
                              {color.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {isSelected && op.id === 'heavyCleanupPolish' && (
                      <div className="mt-2 pt-2 border-t border-brand-100/50 space-y-1.5">
                        <div className="flex justify-between items-center text-[9px] font-black text-brand-500 uppercase tracking-wider font-mono">
                          <span>Set Aesthetic Fee:</span>
                          <span className="text-brand-900 font-bold">${heavyPolishPrice} CAD</span>
                        </div>
                        <input
                          type="range"
                          min={repairPricing.heavyCleanupPolishMin}
                          max={repairPricing.heavyCleanupPolishMax}
                          step="5"
                          className="w-full accent-brand-gold cursor-pointer"
                          value={heavyPolishPrice}
                          onChange={(e) => handleHeavyPolishValueChange(parseInt(e.target.value) || 0)}
                        />
                        <div className="flex justify-between text-[8px] text-brand-400 font-bold font-mono">
                          <span>Min: ${repairPricing.heavyCleanupPolishMin}</span>
                          <span>Max: ${repairPricing.heavyCleanupPolishMax}</span>
                        </div>
                      </div>
                    )}

                    {isSelected && op.hasQty && op.id !== 'heavyCleanupPolish' && (
                      <div className="mt-2 pt-2 border-t border-brand-100/50 flex items-center justify-between gap-3">
                        <span className="text-[9px] font-black text-brand-600 uppercase tracking-wider font-mono">{op.qtyLabel}:</span>
                        <input
                          type="number"
                          className="bg-white border border-brand-200 text-center text-xs font-bold rounded-lg w-16 py-1 no-spinner"
                          value={rep?.qty || 0}
                          onChange={(e) => handleUpdateRepairField(op.id, { qty: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 3: ADDONS TABLE, SKETCHES & NOTES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: ACTIVE SUMMARY & OVERRIDES & ADDONS TABLE (8 cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-3xl border border-brand-100 shadow-sm space-y-5">
          <div className="border-b border-brand-50 pb-2">
            <h3 className="text-xs font-black text-brand-900 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Coins size={13} className="text-brand-gold animate-bounce" />
              Active Repair Job Breakdown & Price Adjustment
            </h3>
          </div>

          {currentRepairs.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-brand-100 rounded-3xl text-center bg-brand-50/5">
              <AlertCircle size={32} className="text-brand-300 mx-auto mb-2 animate-pulse" />
              <p className="text-xs text-brand-400 font-bold uppercase tracking-wider">No standard repair operations checked yet</p>
              <p className="text-[10px] text-brand-400 mt-1">Check boxes in the cards above to assemble your repair job sheet</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-brand-100 shadow-inner bg-slate-50/45">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="bg-brand-900 text-white font-mono uppercase tracking-wider text-[9px] border-b border-brand-900">
                    <th className="p-3">Operation Task</th>
                    <th className="p-3 text-center">Parameters</th>
                    <th className="p-3 text-right">Standard Fee</th>
                    <th className="p-3 text-center">Override</th>
                    <th className="p-3 text-right">Line Total</th>
                    <th className="p-3 text-center print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100">
                  {currentRepairs.map((rep) => {
                    const isOverridden = unlockedPriceIds[rep.id];
                    return (
                      <tr key={rep.id} className="hover:bg-brand-50/30 transition-colors">
                        <td className="p-3 font-semibold text-brand-800">
                          {rep.name}
                          {rep.option && <span className="block text-[8px] font-mono text-brand-500 font-normal mt-0.5">Option: {rep.option}</span>}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-brand-600">
                          {rep.id.startsWith('resizeUp') ? (
                            <span>+{rep.extraQty || 0} sz</span>
                          ) : rep.qty > 0 ? (
                            <span>{rep.qty}x</span>
                          ) : (
                            <span className="text-[10px] font-bold text-brand-400 uppercase">Flat</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-medium text-brand-500">
                          {isOverridden ? (
                            <span className="line-through text-brand-300">${calculateStandardPriceForOp(rep.id, rep.qty, rep.extraQty || 0, rep.id === 'replating' ? selectedPlatingColors : {}, rep.id === 'heavyCleanupPolish' ? rep.qty : 0).toFixed(2)}</span>
                          ) : (
                            <span>${rep.price.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePriceOverrideLock(rep.id)}
                            className={`p-1.5 rounded-lg border transition-all inline-flex items-center justify-center cursor-pointer ${isOverridden ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'}`}
                            title={isOverridden ? "Lock standard pricing (Reset manual override)" : "Unlock custom manual price override input"}
                          >
                            {isOverridden ? <Unlock size={12} className="animate-wiggle" /> : <Lock size={12} />}
                          </button>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-brand-900">
                          {isOverridden ? (
                            <div className="relative inline-block w-20">
                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-amber-500 font-black">$</span>
                              <input
                                type="number"
                                className="w-full bg-amber-50 border border-amber-200 text-right pl-3.5 pr-1 py-0.5 rounded text-xs font-black font-mono text-amber-700 outline-none"
                                value={rep.customPrice ?? rep.price}
                                onChange={(e) => handleUpdateRepairField(rep.id, { customPrice: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                          ) : (
                            <span>${rep.price.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-3 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => handleToggleRepair(REPAIR_OPERATIONS.find(o => o.id === rep.id)!, false)}
                            className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* CUSTOM BENCH ADDONS SECTION */}
          <div className="pt-3 border-t border-brand-100">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-[10px] font-black text-brand-700 uppercase tracking-wider font-mono flex items-center gap-1">
                <Plus size={12} className="text-brand-gold animate-bounce" />
                Custom Bench & Component Charges
              </h4>
              <button
                type="button"
                onClick={handleAddCustomAddon}
                className="bg-brand-900 hover:bg-brand-850 text-brand-gold border border-brand-850 font-black px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm cursor-pointer"
              >
                <Plus size={11} /> Add Bench Charge
              </button>
            </div>

            {currentAddons.length === 0 ? (
              <p className="text-[10px] text-brand-400 italic">No custom component charges added. Click button to add raw materials, finding parts, or custom welding hours.</p>
            ) : (
              <div className="space-y-2">
                {currentAddons.map((add, index) => (
                  <div key={index} className="flex gap-2.5 items-center bg-slate-50 p-2.5 rounded-2xl border border-brand-100 animate-fadeIn">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="e.g. Supply & solder heavy duty lobster clasp finding"
                        className="w-full bg-white border border-brand-200 px-3 py-1.5 rounded-xl text-xs font-bold outline-none font-sans"
                        value={add.desc}
                        onChange={(e) => handleUpdateAddon(index, { desc: e.target.value })}
                      />
                    </div>
                    <div className="relative w-28 shrink-0">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-400">$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-full bg-white border border-brand-200 text-right pl-6 pr-2.5 py-1.5 rounded-xl text-xs font-mono font-bold outline-none"
                        value={add.fee}
                        onChange={(e) => handleUpdateAddon(index, { fee: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAddon(index)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: MEDIA, NOTES & SKETCHES GALLERY (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-brand-100 shadow-sm space-y-4">
          
          {/* SKETCHES GALLERY */}
          <div>
            <div className="flex justify-between items-center border-b border-brand-50 pb-1.5 mb-2.5">
              <h4 className="text-[10px] font-black text-brand-800 uppercase tracking-wider font-mono flex items-center gap-1">
                <PenTool size={11} className="text-brand-gold" />
                Job Sketches
              </h4>
              <button
                type="button"
                onClick={() => { playClickSound('click'); onLaunchSketch('sketch'); }}
                className="text-[9px] text-brand-gold hover:text-brand-900 font-bold underline font-sans cursor-pointer"
              >
                + Draw Sketch
              </button>
            </div>

            {(!activeItem.referenceSketches || activeItem.referenceSketches.length === 0) ? (
              <div 
                onClick={() => { playClickSound('click'); onLaunchSketch('sketch'); }}
                className="p-6 border border-dashed border-brand-100 rounded-2xl text-center bg-brand-50/5 hover:bg-brand-50/15 transition-all cursor-pointer group"
              >
                <PenTool size={18} className="text-brand-300 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] text-brand-400 font-bold uppercase tracking-wider">Draw Bench Sketch</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                {(activeItem.referenceSketches || []).map((sk, sIdx) => (
                  <div key={sIdx} className="relative aspect-square bg-slate-50 rounded-xl border border-brand-150 overflow-hidden group shadow-inner">
                    <img src={sk} alt={`Sketch ${sIdx+1}`} className="w-full h-full object-contain pointer-events-none" />
                    <div className="absolute inset-0 bg-brand-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => { playClickSound('click'); onLaunchSketch('sketch', sIdx); }}
                        className="bg-white p-1 rounded hover:bg-brand-50 cursor-pointer text-brand-800"
                        title="Edit sketch"
                      >
                        <Edit2 size={10} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound('delete');
                          const updated = (activeItem.referenceSketches || []).filter((_, idx) => idx !== sIdx);
                          updateItemFields({ referenceSketches: updated });
                        }}
                        className="bg-white p-1 rounded hover:bg-red-50 text-red-600 cursor-pointer"
                        title="Delete sketch"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PHOTOS GALLERY */}
          <div>
            <div className="flex justify-between items-center border-b border-brand-50 pb-1.5 mb-2.5">
              <h4 className="text-[10px] font-black text-brand-800 uppercase tracking-wider font-mono flex items-center gap-1">
                <Camera size={11} className="text-brand-gold" />
                Intake Photos
              </h4>
              <button
                type="button"
                onClick={handleAddMockPhoto}
                className="text-[9px] text-brand-gold hover:text-brand-900 font-bold underline font-sans cursor-pointer"
              >
                + Snap Photo
              </button>
            </div>

            {(!activeItem.referencePhotos || activeItem.referencePhotos.length === 0) ? (
              <div 
                onClick={handleAddMockPhoto}
                className="p-6 border border-dashed border-brand-100 rounded-2xl text-center bg-brand-50/5 hover:bg-brand-50/15 transition-all cursor-pointer group"
              >
                <Camera size={18} className="text-brand-300 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] text-brand-400 font-bold uppercase tracking-wider">Snap Intake Photo</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                {(activeItem.referencePhotos || []).map((ph, pIdx) => (
                  <div key={pIdx} className="relative aspect-square bg-slate-50 rounded-xl border border-brand-150 overflow-hidden group shadow-inner">
                    <img src={ph} alt={`Intake ${pIdx+1}`} className="w-full h-full object-cover pointer-events-none" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound('delete');
                        const updated = (activeItem.referencePhotos || []).filter((_, idx) => idx !== pIdx);
                        updateItemFields({ referencePhotos: updated });
                      }}
                      className="absolute top-1 right-1 bg-white/90 p-1 rounded-md text-red-500 hover:text-red-700 hover:bg-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BENCH HAND-NOTES */}
          <div>
            <h4 className="text-[10px] font-black text-brand-800 uppercase tracking-wider font-mono flex items-center gap-1 border-b border-brand-50 pb-1.5 mb-2">
              <FileText size={11} className="text-brand-gold" />
              Special Bench Instructions
            </h4>
            <textarea
              rows={4}
              placeholder="e.g. Laser weld under-gallery first, ensure setting is clean. Thin micro-pave claws require delicate rhodium coating."
              className="w-full bg-brand-50/20 border border-brand-200 p-3 rounded-2xl text-xs font-medium focus:bg-white transition-all outline-none leading-relaxed"
              value={activeItem.repairNotes || ''}
              onChange={(e) => updateItemFields({ repairNotes: e.target.value })}
            />
          </div>
        </div>

      </div>

      {/* SECTION 4: BILLING ESTIMATES & SIGNATURE CONTROL BAR */}
      <div className="bg-white p-5 rounded-3xl border border-brand-150 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* INVOICE BILLING BREAKDOWN (7 cols) */}
        <div className="md:col-span-7 grid grid-cols-2 gap-x-4 gap-y-3 font-sans border-b md:border-b-0 md:border-r border-brand-100 pb-5 md:pb-0 md:pr-6">
          <div className="flex justify-between items-center text-xs text-brand-500">
            <span>Repairs Operations Subtotal:</span>
            <span className="font-mono font-bold text-brand-800">${subtotalRepairs.toFixed(2)}</span>
          </div>

          {/* Custom Discount Field */}
          <div className="flex items-center justify-between text-xs text-brand-500 gap-1.5">
            <span>Special Profile Discount:</span>
            <div className="flex items-center gap-1 border border-brand-150 rounded-lg p-0.5 bg-slate-50">
              <input
                type="number"
                placeholder="0"
                className="w-10 text-right font-mono font-bold bg-transparent border-none text-xs p-0.5 focus:outline-none no-spinner"
                value={activeItem.discount || ''}
                onChange={(e) => updateItemFields({ discount: e.target.value })}
              />
              <select
                className="bg-transparent border-none font-bold text-[10px] py-0 outline-none cursor-pointer"
                value={activeItem.discountType || '$'}
                onChange={(e) => updateItemFields({ discountType: e.target.value as '%' | '$' })}
              >
                <option value="$">$</option>
                <option value="%">%</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-brand-500">
            <span>Custom Component Charges:</span>
            <span className="font-mono font-bold text-brand-800">${subtotalAddons.toFixed(2)}</span>
          </div>

          {/* Scrap credit trade-in deduction input */}
          <div className="flex justify-between items-center text-xs text-brand-500 gap-2">
            <span>Scrap Trade-in Credit ($):</span>
            <div className="relative inline-block w-24">
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-green-500 font-black">$</span>
              <input
                type="number"
                className="w-full bg-slate-50 border border-brand-200 text-right pl-4 pr-1 py-1 rounded-lg text-xs font-bold font-mono outline-none"
                value={session.scrapCredit || ''}
                onChange={(e) => onChangeSession(prev => ({ ...prev, scrapCredit: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-brand-500 border-t border-brand-50 pt-2 col-span-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-brand-800">Net Estimated Charge:</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-black uppercase text-brand-500 select-none">
                <input
                  type="checkbox"
                  className="rounded text-brand-gold focus:ring-brand-gold h-3.5 w-3.5 border-brand-200 cursor-pointer"
                  checked={session.applyTax}
                  onChange={(e) => onChangeSession(prev => ({ ...prev, applyTax: e.target.checked }))}
                />
                Apply GST/PST (12%)
              </label>
            </div>
            <span className="font-mono font-bold text-brand-900">${netBeforeTax.toFixed(2)} CAD</span>
          </div>

          {session.applyTax && (
            <div className="flex justify-between items-center text-xs text-brand-500 col-span-2">
              <span>Provincial & Federal Sales Tax (12%):</span>
              <span className="font-mono font-medium text-brand-700">${taxAmount.toFixed(2)}</span>
            </div>
          )}

          {/* GRAND TOTAL */}
          <div className="col-span-2 bg-brand-950 p-4 rounded-2xl border border-brand-900 flex justify-between items-center mt-1 text-white">
            <div className="leading-none">
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-gold font-mono">Wholesale Grand Total</span>
              <span className="block text-[8px] text-brand-300 font-medium mt-0.5">Subject to bench variance</span>
            </div>
            <span className="font-mono text-lg font-black text-brand-gold">${grandTotal.toFixed(2)} CAD</span>
          </div>
        </div>

        {/* SIGNATURE PAD (5 cols) */}
        <div className="md:col-span-5 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-brand-700 uppercase tracking-wider font-mono">Wholesale Client Sign-Off</span>
            {session.signatureImg && (
              <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 text-[8px] px-1.5 py-0.5 rounded-md font-mono font-black uppercase">
                Signed
              </span>
            )}
          </div>
          <SignaturePad
            initialSignature={session.signatureImg}
            onSave={(sig) => onChangeSession(prev => ({ ...prev, signatureImg: sig }))}
            onClear={() => onChangeSession(prev => ({ ...prev, signatureImg: null }))}
          />
        </div>

      </div>

      {/* SECTION 5: ACTION FOOTER CONTROLS */}
      {!embedMode && (
        <div className="flex flex-wrap justify-between items-center gap-3 bg-brand-900 p-4 rounded-3xl border border-brand-800 print:hidden shadow-md">
          <button
            type="button"
            onClick={handleClearRepairSheet}
            className="bg-brand-950 hover:bg-brand-1000 border border-brand-800 text-red-400 hover:text-red-300 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Undo size={14} /> Clear Sheet
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrintQuoteInvoice}
              className="bg-brand-800 hover:bg-brand-750 border border-brand-700 text-brand-gold font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Printer size={14} /> Print Job Sheet
            </button>

            <button
              type="button"
              onClick={handleSaveToLedger}
              disabled={!session.cName.trim()}
              className={`font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg ${
                session.cName.trim()
                  ? 'bg-brand-gold text-brand-950 hover:bg-brand-400 border border-brand-300 cursor-pointer'
                  : 'bg-brand-800 text-brand-500 border-brand-850 cursor-not-allowed opacity-50'
              }`}
            >
              <Save size={14} /> Save Job Order
            </button>
          </div>
        </div>
      )}

      {/* ==================== HIGH-FIDELITY PRINT-FRIENDLY INVOICE CONTAINER ==================== */}
      <div id="wholesale-repair-invoice-print" className="hidden">
        <div className="bg-white text-black p-8 max-w-4xl mx-auto font-sans text-xs space-y-6">
          
          {/* Print Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-5">
            <div>
              <h1 className="font-serif italic font-black text-2xl tracking-wide uppercase">{settings.storeName || "Gold & Rose"}</h1>
              <p className="text-[10px] text-gray-500 tracking-wider uppercase font-mono">{settings.storeSubName || "Jewellery Corporation"}</p>
              <p className="text-[9px] text-gray-400 mt-1.5 leading-tight">{settings.storeAddress}</p>
              <p className="text-[9px] text-gray-400 leading-tight">{settings.storeContact}</p>
            </div>
            <div className="text-right">
              <h2 className="text-sm font-black uppercase tracking-widest bg-black text-white px-3 py-1.5 rounded">Wholesale Repair Sheet</h2>
              <div className="mt-3 text-[10px] space-y-0.5 font-mono">
                <div><strong>Invoice ID:</strong> {session.id}</div>
                {session.jobNum && <div><strong>Job #:</strong> {session.jobNum}</div>}
                <div><strong>Date Received:</strong> {new Date().toLocaleDateString()}</div>
                {session.jobDesc && <div><strong>Promise Date:</strong> {new Date(session.jobDesc).toLocaleDateString()}</div>}
              </div>
            </div>
          </div>

          {/* Client Info Section */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono mb-1">Wholesale Partner</h3>
              <p className="text-sm font-black text-gray-900">{session.cName}</p>
              {profileId && (
                <span className="inline-block bg-black text-white text-[8px] font-bold px-1.5 py-0.5 rounded font-mono uppercase mt-1">
                  Profile: {(settings.wholesaleProfiles || []).find(p => p.id === profileId)?.name || 'Custom'}
                </span>
              )}
            </div>
            <div className="text-right">
              <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono mb-1">Contact Details</h3>
              {session.cPhone && <p className="text-xs font-bold font-mono text-gray-800">{session.cPhone}</p>}
              {session.cEmail && <p className="text-xs font-bold text-gray-600">{session.cEmail}</p>}
            </div>
          </div>

          {/* Repair Items Checklist table */}
          <div>
            <h3 className="text-[10px] font-black text-gray-800 uppercase tracking-widest border-b border-black pb-1.5 mb-3 font-mono">Checked Sizing & Restoration Operations</h3>
            {currentRepairs.length === 0 ? (
              <p className="text-gray-400 italic py-2 text-center">No standard repair operations checked.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-[9px] font-mono uppercase tracking-wider text-gray-600 border-b border-gray-300">
                    <th className="p-2.5 font-black">Operation / Task description</th>
                    <th className="p-2.5 text-center font-black">Specs</th>
                    <th className="p-2.5 text-right font-black">Calculated Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-xs">
                  {currentRepairs.map((rep) => (
                    <tr key={rep.id}>
                      <td className="p-2.5 font-bold text-gray-900">
                        {rep.name}
                        {rep.option && <span className="block text-[9px] text-gray-500 font-mono font-normal">Color plating option: {rep.option}</span>}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-gray-600">
                        {rep.id.startsWith('resizeUp') ? (
                          <span>+{rep.extraQty || 0} sizes</span>
                        ) : rep.qty > 0 ? (
                          <span>{rep.qty}x</span>
                        ) : (
                          <span className="text-[9px] font-bold text-gray-400 uppercase font-mono">Flat rate</span>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-gray-900">${rep.price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Custom Bench Charges */}
          {currentAddons.length > 0 && (
            <div>
              <h3 className="text-[10px] font-black text-gray-800 uppercase tracking-widest border-b border-black pb-1.5 mb-3 font-mono">Raw Materials & Finding Component Charges</h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-[9px] font-mono uppercase tracking-wider text-gray-600 border-b border-gray-300">
                    <th className="p-2.5 font-black">Raw Component Description</th>
                    <th className="p-2.5 text-right font-black">Component Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-xs">
                  {currentAddons.map((add, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold text-gray-900">{add.desc || 'Custom jewelry component charge'}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-gray-900">${(parseFloat(add.fee) || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sketches & Notes on Print */}
          <div className="grid grid-cols-2 gap-6 pt-2">
            
            {/* Printable sketches & photos */}
            <div className="space-y-4">
              {activeItem.referenceSketches && activeItem.referenceSketches.length > 0 && (
                <div>
                  <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono mb-2 border-b border-gray-250 pb-1">Visual Bench Sketch</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {activeItem.referenceSketches.map((sk, skIdx) => (
                      <div key={skIdx} className="border border-gray-200 p-1 rounded-lg aspect-square bg-white">
                        <img src={sk} alt={`Sketch ${skIdx+1}`} className="w-full h-full object-contain" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeItem.referencePhotos && activeItem.referencePhotos.length > 0 && (
                <div>
                  <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono mb-2 border-b border-gray-250 pb-1">Visual Intake Photograph</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {activeItem.referencePhotos.map((ph, phIdx) => (
                      <div key={phIdx} className="border border-gray-200 p-1 rounded-lg aspect-square bg-white">
                        <img src={ph} alt={`Intake ${phIdx+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Print Notes */}
            <div className="space-y-4">
              <div>
                <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono mb-1.5 border-b border-gray-250 pb-1">Special Bench Instructions</h3>
                <p className="text-gray-700 italic leading-relaxed text-xs p-3 bg-gray-50 rounded-xl border border-gray-150 whitespace-pre-line font-medium min-h-24">
                  {activeItem.repairNotes || "No special instructions provided."}
                </p>
              </div>

              {session.notes && (
                <div>
                  <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono mb-1.5 border-b border-gray-250 pb-1">Administrative Notes</h3>
                  <p className="text-gray-700 italic leading-relaxed text-xs whitespace-pre-line">
                    {session.notes}
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Billing & Sign-Off print block */}
          <div className="border-t-2 border-black pt-5 mt-4 grid grid-cols-2 gap-6 items-end">
            
            {/* Signature Block */}
            <div className="space-y-2">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">Wholesale Client Signature Authorization</p>
              {session.signatureImg ? (
                <div className="border border-gray-250 p-2.5 rounded-xl bg-gray-50 h-28 flex items-center justify-center">
                  <img src={session.signatureImg} alt="Authorization signature" className="max-h-full object-contain" />
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 p-2.5 rounded-xl h-28 flex items-center justify-center text-gray-400 italic">
                  Signature absent (Pending visual approval)
                </div>
              )}
              <p className="text-[9px] text-gray-400 leading-tight">By signing above, client stores acknowledge and approve the wholesale estimates and warranty parameters.</p>
            </div>

            {/* Print Totals */}
            <div className="space-y-2 text-right">
              <div className="flex justify-between text-xs text-gray-600 px-1 font-medium">
                <span>Calculated Operations Subtotal:</span>
                <span className="font-mono font-bold">${subtotalTotal.toFixed(2)}</span>
              </div>
              
              {computedDiscount > 0 && (
                <div className="flex justify-between text-xs text-amber-600 px-1 font-bold">
                  <span>Profile Discount Deduct:</span>
                  <span className="font-mono">-${computedDiscount.toFixed(2)}</span>
                </div>
              )}

              {scrapCredit > 0 && (
                <div className="flex justify-between text-xs text-green-600 px-1 font-bold">
                  <span>Scrap Buyback Credit Deduct:</span>
                  <span className="font-mono">-${scrapCredit.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-xs text-gray-900 border-t border-gray-200 pt-2 px-1 font-bold">
                <span>Net Estimated Total:</span>
                <span className="font-mono">${netBeforeTax.toFixed(2)}</span>
              </div>

              {session.applyTax && (
                <div className="flex justify-between text-[11px] text-gray-600 px-1">
                  <span>Sales Tax (12% GST/PST):</span>
                  <span className="font-mono">${taxAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm bg-black text-white p-3.5 rounded-xl font-bold items-center mt-2">
                <span className="uppercase tracking-widest text-[9px] font-mono">Job Grand Total</span>
                <span className="font-mono text-base">${grandTotal.toFixed(2)} CAD</span>
              </div>
            </div>

          </div>

          {/* Print Footer Disclaimer */}
          <div className="text-center pt-8 text-[8px] text-gray-400 border-t border-gray-150">
            Gold & Rose Jewellery Corporation | Burnaby, British Columbia
            <br />
            Confidential Wholesale Repair Document. Subject to bench inspection variance. Warranty active for 365 days.
          </div>

        </div>
      </div>

    </div>
  );
}
