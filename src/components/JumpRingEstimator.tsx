/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Circle, Sparkles, Scale, DollarSign, Plus, Trash2, 
  Copy, Check, RefreshCw, Ruler, Layers, Link as LinkIcon, 
  Calculator, Info, ShieldAlert, ArrowRight, Printer, Coins
} from 'lucide-react';
import { DENSITIES, TROY_ONCE_GRAMS } from '../constants';

interface SavedJumpRingEstimate {
  id: string;
  name: string;
  material: 'gold' | 'platinum' | 'silver';
  goldKarat: number;
  diameterType: 'OD' | 'ID';
  diameterMm: number;
  wireWidthMm: number;
  wireHeightMm: number;
  wireProfile: 'round' | 'rectangular' | 'halfRound';
  ringWeightGrams: number;
  ringWeightDwt: number;
  pricePerGram: number;
  singleRingPrice: number;
  isExtensionMode: boolean;
  extensionLengthInches: number;
  ringsNeededCount: number;
  totalWeightGrams: number;
  totalRetailPrice: number;
  claspType: string;
  claspFee: number;
  createdAt: string;
}

interface JumpRingEstimatorProps {
  spotPrices: { gold: number; silver: number; platinum: number };
  settings: any;
  onTriggerPrint?: (printFn: () => void) => void;
  isIframe?: boolean;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// Common Standard Wire Gauge (B&S Gauge) Options
const GAUGE_PRESETS = [
  { gauge: '10 Ga', mm: 2.59, label: '2.59 mm (10 Ga - Extra Heavy)' },
  { gauge: '12 Ga', mm: 2.05, label: '2.05 mm (12 Ga - Heavy)' },
  { gauge: '14 Ga', mm: 1.63, label: '1.63 mm (14 Ga - Thick Ring)' },
  { gauge: '16 Ga', mm: 1.29, label: '1.29 mm (16 Ga - Standard Heavy)' },
  { gauge: '18 Ga', mm: 1.02, label: '1.02 mm (18 Ga - Standard Chain)' },
  { gauge: '20 Ga', mm: 0.81, label: '0.81 mm (20 Ga - Light Accent)' },
  { gauge: '22 Ga', mm: 0.64, label: '0.64 mm (22 Ga - Fine Wire)' },
  { gauge: '24 Ga', mm: 0.51, label: '0.51 mm (24 Ga - Extra Fine)' },
];

// Quick Ring Preset Sizes
const RING_PRESETS = [
  { name: '3mm Light Accent (20Ga)', diameter: 3.0, width: 0.81, profile: 'round' as const },
  { name: '4mm Standard Link (18Ga)', diameter: 4.0, width: 1.02, profile: 'round' as const },
  { name: '5mm Medium Charm (18Ga)', diameter: 5.0, width: 1.02, profile: 'round' as const },
  { name: '6mm Heavy Link (16Ga)', diameter: 6.0, width: 1.29, profile: 'round' as const },
  { name: '7mm Heavy Ring (16Ga)', diameter: 7.0, width: 1.29, profile: 'round' as const },
  { name: '8mm Pendant Ring (14Ga)', diameter: 8.0, width: 1.63, profile: 'round' as const },
  { name: '10mm Extender Ring (14Ga)', diameter: 10.0, width: 1.63, profile: 'round' as const },
];

export default function JumpRingEstimator({
  spotPrices,
  settings,
  onTriggerPrint,
  isIframe,
  showToast
}: JumpRingEstimatorProps) {
  // --- Form State ---
  const [material, setMaterial] = useState<'gold' | 'platinum' | 'silver'>('gold');
  const [goldKarat, setGoldKarat] = useState<number>(14);
  const [diameterType, setDiameterType] = useState<'OD' | 'ID'>('OD');
  const [diameterMm, setDiameterMm] = useState<number | string>(5.0);
  const [wireWidthMm, setWireWidthMm] = useState<number | string>(1.02); // 18 Gauge
  const [wireHeightMm, setWireHeightMm] = useState<number | string>(1.02);
  const [wireProfile, setWireProfile] = useState<'round' | 'rectangular' | 'halfRound'>('round');
  const [isRoundLocked, setIsRoundLocked] = useState<boolean>(true);

  // Price override option
  const [customPricePerGram, setCustomPricePerGram] = useState<string>('');
  const [wastagePercent, setWastagePercent] = useState<number>(0);
  const [laborPerRing, setLaborPerRing] = useState<number | string>(0);

  // Batch quantity vs Chain extension mode
  const [mode, setMode] = useState<'single' | 'extension'>('extension');
  const [quantity, setQuantity] = useState<number | string>(1);

  // Extension specific state
  const [extensionLengthInches, setExtensionLengthInches] = useState<number | string>(2.0); // 2 inches default
  const [claspType, setClaspType] = useState<string>('none');
  const [claspFee, setClaspFee] = useState<number | string>(0);

  // Saved estimates history
  const [savedEstimates, setSavedEstimates] = useState<SavedJumpRingEstimate[]>(() => {
    try {
      const stored = localStorage.getItem('gr_jumpring_estimates');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [estimateLabel, setEstimateLabel] = useState<string>('');

  // Handle auto locking wire height for round profile
  const handleWidthChange = (val: number | string) => {
    setWireWidthMm(val);
    if (isRoundLocked || wireProfile === 'round') {
      setWireHeightMm(val);
    }
  };

  const handleProfileChange = (profile: 'round' | 'rectangular' | 'halfRound') => {
    setWireProfile(profile);
    if (profile === 'round') {
      setIsRoundLocked(true);
      setWireHeightMm(wireWidthMm);
    } else {
      setIsRoundLocked(false);
    }
  };

  // --- Derive Retail Price per Gram from Settings Matrix ---
  const activeRetailPricePerGram = useMemo(() => {
    if (customPricePerGram && !isNaN(parseFloat(customPricePerGram))) {
      return parseFloat(customPricePerGram);
    }
    if (material === 'platinum') {
      return settings?.platinumPricePerGram || 380;
    }
    if (material === 'silver') {
      return settings?.silverPricePerGram || 100;
    }
    // Gold Karats
    if (settings?.goldPricesPerGram && settings.goldPricesPerGram[goldKarat]) {
      return settings.goldPricesPerGram[goldKarat];
    }
    // Fallback spot calculation if matrix not set
    const spotGold = spotPrices?.gold || 3200;
    return Math.round((spotGold / TROY_ONCE_GRAMS) * (goldKarat / 24) * 2.2);
  }, [material, goldKarat, settings, spotPrices, customPricePerGram]);

  // --- Calculations ---
  const calculationResults = useMemo(() => {
    const numDiameter = typeof diameterMm === 'number' ? diameterMm : (diameterMm === '' ? 0 : parseFloat(diameterMm) || 0);
    const numWireWidth = typeof wireWidthMm === 'number' ? wireWidthMm : (wireWidthMm === '' ? 0 : parseFloat(wireWidthMm) || 0);
    const numWireHeight = typeof wireHeightMm === 'number' ? wireHeightMm : (wireHeightMm === '' ? 0 : parseFloat(wireHeightMm) || 0);
    const numLaborPerRing = typeof laborPerRing === 'number' ? laborPerRing : (laborPerRing === '' ? 0 : parseFloat(laborPerRing) || 0);
    const numQuantity = typeof quantity === 'number' ? quantity : (quantity === '' ? 1 : parseInt(quantity) || 1);
    const numExtensionLength = typeof extensionLengthInches === 'number' ? extensionLengthInches : (extensionLengthInches === '' ? 0 : parseFloat(extensionLengthInches) || 0);
    const numClaspFee = typeof claspFee === 'number' ? claspFee : (claspFee === '' ? 0 : parseFloat(claspFee) || 0);

    const w = Math.max(0.05, numWireWidth);
    const h = wireProfile === 'round' ? w : Math.max(0.05, numWireHeight);

    let od = numDiameter;
    let id = numDiameter;

    if (diameterType === 'OD') {
      od = Math.max(w * 2 + 0.1, numDiameter);
      id = od - (2 * w);
    } else {
      id = Math.max(0.1, numDiameter);
      od = id + (2 * w);
    }

    const meanDiameter = od - w; // mm
    const meanCircumference = Math.PI * meanDiameter; // mm

    // Cross section area in mm^2
    let crossSectionAreaMm2 = 0;
    if (wireProfile === 'round') {
      crossSectionAreaMm2 = Math.PI * Math.pow(w / 2, 2);
    } else if (wireProfile === 'rectangular') {
      crossSectionAreaMm2 = w * h;
    } else if (wireProfile === 'halfRound') {
      crossSectionAreaMm2 = (Math.PI / 2) * (w / 2) * h;
    }

    // Single Ring Volume in mm^3
    const volumeMm3 = crossSectionAreaMm2 * meanCircumference;
    const volumeCm3 = volumeMm3 / 1000;

    // Density
    let densityGcm3 = 13.1; // default 14k
    if (material === 'platinum') {
      densityGcm3 = DENSITIES.platinum || 20.1;
    } else if (material === 'silver') {
      densityGcm3 = DENSITIES.silver || 10.4;
    } else {
      densityGcm3 = DENSITIES.gold[goldKarat] || 13.1;
    }

    // Weight of 1 Jump Ring (with optional wastage allowance)
    const baseWeightGrams = volumeCm3 * densityGcm3;
    const weightGramsWithWastage = baseWeightGrams * (1 + wastagePercent / 100);
    const weightDwt = weightGramsWithWastage / 1.55517;

    // Metal cost & retail price for 1 Ring
    const metalRetailSingle = weightGramsWithWastage * activeRetailPricePerGram;
    const singleRingTotalPrice = metalRetailSingle + numLaborPerRing;

    // Extension & Batch Logic
    let ringsNeeded = Math.max(1, Math.round(numQuantity));
    let effectivePitchMm = Math.max(0.2, id); // standard interlinked pitch = inner diameter
    let achievedLengthInches = 0;
    let achievedLengthMm = 0;

    if (mode === 'extension') {
      const targetMm = numExtensionLength * 25.4;
      if (numExtensionLength <= 0) {
        ringsNeeded = 1;
        achievedLengthMm = effectivePitchMm;
        achievedLengthInches = achievedLengthMm / 25.4;
      } else {
        ringsNeeded = Math.max(1, Math.ceil(targetMm / effectivePitchMm));
        achievedLengthMm = ringsNeeded * effectivePitchMm;
        achievedLengthInches = achievedLengthMm / 25.4;
      }
    }

    const totalWeightGrams = weightGramsWithWastage * ringsNeeded;
    const totalWeightDwt = totalWeightGrams / 1.55517;
    const totalMetalRetailPrice = metalRetailSingle * ringsNeeded;
    const totalLaborPrice = numLaborPerRing * ringsNeeded;
    const grandTotal = totalMetalRetailPrice + totalLaborPrice + (mode === 'extension' ? numClaspFee : 0);

    return {
      od,
      id,
      meanDiameter,
      meanCircumference,
      crossSectionAreaMm2,
      volumeMm3,
      densityGcm3,
      baseWeightGrams,
      singleRingWeightGrams: weightGramsWithWastage,
      singleRingWeightDwt: weightDwt,
      metalRetailSingle,
      singleRingTotalPrice,
      effectivePitchMm,
      ringsNeeded,
      achievedLengthInches,
      achievedLengthMm,
      totalWeightGrams,
      totalWeightDwt,
      totalMetalRetailPrice,
      totalLaborPrice,
      grandTotal,
      activePricePerGram: activeRetailPricePerGram
    };
  }, [
    material, goldKarat, diameterType, diameterMm, wireWidthMm, wireHeightMm, 
    wireProfile, wastagePercent, laborPerRing, activeRetailPricePerGram, mode, 
    quantity, extensionLengthInches, claspFee
  ]);

  // Handle saving estimate
  const handleSaveEstimate = () => {
    const label = estimateLabel.trim() || `${diameterMm}mm (${wireWidthMm}mm) ${material.toUpperCase()} ${material === 'gold' ? `${goldKarat}K` : ''} Jump Ring`;
    
    const newEst: SavedJumpRingEstimate = {
      id: `jr_${Date.now()}`,
      name: label,
      material,
      goldKarat,
      diameterType,
      diameterMm,
      wireWidthMm,
      wireHeightMm,
      wireProfile,
      ringWeightGrams: calculationResults.singleRingWeightGrams,
      ringWeightDwt: calculationResults.singleRingWeightDwt,
      pricePerGram: calculationResults.activePricePerGram,
      singleRingPrice: calculationResults.singleRingTotalPrice,
      isExtensionMode: mode === 'extension',
      extensionLengthInches,
      ringsNeededCount: calculationResults.ringsNeeded,
      totalWeightGrams: calculationResults.totalWeightGrams,
      totalRetailPrice: calculationResults.grandTotal,
      claspType: claspType !== 'none' ? claspType : 'None',
      claspFee,
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    const updated = [newEst, ...savedEstimates];
    setSavedEstimates(updated);
    try {
      localStorage.setItem('gr_jumpring_estimates', JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save jump ring estimate locally:", e);
    }

    if (showToast) {
      showToast("Jump Ring Estimate saved successfully!", "success");
    }
    setEstimateLabel('');
  };

  const handleDeleteEstimate = (id: string) => {
    const updated = savedEstimates.filter(e => e.id !== id);
    setSavedEstimates(updated);
    try {
      localStorage.setItem('gr_jumpring_estimates', JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to delete estimate:", e);
    }
    if (showToast) {
      showToast("Estimate removed", "info");
    }
  };

  const handleCopySummary = (est?: SavedJumpRingEstimate) => {
    const res = calculationResults;
    let summaryText = "";

    if (est) {
      summaryText = `--- JUMP RING ESTIMATE ---
Name: ${est.name}
Material: ${est.material.toUpperCase()} ${est.material === 'gold' ? `${est.goldKarat}K` : ''}
Ring Outer Diameter: ${est.diameterMm} mm
Wire Thickness: ${est.wireWidthMm} mm
Weight per Ring: ${est.ringWeightGrams.toFixed(3)} g (${est.ringWeightDwt.toFixed(2)} dwt)
Price per Ring: $${est.singleRingPrice.toFixed(2)}
${est.isExtensionMode ? `Extension Length: ${est.extensionLengthInches}" (${est.ringsNeededCount} rings)
Total Weight: ${est.totalWeightGrams.toFixed(3)} g
Clasp: ${est.claspType} (+$${est.claspFee})
Grand Total: $${est.totalRetailPrice.toFixed(2)}` : `Quantity: ${est.ringsNeededCount} rings
Total Retail Price: $${est.totalRetailPrice.toFixed(2)}`}
Date: ${est.createdAt}`;
    } else {
      summaryText = `--- JUMP RING ESTIMATE ---
Material: ${material.toUpperCase()} ${material === 'gold' ? `${goldKarat}K` : ''}
Dimensions: Outer Diameter ${res.od.toFixed(2)}mm | Inner Diameter ${res.id.toFixed(2)}mm | Wire ${wireWidthMm}mm (${wireProfile})
Single Ring Weight: ${res.singleRingWeightGrams.toFixed(3)} g (${res.singleRingWeightDwt.toFixed(2)} dwt)
Retail Price / Gram: $${res.activePricePerGram.toFixed(2)} / g
Single Ring Retail Price: $${res.singleRingTotalPrice.toFixed(2)}
${mode === 'extension' ? `Chain Extension Length: ${extensionLengthInches}" (${res.ringsNeeded} Jump Rings)
Extension Total Weight: ${res.totalWeightGrams.toFixed(3)} g (${res.totalWeightDwt.toFixed(2)} dwt)
Clasp Add-on: ${claspType} (+$${claspFee.toFixed(2)})
Total Extension Retail Quote: $${res.grandTotal.toFixed(2)}` : `Batch Quantity: ${res.ringsNeeded} rings
Total Batch Weight: ${res.totalWeightGrams.toFixed(3)} g
Total Retail Price: $${res.grandTotal.toFixed(2)}`}`;
    }

    navigator.clipboard.writeText(summaryText);
    setCopiedId(est ? est.id : 'current');
    setTimeout(() => setCopiedId(null), 2500);
    if (showToast) {
      showToast("Estimate summary copied to clipboard!", "success");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 p-6 rounded-3xl border border-amber-500/30 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-500/20 text-brand-gold rounded-2xl border border-amber-400/30 shadow-inner">
                <Circle size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  Jump Ring & Chain Extension Estimator
                  <span className="text-[10px] font-black uppercase tracking-widest bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full">
                    Retail Matrix Linked
                  </span>
                </h2>
                <p className="text-xs text-amber-200/80">
                  Calculate exact jump ring dimensions, weights, and retail pricing linked directly to your Standard Retail Gold Matrix ($/gram).
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onTriggerPrint && (
              <button
                type="button"
                onClick={() => onTriggerPrint(() => window.print())}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Printer size={14} />
                Print Specification
              </button>
            )}
            <button
              type="button"
              onClick={() => handleCopySummary()}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md"
            >
              {copiedId === 'current' ? <Check size={14} /> : <Copy size={14} />}
              {copiedId === 'current' ? 'Copied Summary!' : 'Copy Summary'}
            </button>
          </div>
        </div>
      </div>

      {/* MAIN TWO COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT FORM CONTROLS (7 COLS) */}
        <div className="lg:col-span-7 space-y-5">

          {/* 1. Metal Alloy & Purity Selection */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <Coins size={15} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  1. Metal Alloy & Purity
                </h3>
              </div>
              <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                Standard Matrix
              </span>
            </div>

            {/* Material Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMaterial('gold')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5 ${
                  material === 'gold' 
                    ? 'bg-amber-50 text-amber-950 border-amber-400 ring-2 ring-amber-400/20 shadow-xs' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                <Sparkles size={13} className={material === 'gold' ? 'text-amber-600' : ''} />
                Gold
              </button>
              <button
                type="button"
                onClick={() => setMaterial('platinum')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5 ${
                  material === 'platinum' 
                    ? 'bg-slate-800 text-white border-slate-700 ring-2 ring-slate-400/20 shadow-xs' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                Platinum
              </button>
              <button
                type="button"
                onClick={() => setMaterial('silver')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5 ${
                  material === 'silver' 
                    ? 'bg-slate-200 text-slate-900 border-slate-400 ring-2 ring-slate-300/30 shadow-xs' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                Silver
              </button>
            </div>

            {/* Karat Pills if Gold */}
            {material === 'gold' && (
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">Gold Karat Purity</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {[10, 14, 18, 19, 22, 24].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setGoldKarat(k)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        goldKarat === k
                          ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      {k}K
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Jump Ring Dimensions & Wire Size */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-brand-100 text-brand-800 rounded-lg">
                  <Circle size={15} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  2. Jump Ring Geometry & Wire Size
                </h3>
              </div>

              {/* Quick Presets Dropdown */}
              <div className="relative">
                <select
                  className="bg-amber-50 border border-amber-300 text-amber-950 font-bold text-xs py-1 px-2.5 rounded-lg focus:outline-none cursor-pointer"
                  onChange={(e) => {
                    const idx = parseInt(e.target.value);
                    if (!isNaN(idx) && RING_PRESETS[idx]) {
                      const p = RING_PRESETS[idx];
                      setDiameterMm(p.diameter);
                      setWireWidthMm(p.width);
                      setWireHeightMm(p.width);
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>-- Preset Ring Sizes --</option>
                  {RING_PRESETS.map((p, i) => (
                    <option key={i} value={i}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Outside Diameter Input */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-800 block">Ring outside diameter mm</label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="50"
                    className="w-full bg-slate-50 border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm font-black font-mono text-slate-900 focus:border-amber-500 outline-none"
                    value={diameterMm}
                    onChange={(e) => setDiameterMm(e.target.value)}
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">mm</span>
                </div>

                {/* Quick Diameter Buttons */}
                <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
                  {[3, 4, 5, 6, 7, 8, 10, 12].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDiameterMm(d)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        Number(diameterMm) === d
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {d}mm
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Wire Diameter & Gauge Selector */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-black text-slate-800 block">Wire diameter (mm)</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="10"
                    className="w-full bg-slate-50 border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm font-black font-mono text-slate-900 focus:border-amber-500 outline-none"
                    value={wireWidthMm}
                    onChange={(e) => handleWidthChange(e.target.value)}
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">mm</span>
                </div>

                {/* B&S Gauge Selector */}
                <select
                  className="w-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-3 py-2.5 rounded-xl focus:outline-none cursor-pointer"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) handleWidthChange(val);
                  }}
                  value={wireWidthMm}
                >
                  <option value="" disabled>-- Standard Gauge Helper --</option>
                  {GAUGE_PRESETS.map((g, i) => (
                    <option key={i} value={g.mm}>{g.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Estimator Mode: Chain Extension vs Batch Quantity */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 text-amber-900 rounded-lg">
                  <LinkIcon size={15} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  3. Chain Extension & Batch Estimator
                </h3>
              </div>

              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setMode('extension')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    mode === 'extension' ? 'bg-amber-500 text-slate-950 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Chain Extension
                </button>
                <button
                  type="button"
                  onClick={() => setMode('single')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    mode === 'single' ? 'bg-amber-500 text-slate-950 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Batch Quantity
                </button>
              </div>
            </div>

            {mode === 'extension' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 block">
                      Target Extension Length (Inches)
                    </label>
                    <span className="text-xs font-black text-amber-600 font-mono bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      {(typeof extensionLengthInches === 'number' ? extensionLengthInches : (parseFloat(extensionLengthInches) || 0)).toFixed(2)}"
                      {(typeof extensionLengthInches === 'number' ? extensionLengthInches : parseFloat(extensionLengthInches) || 0) <= 0 && " (1 Ring)"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div className="relative">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max="8"
                        className="w-full bg-slate-50 border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm font-black font-mono text-slate-900 focus:border-amber-500 outline-none"
                        value={extensionLengthInches}
                        onChange={(e) => setExtensionLengthInches(e.target.value)}
                      />
                      <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">inches</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <input
                        type="range"
                        min="0"
                        max="8"
                        step="0.25"
                        className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
                        value={typeof extensionLengthInches === 'number' ? extensionLengthInches : (parseFloat(extensionLengthInches) || 0)}
                        onChange={(e) => setExtensionLengthInches(parseFloat(e.target.value))}
                      />
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 font-mono px-0.5">
                        <span>0"</span>
                        <span>2"</span>
                        <span>4"</span>
                        <span>6"</span>
                        <span>8"</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clasp & End Attachment Fee Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Clasp Add-on</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 focus:border-amber-500 outline-none cursor-pointer"
                      value={claspType}
                      onChange={(e) => {
                        const type = e.target.value;
                        setClaspType(type);
                        if (type === 'lobster') setClaspFee(18);
                        else if (type === 'spring') setClaspFee(12);
                        else if (type === 'endTab') setClaspFee(6);
                        else if (type === 'none') setClaspFee(0);
                      }}
                    >
                      <option value="none">No Clasp (Jump Rings Only)</option>
                      <option value="lobster">Lobster Claw Clasp (+$18)</option>
                      <option value="spring">Spring Ring Clasp (+$12)</option>
                      <option value="endTab">End Tab Ring (+$6)</option>
                      <option value="custom">Custom Clasp Fee ($)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Clasp / Assembly Fee ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 text-xs font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-slate-50 border border-slate-300 pl-7 pr-3 py-2 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-amber-500 outline-none"
                        value={claspFee}
                        onChange={(e) => setClaspFee(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-800 block mb-1">
                    Jump Ring Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    className="w-full bg-slate-50 border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm font-black font-mono text-slate-900 focus:border-amber-500 outline-none"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Labor Fee / Ring ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      className="w-full bg-slate-50 border border-slate-300 pl-7 pr-3 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-amber-500 outline-none"
                      value={laborPerRing}
                      onChange={(e) => setLaborPerRing(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT SUMMARY & LIVE CALCULATION CARD (5 COLS) */}
        <div className="lg:col-span-5 space-y-5">

          {/* MAIN QUOTE BREAKDOWN CARD */}
          <div className="bg-gradient-to-br from-slate-900 via-brand-950 to-slate-950 p-6 rounded-3xl text-white border border-amber-500/30 shadow-2xl space-y-5 sticky top-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                  Live Calculation Output
                </span>
                <h3 className="text-lg font-black text-white">
                  {mode === 'extension' ? 'Chain Extension Quote' : 'Jump Ring Quote'}
                </h3>
              </div>
              <div className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-black">
                {material.toUpperCase()} {material === 'gold' ? `${goldKarat}K` : ''}
              </div>
            </div>

            {/* KEY METRICS GRID */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">Weight / Single Ring</span>
                <div className="text-base font-black text-amber-300 font-mono">
                  {calculationResults.singleRingWeightGrams.toFixed(3)} g
                </div>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">Retail Price / Ring</span>
                <div className="text-base font-black text-emerald-400 font-mono">
                  ${calculationResults.singleRingTotalPrice.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  (Single Unit Price)
                </div>
              </div>
            </div>

            {/* EXTENSION / BATCH DETAILS */}
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">Outer Diameter (OD):</span>
                <span className="font-mono font-bold text-amber-200">{calculationResults.od.toFixed(2)} mm</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">Inner Diameter (ID):</span>
                <span className="font-mono font-bold text-amber-200">{calculationResults.id.toFixed(2)} mm</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">Wire Dimensions:</span>
                <span className="font-mono font-bold text-slate-200">
                  {wireWidthMm}mm {wireProfile !== 'round' ? `x ${wireHeightMm}mm` : ''} ({wireProfile})
                </span>
              </div>

              {mode === 'extension' && (
                <>
                  <div className="border-t border-slate-700/80 my-2 pt-2 flex justify-between items-center text-xs">
                    <span className="text-amber-300 font-bold">Extension Target:</span>
                    <span className="font-mono font-bold text-white">{extensionLengthInches}" ({calculationResults.achievedLengthMm.toFixed(1)} mm)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Jump Rings Required:</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">{calculationResults.ringsNeeded} Rings</span>
                  </div>
                  {claspFee > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-medium">Clasp Add-on ({claspType}):</span>
                      <span className="font-mono font-bold text-slate-200">+${claspFee.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}

              {mode === 'single' && quantity > 1 && (
                <div className="border-t border-slate-700/80 my-2 pt-2 flex justify-between items-center text-xs">
                  <span className="text-amber-300 font-bold">Batch Quantity:</span>
                  <span className="font-mono font-bold text-white">{quantity} Rings</span>
                </div>
              )}

              <div className="border-t border-slate-700/80 pt-2 flex justify-between items-center text-xs">
                <span className="text-slate-300 font-bold">Total Metal Weight:</span>
                <span className="font-mono font-black text-amber-300 text-sm">
                  {calculationResults.totalWeightGrams.toFixed(3)} g ({calculationResults.totalWeightDwt.toFixed(2)} dwt)
                </span>
              </div>
            </div>

            {/* GRAND TOTAL PRICE */}
            <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-500/20 p-4 rounded-2xl border border-amber-400/40 text-center space-y-1 shadow-inner">
              <span className="text-xs font-black uppercase tracking-widest text-amber-300 block">
                Total Retail Quote
              </span>
              <div className="text-3xl font-black text-amber-400 font-mono tracking-tight">
                ${calculationResults.grandTotal.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-300 block">
                Final Estimated Retail Quote
              </span>
            </div>

            {/* SAVE ESTIMATE FORM */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <input
                type="text"
                placeholder="Estimate Name / Label (Optional)"
                className="w-full bg-slate-800 border border-slate-700 px-3.5 py-2 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-amber-400 outline-none"
                value={estimateLabel}
                onChange={(e) => setEstimateLabel(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSaveEstimate}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Plus size={15} />
                Save Jump Ring Estimate
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* SAVED ESTIMATES HISTORY TABLE */}
      {savedEstimates.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                <Calculator size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Saved Jump Ring Estimates ({savedEstimates.length})
                </h3>
                <p className="text-xs text-slate-500">History of saved jump ring and extension quotes.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Clear all saved jump ring estimates history?")) {
                  setSavedEstimates([]);
                  localStorage.removeItem('gr_jumpring_estimates');
                }
              }}
              className="text-xs font-bold text-red-600 hover:text-red-700 transition-all flex items-center gap-1"
            >
              <Trash2 size={13} />
              Clear History
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-2.5 px-3">Estimate Name</th>
                  <th className="py-2.5 px-3">Purity & Size</th>
                  <th className="py-2.5 px-3">Wire</th>
                  <th className="py-2.5 px-3">Ring Weight</th>
                  <th className="py-2.5 px-3">Qty / Ext.</th>
                  <th className="py-2.5 px-3">Total Weight</th>
                  <th className="py-2.5 px-3">Total Retail</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {savedEstimates.map((est) => (
                  <tr key={est.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {est.name}
                      <span className="text-[10px] text-slate-400 block font-normal">{est.createdAt}</span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded text-[10px] mr-1">
                        {est.material.toUpperCase()} {est.material === 'gold' ? `${est.goldKarat}K` : ''}
                      </span>
                      {est.diameterMm}mm OD
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {est.wireWidthMm}mm ({est.wireProfile})
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-800">
                      {est.ringWeightGrams.toFixed(3)} g
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      {est.isExtensionMode ? `${est.extensionLengthInches}" (${est.ringsNeededCount} rings)` : `${est.ringsNeededCount} rings`}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-900">
                      {est.totalWeightGrams.toFixed(3)} g
                    </td>
                    <td className="py-3 px-3 font-mono font-black text-emerald-700">
                      ${est.totalRetailPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => handleCopySummary(est)}
                        title="Copy Summary"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all inline-flex items-center"
                      >
                        {copiedId === est.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEstimate(est.id)}
                        title="Delete Estimate"
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all inline-flex items-center"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
