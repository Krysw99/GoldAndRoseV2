/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Layers, Weight, DollarSign, Trash2, 
  Plus, Check, ChevronRight, RefreshCw, Ruler, Hammer,
  HelpCircle
} from 'lucide-react';
import { TROY_ONCE_GRAMS, DENSITIES } from '../constants';

interface CubanEstimate {
  id: string;
  customerName: string;
  material: 'gold' | 'silver' | 'platinum';
  goldKarat: number;
  metalColor: 'Yellow' | 'White' | 'Rose';
  width: number;
  length: number;
  style: string;
  weightNominal: number;
  weightMin: number;
  weightMax: number;
  laborType: 'perGram' | 'flat';
  laborRate: number;
  metalCost: number;
  laborCost: number;
  totalCostMin: number;
  totalCostMax: number;
  timestamp: string;
}

interface CubanBraceletBuilderProps {
  spotPrices: { gold: number; silver: number; platinum: number };
  settings: any;
}

export default function CubanBraceletBuilder({ spotPrices, settings }: CubanBraceletBuilderProps) {
  // Input parameters
  const [material, setMaterial] = useState<'gold' | 'silver' | 'platinum'>('gold');
  const [goldKarat, setGoldKarat] = useState<number>(14);
  const [metalColor, setMetalColor] = useState<'Yellow' | 'White' | 'Rose'>('Yellow');
  const [silverPurity, setSilverPurity] = useState<number>(0.925);
  const [silverFinish, setSilverFinish] = useState<'Polished' | 'Oxidized' | 'Rhodium'>('Polished');
  const [platinumPurity, setPlatinumPurity] = useState<number>(0.950);
  const [platinumFinish, setPlatinumFinish] = useState<'Polished' | 'Satin' | 'Sandblasted'>('Polished');
  const [width, setWidth] = useState<number>(8.0); // mm
  const [length, setLength] = useState<number>(8.0); // inches
  const [linkStyle, setLinkStyle] = useState<string>('classic'); // classic, tight, hollow, flat
  
  // Pricing & Labor
  const [laborType, setLaborType] = useState<'perGram' | 'flat'>('perGram');
  const [laborRate, setLaborRate] = useState<number>(12.0); // CAD per gram or flat fee

  // Customer Logging State
  const [customerName, setCustomerName] = useState<string>('');
  const [estimates, setEstimates] = useState<CubanEstimate[]>([]);

  // Simulation parameters
  const [simViewMode, setSimViewMode] = useState<'realistic' | 'blueprint'>('realistic');

  // Load saved estimates from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('gr_cuban_estimates');
      if (saved) {
        setEstimates(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load Cuban estimates:", e);
    }
  }, []);

  // Save estimates to local storage
  const saveEstimatesToStorage = (updated: CubanEstimate[]) => {
    try {
      localStorage.setItem('gr_cuban_estimates', JSON.stringify(updated));
      setEstimates(updated);
    } catch (e) {
      console.error("Failed to save Cuban estimates:", e);
    }
  };

  // Purity list
  const goldKarats = [10, 14, 18, 22, 24];

  // Metal density lookup
  const getDensity = (): number => {
    if (material === 'gold') {
      const goldDensities = DENSITIES.gold as Record<number, number>;
      return goldDensities[goldKarat] || 13.1;
    } else if (material === 'silver') {
      return DENSITIES.silver || 10.4;
    } else {
      return DENSITIES.platinum || 20.1;
    }
  };

  // Get style multiplier
  const getStyleMultiplier = (): number => {
    switch (linkStyle) {
      case 'tight': return 1.15;
      case 'hollow': return 0.60;
      case 'flat': return 0.85;
      case 'classic':
      default: return 1.0;
    }
  };

  // 1. Calculate weight based on standard formula
  // Nominal Weight = Density * C * W^2 * L
  // C = 0.0057 chosen so 14k Gold 8mm 8" scales to ~39.5 grams (35-44g range)
  const calculateFormulaWeight = (): number => {
    const density = getDensity();
    const styleMult = getStyleMultiplier();
    const baseC = 0.0057;
    const wt = density * baseC * Math.pow(width, 2) * length * styleMult;
    return parseFloat(wt.toFixed(1));
  };

  const weightNominal = calculateFormulaWeight();
  // +/- 10g or 10% range tolerance matching custom request (including the clasp and lock box weight spread)
  const weightMin = parseFloat(Math.max(1, weightNominal - 10).toFixed(1));
  const weightMax = parseFloat((weightNominal + 10).toFixed(1));

  // 2. Metal cost per gram
  const getMetalCostPerGram = (): number => {
    if (material === 'gold') {
      return (spotPrices.gold / TROY_ONCE_GRAMS) * (goldKarat / 24);
    } else if (material === 'silver') {
      return (spotPrices.silver / TROY_ONCE_GRAMS) * silverPurity;
    } else {
      return (spotPrices.platinum / TROY_ONCE_GRAMS) * platinumPurity;
    }
  };

  const metalCostPerGram = getMetalCostPerGram();
  const metalCostNominal = weightNominal * metalCostPerGram;

  // 3. Labor cost
  const calculatedLabor = laborType === 'perGram' ? weightNominal * laborRate : laborRate;

  // 4. Combined pricing range
  const totalCostNominal = metalCostNominal + calculatedLabor;
  const totalCostMin = (weightMin * metalCostPerGram) + (laborType === 'perGram' ? weightMin * laborRate : laborRate);
  const totalCostMax = (weightMax * metalCostPerGram) + (laborType === 'perGram' ? weightMax * laborRate : laborRate);

  // Handle saving estimate
  const handleSaveEstimate = () => {
    if (!customerName.trim()) {
      alert("Please enter a Customer or Job Name before logging this estimate.");
      return;
    }

    const finalKarat = material === 'gold' ? goldKarat : (material === 'silver' ? Math.round(silverPurity * 1000) : Math.round(platinumPurity * 1000));
    const finalColor = material === 'gold' ? metalColor : (material === 'silver' ? (silverFinish as any) : (platinumFinish as any));

    const newEst: CubanEstimate = {
      id: Math.random().toString(36).substring(2, 11),
      customerName: customerName.trim(),
      material,
      goldKarat: finalKarat,
      metalColor: finalColor,
      width,
      length,
      style: linkStyle,
      weightNominal,
      weightMin,
      weightMax,
      laborType,
      laborRate,
      metalCost: parseFloat(metalCostNominal.toFixed(2)),
      laborCost: parseFloat(calculatedLabor.toFixed(2)),
      totalCostMin: parseFloat(totalCostMin.toFixed(2)),
      totalCostMax: parseFloat(totalCostMax.toFixed(2)),
      timestamp: new Date().toLocaleDateString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    const updated = [newEst, ...estimates];
    saveEstimatesToStorage(updated);
    setCustomerName('');
    alert("Handmade Cuban estimate logged successfully to local session ledger!");
  };

  // Handle deletion
  const handleDeleteEstimate = (id: string) => {
    const updated = estimates.filter(e => e.id !== id);
    saveEstimatesToStorage(updated);
  };

  // Material Colors
  const getColors = () => {
    if (material === 'silver') {
      const purityPercent = (silverPurity * 100).toFixed(1);
      switch (silverFinish) {
        case 'Oxidized':
          return {
            stop1: '#374151',
            stop2: '#4b5563',
            stop3: '#111827',
            stroke: '#030712',
            text: `${purityPercent}% Silver (Oxidized)`
          };
        case 'Rhodium':
          return {
            stop1: '#f3f4f6',
            stop2: '#ffffff',
            stop3: '#d1d5db',
            stroke: '#6b7280',
            text: `${purityPercent}% Silver (Rhodium Plated)`
          };
        case 'Polished':
        default:
          return {
            stop1: '#e5e7eb',
            stop2: '#f9fafb',
            stop3: '#9ca3af',
            stroke: '#4b5563',
            text: `${purityPercent}% Silver (Polished)`
          };
      }
    } else if (material === 'platinum') {
      const purityPercent = (platinumPurity * 100).toFixed(1);
      switch (platinumFinish) {
        case 'Satin':
          return {
            stop1: '#a1a1aa',
            stop2: '#e4e4e7',
            stop3: '#71717a',
            stroke: '#52525b',
            text: `Pt${Math.round(platinumPurity * 1000)} Platinum (Satin)`
          };
        case 'Sandblasted':
          return {
            stop1: '#cbd5e1',
            stop2: '#e2e8f0',
            stop3: '#94a3b8',
            stroke: '#475569',
            text: `Pt${Math.round(platinumPurity * 1000)} Platinum (Matte)`
          };
        case 'Polished':
        default:
          return {
            stop1: '#d1d5db',
            stop2: '#ffffff',
            stop3: '#9ca3af',
            stroke: '#374151',
            text: `Pt${Math.round(platinumPurity * 1000)} Platinum (Polished)`
          };
      }
    } else {
      // Gold karats
      switch (metalColor) {
        case 'Rose':
          return {
            stop1: '#f8a5c2',
            stop2: '#fad390',
            stop3: '#e15f41',
            stroke: '#b53f2c',
            text: `${goldKarat}K Rose Gold`
          };
        case 'White':
          return {
            stop1: '#ecefe6',
            stop2: '#ffffff',
            stop3: '#bdc3c7',
            stroke: '#7f8c8d',
            text: `${goldKarat}K White Gold`
          };
        case 'Yellow':
        default:
          return {
            stop1: '#E5A91A',
            stop2: '#F9E076',
            stop3: '#C59110',
            stroke: '#8a6508',
            text: `${goldKarat}K Yellow Gold`
          };
      }
    }
  };

  const profileColors = getColors();
  const isBlueprint = simViewMode === 'blueprint';

  // SVG Drawing Metrics
  // The drawn link width is based on the mm width slider.
  const linkBaseWidth = 45 + (width * 1.5); // pixels
  const linkBaseHeight = linkBaseWidth * 0.65; // classic oval ratio

  // Render a number of links based on length. More length = more links.
  const numLinksToRender = Math.max(8, Math.min(24, Math.floor(length * 0.95) + 2));



  return (
    <div className="p-4 md:p-8 bg-white rounded-b-2xl rounded-tr-2xl shadow-lg border border-brand-100 space-y-8 animate-fadeIn" id="cuban-builder-root">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-brand-100 pb-5">
        <div>
          <h2 className="text-xl font-black text-brand-900 flex items-center gap-2 font-sans tracking-tight">
            <Sparkles className="text-brand-gold animate-pulse shrink-0" size={22} />
            Handmade Cubans Studio
          </h2>
          <p className="text-[11px] text-brand-500 font-bold uppercase tracking-wider font-mono">
            Scale-accurate interlocking simulator & dynamic labor pricing desk
          </p>
        </div>

        {/* Spot indices summary */}
        <div className="flex flex-wrap gap-2 text-[10px] font-mono font-bold text-brand-600 bg-brand-50/70 p-2.5 rounded-xl border border-brand-100">
          <div>Au: <span className="text-brand-900 font-black">${spotPrices.gold}/oz</span></div>
          <div className="w-[1px] bg-brand-200 self-stretch my-0.5"></div>
          <div>Ag: <span className="text-brand-900 font-black">${spotPrices.silver}/oz</span></div>
          <div className="w-[1px] bg-brand-200 self-stretch my-0.5"></div>
          <div>Pt: <span className="text-brand-900 font-black">${spotPrices.platinum}/oz</span></div>
        </div>
      </div>

      {/* 2. Interactive Simulator Workspace (Split Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Area: Live Simulator and Sliders */}
        <div className="md:col-span-1 lg:col-span-7 flex flex-col space-y-5">
          
          {/* Simulator Box Header */}
          <div className="flex justify-between items-center bg-brand-50/50 p-2.5 rounded-2xl border border-brand-100">
            <div className="flex items-center gap-1.5 pl-1">
              <Layers size={14} className="text-brand-900" />
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-900 font-mono">Interlocking View</span>
            </div>
            
            <div className="flex bg-brand-100/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSimViewMode('realistic')}
                className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${
                  simViewMode === 'realistic'
                    ? 'bg-brand-900 text-brand-gold shadow-sm'
                    : 'text-brand-600 hover:text-brand-800'
                }`}
              >
                Realistic Render
              </button>
              <button
                type="button"
                onClick={() => setSimViewMode('blueprint')}
                className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${
                  simViewMode === 'blueprint'
                    ? 'bg-brand-900 text-brand-gold shadow-sm'
                    : 'text-brand-600 hover:text-brand-800'
                }`}
              >
                CAD Blueprint
              </button>
            </div>
          </div>

          {/* SVG Canvas Container */}
          <div className={`relative rounded-3xl border flex flex-col overflow-hidden h-[220px] shadow-inner transition-colors duration-300 ${
            isBlueprint ? 'bg-[#0b1a2d] border-[#1b3a5d]' : 'bg-[#070b12] border-brand-900/10'
          }`}>
            <svg className="w-full flex-1 min-h-0" viewBox="0 0 450 185">
              <defs>
                {/* Metal Gradient */}
                <linearGradient id="cubanMetalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={profileColors.stop1} />
                  <stop offset="30%" stopColor={profileColors.stop2} />
                  <stop offset="60%" stopColor={profileColors.stop1} />
                  <stop offset="100%" stopColor={profileColors.stop3} />
                </linearGradient>

                {/* Trademark Diamond-Cut Face Facet Highlight */}
                <linearGradient id="diamondCutGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={profileColors.stop2} />
                  <stop offset="35%" stopColor="#ffffff" />
                  <stop offset="70%" stopColor={profileColors.stop1} />
                  <stop offset="100%" stopColor={profileColors.stop3} />
                </linearGradient>

                {/* Blueprint Infill */}
                <pattern id="blueprintGridCuban" width="22" height="22" patternUnits="userSpaceOnUse">
                  <path d="M 22 0 L 0 0 0 22" fill="none" stroke="rgba(34, 211, 238, 0.05)" strokeWidth="1" />
                </pattern>
              </defs>

              {/* Blueprint Grid Overlay */}
              {isBlueprint && (
                <rect width="450" height="185" fill="url(#blueprintGridCuban)" />
              )}

              {/* Outer grid boundary lines */}
              {isBlueprint && (
                <g opacity="0.3">
                  <line x1="20" y1="10" x2="430" y2="10" stroke="#22d3ee" strokeWidth="0.5" strokeDasharray="5,5" />
                  <line x1="20" y1="175" x2="430" y2="175" stroke="#22d3ee" strokeWidth="0.5" strokeDasharray="5,5" />
                  <line x1="20" y1="10" x2="20" y2="175" stroke="#22d3ee" strokeWidth="0.5" strokeDasharray="5,5" />
                  <line x1="430" y1="10" x2="430" y2="175" stroke="#22d3ee" strokeWidth="0.5" strokeDasharray="5,5" />
                </g>
              )}

              {/* Highly Improved Hyper-Realistic Curb link Rendering - Pass 1: Back loops */}
              <g className="transition-all duration-300">
                {Array.from({ length: numLinksToRender }).map((_, idx) => {
                  const spacing = linkBaseWidth * 0.28;
                  const startX = 225 - ((numLinksToRender - 1) * spacing) / 2;
                  const x = startX + idx * spacing;
                  const y = 50;

                  const W = linkBaseWidth;
                  const H = linkBaseHeight;

                  const rx_out = W * 0.42;
                  const ry_out = H * 0.45;
                  const rx_in = W * 0.22;
                  const ry_in = H * 0.25;

                  return (
                    <g key={`back-${idx}`} transform={`translate(${x}, ${y}) rotate(-25)`}>
                      {/* Underlying rear-loop wire: perfectly smooth solid semi-ellipse */}
                      <path
                        d={`M 0, -${ry_out}
                            A ${rx_out} ${ry_out} 0 0 0 0, ${ry_out}
                            L 0, ${ry_in}
                            A ${rx_in} ${ry_in} 0 0 1 0, -${ry_in}
                            Z`}
                        fill={isBlueprint ? 'rgba(34, 211, 238, 0.12)' : profileColors.stroke}
                        stroke={isBlueprint ? 'rgba(34, 211, 238, 0.4)' : profileColors.stroke}
                        strokeWidth="1.1"
                        opacity={0.85}
                      />
                    </g>
                  );
                })}
              </g>

              {/* Highly Improved Hyper-Realistic Curb link Rendering - Pass 2: Front Overlapping Faces */}
              <g className="transition-all duration-300">
                {Array.from({ length: numLinksToRender }).map((_, idx) => {
                  const spacing = linkBaseWidth * 0.28;
                  const startX = 225 - ((numLinksToRender - 1) * spacing) / 2;
                  const x = startX + idx * spacing;
                  const y = 50;

                  const W = linkBaseWidth;
                  const H = linkBaseHeight;

                  const rx_out = W * 0.42;
                  const ry_out = H * 0.45;
                  const rx_in = W * 0.22;
                  const ry_in = H * 0.25;
                  const rx_mid = (rx_out + rx_in) / 2;
                  const ry_mid = (ry_out + ry_in) / 2;

                  return (
                    <g key={`front-${idx}`} transform={`translate(${x}, ${y}) rotate(-25)`}>
                      {/* Deep overlapping shadow cast from the previous link to create profound 3D depth */}
                      {!isBlueprint && (
                        <path
                          d={`M -${rx_out}, 0 A ${rx_out} ${ry_out} 0 0 1 0, ${ry_out}`}
                          fill="none"
                          stroke="rgba(0,0,0,0.65)"
                          strokeWidth={ry_out * 0.3}
                          filter="blur(3.5px)"
                        />
                      )}

                      {/* Drop shadow on background to ground the chain */}
                      {!isBlueprint && (
                        <path
                          d={`M -${rx_out}, ${ry_out * 0.5} A ${rx_out} ${ry_out} 0 0 0 ${rx_out}, ${ry_out * 0.5}`}
                          fill="none"
                          stroke="rgba(0,0,0,0.4)"
                          strokeWidth={width * 0.3 + 4}
                          filter="blur(4px)"
                        />
                      )}

                      {/* Main front rounded wire body: perfectly smooth solid semi-ellipse */}
                      <path
                        d={`M 0, -${ry_out}
                            A ${rx_out} ${ry_out} 0 0 1 0, ${ry_out}
                            L 0, ${ry_in}
                            A ${rx_in} ${ry_in} 0 0 0 0, -${ry_in}
                            Z`}
                        fill={isBlueprint ? 'rgba(34, 211, 238, 0.2)' : 'url(#cubanMetalGrad)'}
                        stroke={isBlueprint ? '#22d3ee' : profileColors.stroke}
                        strokeWidth={isBlueprint ? '1.5' : '1.1'}
                      />

                      {/* Signature Curb Link Wide Diamond-Cut Facet */}
                      {!isBlueprint && (
                        <path
                          d={`M 0, -${ry_out * 0.9}
                              A ${rx_out * 0.9} ${ry_out * 0.9} 0 0 1 0, ${ry_out * 0.9}
                              L 0, ${ry_in * 1.35}
                              A ${rx_in * 1.35} ${ry_in * 1.35} 0 0 0 0, -${ry_in * 1.35}
                              Z`}
                          fill="url(#diamondCutGrad)"
                          stroke="rgba(0,0,0,0.15)"
                          strokeWidth="0.5"
                        />
                      )}

                      {/* Sharp specular highlight on the cut edge */}
                      {!isBlueprint && (
                        <path
                          d={`M 0, -${ry_out * 0.9} A ${rx_out * 0.9} ${ry_out * 0.9} 0 0 1 0, ${ry_out * 0.9}`}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="1.2"
                          opacity={0.8}
                        />
                      )}

                      {/* Beautiful continuous specular reflection highlight along the curve */}
                      {!isBlueprint && (
                        <path
                          d={`M 0, -${ry_mid} A ${rx_mid} ${ry_mid} 0 0 1 0, ${ry_mid}`}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth={ry_out * 0.08}
                          strokeLinecap="round"
                          opacity={0.5}
                        />
                      )}

                      {/* Secondary high-reflective mirror sheen along top outer curve */}
                      {!isBlueprint && (
                        <path
                          d={`M 0, -${ry_out - 1.2} A ${rx_out - 1.2} ${ry_out - 1.2} 0 0 1 ${rx_out * 0.5}, -${ry_out * 0.7}`}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          opacity={0.65}
                        />
                      )}

                      {/* Small Center Joint pin in Blueprint mode */}
                      {isBlueprint && (
                        <circle cx="0" cy="0" r="2.5" fill="#e11d48" />
                      )}
                    </g>
                  );
                })}
              </g>

              {/* Sub-group: Cross section of filed link (Bottom area) */}
              <g transform="translate(225, 125)" className="transition-all duration-300">
                {isBlueprint && (
                  <g opacity="0.3">
                    <line x1="-120" y1="0" x2="120" y2="0" stroke="#22d3ee" strokeWidth="0.5" strokeDasharray="3,3" />
                  </g>
                )}

                {/* Drawn cross-section representing a perfectly smooth rounded oval profile with no hard corners */}
                <ellipse
                  cx="0"
                  cy="0"
                  rx={58}
                  ry={24}
                  transform={`scale(${0.35 + width * 0.045})`}
                  fill={isBlueprint ? 'rgba(34, 211, 238, 0.15)' : 'url(#cubanMetalGrad)'}
                  stroke={isBlueprint ? '#22d3ee' : profileColors.stroke}
                  strokeWidth={isBlueprint ? '2' : '1.5'}
                />

                {/* Blueprint Dimension Arrow: Width indicator */}
                <g transform="translate(0, 32)">
                  <line x1="-70" y1="0" x2="70" y2="0" stroke={isBlueprint ? '#22d3ee' : '#94a3b8'} strokeWidth="1" />
                  <polygon points="-70,0 -64,-3 -64,3" fill={isBlueprint ? '#22d3ee' : '#94a3b8'} />
                  <polygon points="70,0 64,-3 64,3" fill={isBlueprint ? '#22d3ee' : '#94a3b8'} />
                  
                  <rect x="-35" y="-8" width="70" height="15" fill={isBlueprint ? '#0b1a2d' : '#ffffff'} rx="4" />
                  <text x="0" y="3" textAnchor="middle" className={`text-[10px] font-black font-mono ${isBlueprint ? 'fill-cyan-400' : 'fill-brand-700'}`}>
                    {width.toFixed(1)} mm
                  </text>
                </g>

                {/* Subtitle / Center line */}
                <text x="0" y="-18" textAnchor="middle" className={`text-[8px] font-bold font-mono uppercase tracking-widest ${isBlueprint ? 'fill-cyan-400/60' : 'fill-brand-400'}`}>
                  Smooth Rounded Oval Cross-Section (Wire Thickness: {(width * 0.35).toFixed(1)}mm)
                </text>
              </g>

              {/* Title tag overlay */}
              <text x="15" y="20" className={`text-[9px] font-black font-mono uppercase tracking-widest ${isBlueprint ? 'fill-cyan-400/70' : 'fill-brand-500'}`}>
                {profileColors.text} • Premium Solder Solid
              </text>
            </svg>

            {/* Bottom metadata banner inside simulator */}
            <div className="w-full bg-brand-900/95 border-t border-brand-800/60 px-4 py-2.5 flex justify-between items-center text-[10px] text-brand-100 font-mono">
              <div>Type: <span className="text-brand-gold font-bold font-sans text-xs">{length > 11 ? 'Neck Chain' : 'Handmade Bracelet'}</span></div>
              <div>Length: <span className="text-brand-gold font-bold font-sans text-xs">{length.toFixed(2)}"</span></div>
              <div>Estimated Links: <span className="text-brand-gold font-bold font-sans text-xs">{Math.round(length * 3.4)} Links</span></div>
              <div className="hidden sm:block">Gold Density: <span className="text-brand-gold font-bold font-sans text-xs">{getDensity().toFixed(2)} g/cm³</span></div>
            </div>
          </div>

          {/* Sliders Area (Length extended up to 26 inches!) */}
          <div className="bg-brand-50/50 p-5 rounded-2xl border border-brand-100 space-y-5">
            {/* Width Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-brand-700 uppercase tracking-wider">Link Width (mm)</span>
                <span className="text-brand-900 font-mono font-black bg-white px-2 py-0.5 rounded-lg border border-brand-100">
                  {width.toFixed(1)} mm
                </span>
              </div>
              <input
                type="range"
                min="4.0"
                max="24.0"
                step="0.5"
                value={width}
                onChange={(e) => setWidth(parseFloat(e.target.value))}
                className="w-full accent-brand-900 cursor-pointer h-1.5 bg-brand-200/60 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[8px] text-brand-400 font-black font-mono">
                <span>4.0mm (Sleek)</span>
                <span>8.0mm (Classic Men's)</span>
                <span>24.0mm (Chunky Heavyweight)</span>
              </div>
            </div>

            {/* Length Slider - Extended up to 26" as requested */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-brand-700 uppercase tracking-wider">Chain / Bracelet Length (Inches)</span>
                <span className="text-brand-900 font-mono font-black bg-white px-2 py-0.5 rounded-lg border border-brand-100">
                  {length.toFixed(2)}"
                </span>
              </div>
              <input
                type="range"
                min="6.0"
                max="26.0"
                step="0.25"
                value={length}
                onChange={(e) => setLength(parseFloat(e.target.value))}
                className="w-full accent-brand-900 cursor-pointer h-1.5 bg-brand-200/60 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[8px] text-brand-400 font-black font-mono">
                <span>6.0" (Small Wrist)</span>
                <span>8.5" (Standard Men's)</span>
                <span>16.0" (Choker)</span>
                <span>20.0" (Standard Chain)</span>
                <span>26.0" (Long Chain)</span>
              </div>
            </div>
          </div>

          {/* Weights & Tolerances Card with Store Comparison */}
          <div className="bg-brand-900 text-white p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Weight className="text-brand-gold shrink-0 animate-pulse" size={20} />
              <div>
                <h4 className="text-sm font-black text-brand-gold font-sans uppercase tracking-wider">Weight Analyzer Desk</h4>
                <p className="text-[9px] text-brand-300 font-bold uppercase tracking-wider font-mono">Industry-wide luxury manufacturer tolerances (+/- 10g or 10% average deviation)</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-white/5 p-4 rounded-xl border border-white/10 text-center">
              <div className="space-y-1">
                <span className="text-[8px] text-brand-300 font-black uppercase block tracking-wider">Low-End Est (-10g)</span>
                <div className="text-lg font-black text-white font-mono">{weightMin}g</div>
                <span className="text-[7px] text-brand-400 block font-bold leading-tight">Light box clasp</span>
              </div>
              <div className="space-y-1 border-x border-white/10">
                <span className="text-[8px] text-brand-gold font-black uppercase block tracking-wider">Nominal Target</span>
                <div className="text-xl font-black text-brand-gold font-mono">{weightNominal}g</div>
                <span className="text-[7px] text-brand-200 block font-bold leading-tight">Calculated solid density</span>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] text-brand-300 font-black uppercase block tracking-wider">High-End Est (+10g)</span>
                <div className="text-lg font-black text-white font-mono">{weightMax}g</div>
                <span className="text-[7px] text-brand-400 block font-bold leading-tight">Heavy lock box / thick links</span>
              </div>
            </div>

            <p className="text-[10px] text-brand-100 font-medium leading-relaxed bg-black/20 p-2.5 rounded-lg border border-white/5">
              💡 <span className="font-bold text-brand-gold">Brand Comparison:</span> At <span className="font-bold text-white">{width}mm</span> width and <span className="font-bold text-white">{length}"</span> length, high-end jewelers specify that their solid handmade Cubans typically weigh in the range of <span className="font-bold text-brand-gold">{weightMin} to {weightMax} grams</span> depending on deep filing, clasp style, and corner-buffing.
            </p>
          </div>

        </div>

        {/* Right Area: Control panel, STL 3D Analyzer & Pricing calculator */}
        <div className="md:col-span-1 lg:col-span-5 flex flex-col space-y-5">


          {/* Material & Style Configuration Box */}
          <div className="bg-white rounded-2xl border border-brand-100 p-4 space-y-4 shadow-sm">
            <h3 className="text-xs font-black text-brand-900 uppercase tracking-widest border-b border-brand-50 pb-2 flex items-center gap-1">
              <Hammer size={12} className="text-brand-900" /> Material & Purity Selection
            </h3>

            {/* Material selector buttons */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-brand-400 uppercase tracking-wider block">Precious Metal Base</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['gold', 'silver', 'platinum'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMaterial(m);
                      if (m === 'silver') setGoldKarat(14); // unused but reset
                    }}
                    className={`py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all ${
                      material === m 
                        ? 'bg-brand-900 text-brand-gold border-brand-900 shadow-sm' 
                        : 'bg-white text-brand-600 border-brand-100 hover:border-brand-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Gold Purity Dropdown & Colors */}
            {material === 'gold' && (
              <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-brand-400 uppercase tracking-wider block">Gold Karat</label>
                  <select
                    className="w-full bg-white border border-brand-200 p-2.5 rounded-xl text-xs font-bold"
                    value={goldKarat}
                    onChange={(e) => setGoldKarat(parseInt(e.target.value))}
                  >
                    {goldKarats.map((k) => (
                      <option key={k} value={k}>{k}K Gold ({((k/24)*100).toFixed(0)}% Pure)</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-brand-400 uppercase tracking-wider block">Metal Color</label>
                  <div className="flex gap-2 pt-1.5">
                    {(['Yellow', 'White', 'Rose'] as const).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setMetalColor(color)}
                        className={`w-7 h-7 rounded-full border-2 relative transition-transform ${
                          metalColor === color ? 'border-brand-900 scale-110' : 'border-transparent'
                        }`}
                        title={`${color} Gold`}
                      >
                        <span 
                          className={`absolute inset-0.5 rounded-full ${
                            color === 'Rose' ? 'bg-[#f39c12]/70 bg-gradient-to-br from-[#fad390] to-[#e15f41]' :
                            color === 'White' ? 'bg-[#9ca3af]/40 bg-gradient-to-br from-[#ecefe6] to-[#bdc3c7]' :
                            'bg-[#E5A91A] bg-gradient-to-br from-[#F9E076] to-[#C59110]'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Silver Purity Dropdown & Finishes */}
            {material === 'silver' && (
              <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-brand-400 uppercase tracking-wider block">Silver Alloy Purity</label>
                  <select
                    className="w-full bg-white border border-brand-200 p-2.5 rounded-xl text-xs font-bold"
                    value={silverPurity}
                    onChange={(e) => setSilverPurity(parseFloat(e.target.value))}
                  >
                    <option value="0.925">Sterling Silver (.925)</option>
                    <option value="0.958">Britannia Silver (.958)</option>
                    <option value="0.999">Fine Silver (.999)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-brand-400 uppercase tracking-wider block">Silver Finish</label>
                  <div className="flex gap-2 pt-1.5">
                    {(['Polished', 'Oxidized', 'Rhodium'] as const).map((finish) => (
                      <button
                        key={finish}
                        type="button"
                        onClick={() => setSilverFinish(finish)}
                        className={`w-7 h-7 rounded-full border-2 relative transition-transform ${
                          silverFinish === finish ? 'border-brand-900 scale-110' : 'border-transparent'
                        }`}
                        title={`${finish} Silver`}
                      >
                        <span 
                          className={`absolute inset-0.5 rounded-full ${
                            finish === 'Oxidized' ? 'bg-gradient-to-br from-[#374151] to-[#111827]' :
                            finish === 'Rhodium' ? 'bg-gradient-to-br from-[#f3f4f6] to-[#d1d5db]' :
                            'bg-gradient-to-br from-[#e5e7eb] to-[#9ca3af]'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Platinum Purity Dropdown & Finishes */}
            {material === 'platinum' && (
              <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-brand-400 uppercase tracking-wider block">Platinum Purity</label>
                  <select
                    className="w-full bg-white border border-brand-200 p-2.5 rounded-xl text-xs font-bold"
                    value={platinumPurity}
                    onChange={(e) => setPlatinumPurity(parseFloat(e.target.value))}
                  >
                    <option value="0.950">Platinum Pt950 (95%)</option>
                    <option value="0.900">Platinum Pt900 (90%)</option>
                    <option value="0.999">Fine Platinum Pt999</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-brand-400 uppercase tracking-wider block">Platinum Finish</label>
                  <div className="flex gap-2 pt-1.5">
                    {(['Polished', 'Satin', 'Sandblasted'] as const).map((finish) => (
                      <button
                        key={finish}
                        type="button"
                        onClick={() => setPlatinumFinish(finish)}
                        className={`w-7 h-7 rounded-full border-2 relative transition-transform ${
                          platinumFinish === finish ? 'border-brand-900 scale-110' : 'border-transparent'
                        }`}
                        title={`${finish} Platinum`}
                      >
                        <span 
                          className={`absolute inset-0.5 rounded-full ${
                            finish === 'Satin' ? 'bg-gradient-to-br from-[#a1a1aa] to-[#71717a]' :
                            finish === 'Sandblasted' ? 'bg-gradient-to-br from-[#cbd5e1] to-[#94a3b8]' :
                            'bg-gradient-to-br from-[#d1d5db] to-[#9ca3af]'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Pricing Desk & Labor Input */}
          <div className="bg-white rounded-2xl border border-brand-100 p-4 space-y-4 shadow-sm">
            <h3 className="text-xs font-black text-brand-900 uppercase tracking-widest border-b border-brand-50 pb-2 flex items-center gap-1">
              <DollarSign size={12} className="text-brand-900" /> Pricing Desk & Solder Labor
            </h3>

            {/* Labor rate configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-brand-400 uppercase tracking-wider block">Labor Setup Type</label>
                <div className="flex bg-brand-50 p-1 rounded-xl border border-brand-100">
                  <button
                    type="button"
                    onClick={() => { setLaborType('perGram'); if (laborRate === 250) setLaborRate(12); }}
                    className={`flex-1 text-[9px] font-black uppercase py-1.5 rounded-lg transition-all ${
                      laborType === 'perGram' ? 'bg-white text-brand-900 shadow-sm' : 'text-brand-500 hover:text-brand-700'
                    }`}
                  >
                    Per Gram labor
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLaborType('flat'); if (laborRate === 12) setLaborRate(250); }}
                    className={`flex-1 text-[9px] font-black uppercase py-1.5 rounded-lg transition-all ${
                      laborType === 'flat' ? 'bg-white text-brand-900 shadow-sm' : 'text-brand-500 hover:text-brand-700'
                    }`}
                  >
                    Flat Rate labor
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-brand-400 uppercase tracking-wider block">
                  {laborType === 'perGram' ? 'Labor Fee (CAD/g)' : 'Flat Labor Fee (CAD)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step={laborType === 'perGram' ? '0.5' : '10'}
                  className="w-full bg-white border border-brand-200 p-2 rounded-xl text-xs font-bold"
                  value={laborRate}
                  onChange={(e) => setLaborRate(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Bill of materials dynamic layout */}
            <div className="bg-brand-50/50 p-3 rounded-xl border border-brand-100/70 font-mono text-[10px] space-y-2">
              <div className="flex justify-between border-b border-brand-100 pb-1.5 font-bold text-brand-700">
                <span>LINE ITEM BREAKDOWN</span>
                <span>CAD RATE / CALCULATION</span>
              </div>
              
              <div className="flex justify-between text-brand-600">
                <span>Raw metal rate per gram:</span>
                <span className="font-bold text-brand-900">${metalCostPerGram.toFixed(2)}/g</span>
              </div>

              <div className="flex justify-between text-brand-600">
                <span>Calculated physical weight:</span>
                <span className="font-bold text-brand-900">{weightNominal} grams</span>
              </div>

              <div className="flex justify-between text-brand-600">
                <span>Estimated metal cost:</span>
                <span className="font-bold text-brand-900">${metalCostNominal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between text-brand-600">
                <span>Estimated hand labor:</span>
                <span className="font-bold text-brand-900">${calculatedLabor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className="h-[1px] bg-brand-200 my-2"></div>

              <div className="flex justify-between items-center pt-1">
                <div>
                  <span className="text-[8px] font-black text-brand-500 uppercase block tracking-wider leading-none">Grand Total Price Range</span>
                  <span className="text-xs font-sans text-brand-400 font-bold">Based on weight tolerance spread</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-brand-900 font-mono">
                    ${totalCostMin.toLocaleString('en-US', { maximumFractionDigits: 0 })} - ${totalCostMax.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[8px] text-brand-400 block font-bold tracking-tight">Average Cost: ${totalCostNominal.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Log to Ledger Box */}
          <div className="bg-white rounded-2xl border border-brand-100 p-4 space-y-4 shadow-sm">
            <h3 className="text-xs font-black text-brand-900 uppercase tracking-widest border-b border-brand-50 pb-2 flex items-center gap-1">
              <Plus size={12} className="text-brand-900" /> Save Cuban Link Estimate to Ledger
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Customer Name or Job ID (e.g. John S. - 10mm Chain)"
                className="flex-1 bg-brand-50/50 border border-brand-100 p-2.5 rounded-xl text-xs font-bold focus:bg-white focus:ring-1 focus:ring-brand-900 focus:outline-none transition-all"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSaveEstimate}
                className="bg-brand-900 text-brand-gold hover:bg-brand-800 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all shrink-0 shadow-sm"
              >
                Log Build
              </button>
            </div>

            {/* List of saved Cuban estimates */}
            {estimates.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-[9px] font-bold text-brand-400 uppercase tracking-wider block">Logged Cuban Builds ({estimates.length})</div>
                <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 divide-y divide-brand-100">
                  {estimates.map((e) => (
                    <div key={e.id} className="pt-2 flex justify-between items-start text-[10px]">
                      <div className="space-y-0.5">
                        <div className="font-black text-brand-900">{e.customerName}</div>
                        <div className="text-brand-500 font-medium">
                          {e.width}mm x {e.length}" • {e.material === 'gold' ? `${e.goldKarat}K ${e.metalColor}` : e.material.toUpperCase()}
                        </div>
                        <div className="text-brand-400 font-bold font-mono text-[9px] flex gap-2">
                          <span>{e.weightNominal}g (nominal)</span>
                          <span>{e.timestamp}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-right font-mono">
                          <span className="font-black text-brand-900 block">${e.totalCostMin.toLocaleString('en-US', { maximumFractionDigits: 0 })} - ${e.totalCostMax.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                          <span className="text-[8px] text-brand-400 block font-bold leading-none">Labor: ${e.laborCost}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteEstimate(e.id)}
                          className="p-1 hover:bg-red-50 text-brand-400 hover:text-red-500 rounded-lg transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
