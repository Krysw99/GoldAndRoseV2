/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Camera, Compass, Type, Tag, HelpCircle, 
  Signature, CheckCircle, Calculator, Sparkles, AlertCircle, FileText,
  Gem, UserCheck, User, Lock, Unlock
} from 'lucide-react';
import { 
  QuoteSession, JewelryItem, MeleeItem, FancyItem, ClientStoneItem, 
  AddonItem, DesignNote, AppSettings, CategoryType, MaterialType, MetalColorType, StoneSourceType,
  ScrapTransaction
} from '../types';
import { 
  CENTER_SHAPES, FANCY_SHAPES, ROUND_MELEE, SETTING_STYLES, PURITY_OPTIONS 
} from '../constants';
import { 
  getEmptyRing, getTennisEstimates, calculateBandWeight, 
  calculateRingCost, calculateRawCost, hasRingData 
} from '../utils';
import SignaturePad from './SignaturePad';

const PROFILE_SHAPES = [
  { id: 'Flat', name: 'Flat / Pipe', factor: '1.00', desc: 'Flat top & flat inside', path: 'M 10 45 L 70 45 L 70 25 L 10 25 Z' },
  { id: 'Dome', name: 'Traditional Dome', factor: '0.75', desc: 'Low dome top', path: 'M 10 45 C 20 23, 60 23, 70 45 Z' },
  { id: 'HalfRound', name: 'Half Round', factor: '0.70', desc: 'High curved dome', path: 'M 15 45 C 25 15, 55 15, 65 45 Z' },
  { id: 'Comfort', name: 'Comfort Fit', factor: '0.85', desc: 'Rounded top & inner', path: 'M 10 42 C 20 22, 60 22, 70 42 C 60 46, 20 46, 10 42 Z' },
  { id: 'Beveled', name: 'Beveled Edge', factor: '0.90', desc: 'Chamfered corners', path: 'M 10 45 L 70 45 L 70 35 L 60 25 L 20 25 L 10 35 Z' },
  { id: 'KnifeEdge', name: 'Knife Edge', factor: '0.55', desc: 'Peaked triangular ridge', path: 'M 10 45 L 70 45 L 40 25 Z' },
  { id: 'Concave', name: 'Concave', factor: '0.80', desc: 'Inward curved top', path: 'M 10 45 L 70 45 L 70 25 C 55 35, 25 35, 10 25 Z' },
  { id: 'StepEdge', name: 'Stepped Edge', factor: '0.88', desc: 'Lowered step sides', path: 'M 10 45 L 70 45 L 70 35 L 60 35 L 60 25 L 20 25 L 20 35 L 10 35 Z' },
  { id: 'Inlay', name: 'Inlay Band', factor: '0.82', desc: 'Recessed center groove', path: 'M 10 45 L 70 45 L 70 25 L 52 25 L 52 33 L 28 33 L 28 25 L 10 25 Z', inlayPath: 'M 28 25 L 52 25 L 52 33 L 28 33 Z' }
];

const CAD_STYLES = [
  { id: 'ChannelSet', name: 'Channel Set', factor: '1.00', desc: 'Flush-set between protective rails' },
  { id: 'FrenchPave', name: 'French Pave', factor: '1.02', desc: 'Serrated V-cut prongs with lateral light openings' },
  { id: 'HoneycombPave', name: 'Honeycomb Pave', factor: '1.10', desc: 'Multi-row staggered pave for maximum brilliance' },
  { id: 'ProngBasket', name: 'Prong / Basket', factor: '0.98', desc: 'Classic individual prong settings with support baskets' },
  { id: 'SingleRowPave', name: 'Single Row Pave', factor: '1.04', desc: 'Delicate single-row diamond pave with micro-beads' },
  { id: 'UCutPave', name: 'U-Cut Pave', factor: '0.96', desc: 'Scalloped U-shaped side-cutouts for diamond exposure' },
  { id: 'ThreadGrain', name: 'Thread and Grain', factor: '1.05', desc: 'Grain-set stones nestled between thin raised milgrain threads' }
];

function renderCADThumbnail(styleId: string, isSelected: boolean = false) {
  const metalColor = isSelected ? "#f1c40f" : "#94a3b8"; // selected gold, unselected steel blue/silver
  const metalShade = isSelected ? "rgba(241, 196, 15, 0.12)" : "rgba(148, 163, 184, 0.04)";
  const strokeWidth = isSelected ? "1.2" : "0.8";
  
  const gemColor = "rgba(56, 189, 248, 0.15)";
  const gemStroke = "#38bdf8";
  const facetColor = "#a5f3fc";

  // Helper to draw grid background
  const drawGrid = () => (
    <g opacity="0.35">
      <rect x="0" y="0" width="120" height="40" fill="#090d16" />
      <line x1="0" y1="10" x2="120" y2="10" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="1,2" />
      <line x1="0" y1="20" x2="120" y2="20" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="1,2" />
      <line x1="0" y1="30" x2="120" y2="30" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="1,2" />
      <line x1="20" y1="0" x2="20" y2="40" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="1,2" />
      <line x1="40" y1="0" x2="40" y2="40" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="1,2" />
      <line x1="60" y1="0" x2="60" y2="40" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="1,2" />
      <line x1="80" y1="0" x2="80" y2="40" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="1,2" />
      <line x1="100" y1="0" x2="100" y2="40" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="1,2" />
    </g>
  );

  // Helper to draw a single sparkling round cut diamond in blueprint style
  const drawDiamond = (cx: number, cy: number, r: number) => {
    const s = r * 0.45;
    return (
      <g key={`${cx}-${cy}`} className="select-none pointer-events-none">
        <circle cx={cx} cy={cy} r={r} fill={gemColor} stroke={gemStroke} strokeWidth="0.8" />
        <polygon 
          points={`${cx-s},${cy-s*0.4} ${cx},${cy-s} ${cx+s},${cy-s*0.4} ${cx+s},${cy+s*0.4} ${cx},${cy+s} ${cx-s},${cy+s*0.4}`} 
          fill="none" 
          stroke={facetColor} 
          strokeWidth="0.4" 
        />
        <line x1={cx-r} y1={cy} x2={cx-s} y2={cy} stroke={facetColor} strokeWidth="0.3" />
        <line x1={cx+r} y1={cy} x2={cx+s} y2={cy} stroke={facetColor} strokeWidth="0.3" />
        <line x1={cx} y1={cy-r} x2={cx} y2={cy-s} stroke={facetColor} strokeWidth="0.3" />
        <line x1={cx} y1={cy+r} x2={cx} y2={cy+s} stroke={facetColor} strokeWidth="0.3" />
      </g>
    );
  };

  if (styleId === 'ChannelSet') {
    return (
      <svg width="100%" height="40" viewBox="0 0 120 40" className="mx-auto rounded">
        {drawGrid()}
        {/* Metal band backing */}
        <rect x="0" y="8" width="120" height="24" fill={metalShade} stroke={metalColor} strokeWidth={strokeWidth} />
        {/* Outer rails */}
        <line x1="0" y1="11" x2="120" y2="11" stroke={metalColor} strokeWidth="1" />
        <line x1="0" y1="29" x2="120" y2="29" stroke={metalColor} strokeWidth="1" />
        {/* Channel Background Recess */}
        <rect x="0" y="11" width="120" height="18" fill="#020617" opacity="0.6" />
        {/* Diamonds */}
        {[14, 37, 60, 83, 106].map(x => drawDiamond(x, 20, 7.5))}
      </svg>
    );
  } else if (styleId === 'FrenchPave') {
    return (
      <svg width="100%" height="40" viewBox="0 0 120 40" className="mx-auto rounded">
        {drawGrid()}
        {/* Gold metal base */}
        <rect x="0" y="8" width="120" height="24" fill={metalShade} stroke={metalColor} strokeWidth={strokeWidth} />
        {/* Side V-cuts (notched edges) */}
        {[14, 37, 60, 83, 106].map(x => (
          <g key={x}>
            <polygon points={`${x-6},8 ${x},12 ${x+6},8`} fill="#090d16" stroke={metalColor} strokeWidth="0.5" />
            <polygon points={`${x-6},32 ${x},28 ${x+6},32`} fill="#090d16" stroke={metalColor} strokeWidth="0.5" />
          </g>
        ))}
        {/* Diamonds */}
        {[14, 37, 60, 83, 106].map(x => drawDiamond(x, 20, 7.8))}
        {/* French pave split prongs (little triangle beads) */}
        {[14, 37, 60, 83, 106].map(x => (
          <g key={x}>
            <polygon points={`${x-3.2},13 ${x-1.2},11 ${x-2.2},14`} fill="none" stroke={metalColor} strokeWidth="0.4" />
            <polygon points={`${x+3.2},13 ${x+1.2},11 ${x+2.2},14`} fill="none" stroke={metalColor} strokeWidth="0.4" />
            <polygon points={`${x-3.2},27 ${x-1.2},29 ${x-2.2},26`} fill="none" stroke={metalColor} strokeWidth="0.4" />
            <polygon points={`${x+3.2},27 ${x+1.2},29 ${x+2.2},26`} fill="none" stroke={metalColor} strokeWidth="0.4" />
          </g>
        ))}
      </svg>
    );
  } else if (styleId === 'HoneycombPave') {
    return (
      <svg width="100%" height="40" viewBox="0 0 120 40" className="mx-auto rounded">
        {drawGrid()}
        {/* Metal base */}
        <rect x="0" y="4" width="120" height="32" fill={metalShade} stroke={metalColor} strokeWidth={strokeWidth} rx="2" />
        {/* Honeycomb lattice backdrop */}
        <path d="M 0,20 L 120,20 M 0,11 L 120,11 M 0,29 L 120,29" stroke={metalColor} strokeWidth="0.3" strokeDasharray="1,2" opacity="0.4" />
        {/* 3 rows of staggered diamonds */}
        {/* Middle row */}
        {[15, 37, 59, 81, 103].map(x => drawDiamond(x, 20, 4.5))}
        {/* Top row */}
        {[6, 26, 48, 70, 92, 114].map(x => drawDiamond(x, 11, 3.5))}
        {/* Bottom row */}
        {[6, 26, 48, 70, 92, 114].map(x => drawDiamond(x, 29, 3.5))}
        {/* Honeycomb tiny grain settings */}
        {[15, 37, 59, 81, 103].map(x => (
          <g key={x}>
            <circle cx={x-5} cy={15} r="0.8" fill="none" stroke={metalColor} strokeWidth="0.4" />
            <circle cx={x+5} cy={15} r="0.8" fill="none" stroke={metalColor} strokeWidth="0.4" />
            <circle cx={x-5} cy={25} r="0.8" fill="none" stroke={metalColor} strokeWidth="0.4" />
            <circle cx={x+5} cy={25} r="0.8" fill="none" stroke={metalColor} strokeWidth="0.4" />
          </g>
        ))}
      </svg>
    );
  } else if (styleId === 'ProngBasket') {
    return (
      <svg width="100%" height="40" viewBox="0 0 120 40" className="mx-auto rounded">
        {drawGrid()}
        {/* Inner gold wire shank */}
        <rect x="0" y="16" width="120" height="8" fill={metalShade} stroke={metalColor} strokeWidth="0.5" />
        {/* Individual basket rings */}
        {[14, 38, 62, 86, 110].map(x => (
          <g key={x}>
            {/* Basket base outline */}
            <circle cx={x} cy={20} r="8.5" fill="none" stroke={metalColor} strokeWidth="0.8" />
            {/* Diamond */}
            {drawDiamond(x, 20, 7.8)}
            {/* 4 corner prongs */}
            <circle cx={x-5.2} cy={14.8} r="1.3" fill="none" stroke={metalColor} strokeWidth="0.5" />
            <circle cx={x+5.2} cy={14.8} r="1.3" fill="none" stroke={metalColor} strokeWidth="0.5" />
            <circle cx={x-5.2} cy={25.2} r="1.3" fill="none" stroke={metalColor} strokeWidth="0.5" />
            <circle cx={x+5.2} cy={25.2} r="1.3" fill="none" stroke={metalColor} strokeWidth="0.5" />
          </g>
        ))}
      </svg>
    );
  } else if (styleId === 'SingleRowPave') {
    return (
      <svg width="100%" height="40" viewBox="0 0 120 40" className="mx-auto rounded">
        {drawGrid()}
        {/* Thin base band */}
        <rect x="0" y="10" width="120" height="20" fill={metalShade} stroke={metalColor} strokeWidth={strokeWidth} />
        {/* Diamonds */}
        {[14, 32, 50, 68, 86, 104].map(x => drawDiamond(x, 20, 6.2))}
        {/* Micro-beads on sides */}
        {[14, 32, 50, 68, 86, 104].map(x => (
          <g key={x}>
            <circle cx={x-3.5} cy={13.5} r="0.9" fill="none" stroke={metalColor} strokeWidth="0.4" />
            <circle cx={x+3.5} cy={13.5} r="0.9" fill="none" stroke={metalColor} strokeWidth="0.4" />
            <circle cx={x-3.5} cy={26.5} r="0.9" fill="none" stroke={metalColor} strokeWidth="0.4" />
            <circle cx={x+3.5} cy={26.5} r="0.9" fill="none" stroke={metalColor} strokeWidth="0.4" />
          </g>
        ))}
      </svg>
    );
  } else if (styleId === 'UCutPave') {
    return (
      <svg width="100%" height="40" viewBox="0 0 120 40" className="mx-auto rounded">
        {drawGrid()}
        {/* Scalloped top and bottom edges (U-notches) */}
        <path d="M 0,11 Q 11.5,4 23,11 Q 34.5,4 46,11 Q 57.5,4 69,11 Q 80.5,4 92,11 Q 103.5,4 115,11 L 120,11" fill="none" stroke={metalColor} strokeWidth={strokeWidth} />
        <path d="M 0,29 Q 11.5,36 23,29 Q 34.5,36 46,29 Q 57.5,36 69,29 Q 80.5,36 92,29 Q 103.5,36 115,29 L 120,29" fill="none" stroke={metalColor} strokeWidth={strokeWidth} />
        <rect x="0" y="11" width="120" height="18" fill={metalShade} />
        {/* Diamonds */}
        {[11.5, 34.5, 57.5, 80.5, 103.5].map(x => drawDiamond(x, 20, 8.2))}
        {/* Symmetrical U-scoop prongs */}
        {[11.5, 34.5, 57.5, 80.5, 103.5].map(x => (
          <g key={x}>
            <circle cx={x-4.5} cy={12} r="1.1" fill="none" stroke={metalColor} strokeWidth="0.4" />
            <circle cx={x+4.5} cy={12} r="1.1" fill="none" stroke={metalColor} strokeWidth="0.4" />
            <circle cx={x-4.5} cy={28} r="1.1" fill="none" stroke={metalColor} strokeWidth="0.4" />
            <circle cx={x+4.5} cy={28} r="1.1" fill="none" stroke={metalColor} strokeWidth="0.4" />
          </g>
        ))}
      </svg>
    );
  } else if (styleId === 'ThreadGrain') {
    return (
      <svg width="100%" height="40" viewBox="0 0 120 40" className="mx-auto rounded">
        {drawGrid()}
        {/* Raised solid borders */}
        <rect x="0" y="6" width="120" height="28" fill={metalShade} stroke={metalColor} strokeWidth={strokeWidth} />
        <line x1="0" y1="9" x2="120" y2="9" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="1,1" opacity="0.6" />
        <line x1="0" y1="31" x2="120" y2="31" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="1,1" opacity="0.6" />
        {/* Recessed black background channel */}
        <rect x="0" y="11" width="120" height="18" fill="#020617" opacity="0.8" />
        {/* Diamonds */}
        {[14, 37, 60, 83, 106].map(x => drawDiamond(x, 20, 6.8))}
        {/* Grain/bead settings around each diamond */}
        {[14, 37, 60, 83, 106].map(x => (
          <g key={x}>
            <circle cx={x-4} cy={14} r="0.9" fill="none" stroke={metalColor} strokeWidth="0.4" />
            <circle cx={x+4} cy={14} r="0.9" fill="none" stroke={metalColor} strokeWidth="0.4" />
            <circle cx={x-4} cy={26} r="0.9" fill="none" stroke={metalColor} strokeWidth="0.4" />
            <circle cx={x+4} cy={26} r="0.9" fill="none" stroke={metalColor} strokeWidth="0.4" />
          </g>
        ))}
      </svg>
    );
  }
  return null;
}

function renderCADView(styleId: string, view: 'Top' | 'Perspective' | 'Front' | 'Right', item?: any) {
  const strokeColor = "#f8fafc"; // crisp off-white for structural lines
  const gemStroke = "#38bdf8"; // electric cyan glow for diamonds
  const gemFill = "rgba(56, 189, 248, 0.15)";
  const facetColor = "#a5f3fc";
  const gridLineColor = "#1e293b";
  const dimColor = "#f1c40f"; // gold for dimensions

  const size = Number(item?.cRingSize) || 6.5;
  const width = Number(item?.cBandWidth) || 2.0;
  const thickness = Number(item?.cBandThickness) || 1.5;
  const dMM = 11.63 + 0.8128 * size;

  // Helper to draw clean dimension arrows
  const drawDim = (x1: number, y1: number, x2: number, y2: number, txt: string, offY = -4, align: "start" | "middle" | "end" = "middle") => {
    const isH = Math.abs(y1 - y2) < 0.5;
    return (
      <g className="opacity-90 font-mono text-[7px] font-bold select-none pointer-events-none">
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={dimColor} strokeWidth="0.8" />
        {isH ? (
          <>
            <line x1={x1} y1={y1 - 3} x2={x1} y2={y1 + 3} stroke={dimColor} strokeWidth="0.8" />
            <line x1={x2} y1={y2 - 3} x2={x2} y2={y2 + 3} stroke={dimColor} strokeWidth="0.8" />
            <path d={`M ${x1} ${y1} L ${x1+4} ${y1-1.5} M ${x1} ${y1} L ${x1+4} ${y1+1.5}`} stroke={dimColor} strokeWidth="0.8" fill="none" />
            <path d={`M ${x2} ${y2} L ${x2-4} ${y2-1.5} M ${x2} ${y2} L ${x2-4} ${y2+1.5}`} stroke={dimColor} strokeWidth="0.8" fill="none" />
          </>
        ) : (
          <>
            <line x1={x1 - 3} y1={y1} x2={x1 + 3} y2={y1} stroke={dimColor} strokeWidth="0.8" />
            <line x1={x2 - 3} y1={y2} x2={x2 + 3} y2={y2} stroke={dimColor} strokeWidth="0.8" />
            <path d={`M ${x1} ${y1} L ${x1-1.5} ${y1+4} M ${x1} ${y1} L ${x1+1.5} ${y1+4}`} stroke={dimColor} strokeWidth="0.8" fill="none" />
            <path d={`M ${x2} ${y2} L ${x2-1.5} ${y2-4} M ${x2} ${y2} L ${x2+1.5} ${y2-4}`} stroke={dimColor} strokeWidth="0.8" fill="none" />
          </>
        )}
        <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + offY} textAnchor={align} className="fill-[#f1c40f]" stroke="none">{txt}</text>
      </g>
    );
  };

  const drawGem = (cx: number, cy: number, r: number) => {
    const s = r * 0.45;
    return (
      <g key={`${cx}-${cy}`} className="select-none pointer-events-none">
        <circle cx={cx} cy={cy} r={r} fill={gemFill} stroke={gemStroke} strokeWidth="1" />
        <polygon points={`${cx-s},${cy-s*0.4} ${cx},${cy-s} ${cx+s},${cy-s*0.4} ${cx+s},${cy+s*0.4} ${cx},${cy+s} ${cx-s},${cy+s*0.4}`} fill="none" stroke={facetColor} strokeWidth="0.6" />
        <line x1={cx-r} y1={cy} x2={cx-s} y2={cy} stroke={facetColor} strokeWidth="0.4" />
        <line x1={cx+r} y1={cy} x2={cx+s} y2={cy} stroke={facetColor} strokeWidth="0.4" />
        <line x1={cx} y1={cy-r} x2={cx} y2={cy-s} stroke={facetColor} strokeWidth="0.4" />
        <line x1={cx} y1={cy+r} x2={cx} y2={cy+s} stroke={facetColor} strokeWidth="0.4" />
      </g>
    );
  };

  const grid = (
    <>
      <g className="opacity-15 select-none pointer-events-none">
        {[20, 40, 60, 80, 100, 120, 140, 160, 180].map(x => <line key={x} x1={x} y1="0" x2={x} y2="150" stroke={strokeColor} strokeWidth="0.5" strokeDasharray="1,4" />)}
        {[25, 50, 75, 100, 125].map(y => <line key={y} x1="0" y1={y} x2="200" y2={y} stroke={strokeColor} strokeWidth="0.5" strokeDasharray="1,4" />)}
        <line x1="100" y1="0" x2="100" y2="150" stroke={strokeColor} strokeWidth="0.6" />
        <line x1="0" y1="75" x2="200" y2="75" stroke={strokeColor} strokeWidth="0.6" />
      </g>
      <g transform="translate(15, 135)" className="opacity-70 text-[5px] font-mono select-none pointer-events-none">
        {view === 'Top' && (
          <>
            <line x1="0" y1="0" x2="10" y2="0" stroke="#ef4444" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2="-10" stroke="#10b981" strokeWidth="1" />
            <text x="12" y="2" className="fill-slate-400">X</text>
            <text x="-2" y="-12" className="fill-slate-400">Y</text>
          </>
        )}
        {view === 'Front' && (
          <>
            <line x1="0" y1="0" x2="10" y2="0" stroke="#ef4444" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2="-10" stroke="#3b82f6" strokeWidth="1" />
            <text x="12" y="2" className="fill-slate-400">X</text>
            <text x="-2" y="-12" className="fill-slate-400">Z</text>
          </>
        )}
        {view === 'Right' && (
          <>
            <line x1="0" y1="0" x2="10" y2="0" stroke="#10b981" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2="-10" stroke="#3b82f6" strokeWidth="1" />
            <text x="12" y="2" className="fill-slate-400">Y</text>
            <text x="-2" y="-12" className="fill-slate-400">Z</text>
          </>
        )}
        {view === 'Perspective' && (
          <>
            <line x1="0" y1="0" x2="8" y2="4" stroke="#ef4444" strokeWidth="1" />
            <line x1="0" y1="0" x2="-6" y2="4" stroke="#10b981" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2="-10" stroke="#3b82f6" strokeWidth="1" />
            <text x="10" y="6" className="fill-slate-400">X</text>
            <text x="-12" y="6" className="fill-slate-400">Y</text>
            <text x="-2" y="-11" className="fill-slate-400">Z</text>
          </>
        )}
      </g>
    </>
  );

  if (view === 'Top') {
    return (
      <svg viewBox="0 0 200 150" className="w-full h-full bg-transparent">
        {grid}
        <rect x="20" y="55" width="160" height="40" fill="rgba(255,255,255,0.02)" stroke={strokeColor} strokeWidth="1.5" />

        {styleId === 'ChannelSet' && (
          <>
            <line x1="20" y1="63" x2="180" y2="63" stroke={strokeColor} strokeWidth="1" />
            <line x1="20" y1="87" x2="180" y2="87" stroke={strokeColor} strokeWidth="1" />
            <rect x="20" y="63" width="160" height="24" fill="rgba(30,41,59,0.3)" />
            {[40, 64, 88, 112, 136, 160].map(x => drawGem(x, 75, 10.5))}
          </>
        )}

        {styleId === 'FrenchPave' && (
          <>
            {[40, 64, 88, 112, 136, 160].map(x => (
              <g key={x}>
                <polygon points={`${x-8},55 ${x},61 ${x+8},55`} fill="rgba(255,255,255,0.05)" stroke={strokeColor} strokeWidth="0.8" />
                <polygon points={`${x-8},95 ${x},89 ${x+8},95`} fill="rgba(255,255,255,0.05)" stroke={strokeColor} strokeWidth="0.8" />
              </g>
            ))}
            {[40, 64, 88, 112, 136, 160].map(x => drawGem(x, 75, 10))}
            {[52, 76, 100, 124, 148].map(x => (
              <g key={x}>
                <polygon points={`${x-3},64 ${x+3},64 ${x},58`} fill={strokeColor} stroke={strokeColor} strokeWidth="0.5" />
                <polygon points={`${x-3},86 ${x+3},86 ${x},92`} fill={strokeColor} stroke={strokeColor} strokeWidth="0.5" />
              </g>
            ))}
          </>
        )}

        {styleId === 'HoneycombPave' && (
          <>
            {[30, 50, 70, 90, 110, 130, 150, 170].map(x => drawGem(x, 62, 5.5))}
            {[40, 60, 80, 100, 120, 140, 160].map(x => drawGem(x, 75, 6.5))}
            {[30, 50, 70, 90, 110, 130, 150, 170].map(x => drawGem(x, 88, 5.5))}
            {[40, 60, 80, 100, 120, 140, 160].map(x => (
              <g key={x}>
                <circle cx={x-5} cy={67} r="1" fill={strokeColor} />
                <circle cx={x+5} cy={67} r="1" fill={strokeColor} />
                <circle cx={x-5} cy={83} r="1" fill={strokeColor} />
                <circle cx={x+5} cy={83} r="1" fill={strokeColor} />
              </g>
            ))}
          </>
        )}

        {styleId === 'ProngBasket' && (
          <>
            {[40, 64, 88, 112, 136, 160].map(x => (
              <g key={x}>
                <circle cx={x} cy={75} r="11" fill="none" stroke={strokeColor} strokeWidth="1" strokeDasharray="3,1" />
                {drawGem(x, 75, 10)}
                <circle cx={x-7} cy={68} r="1.6" fill={strokeColor} />
                <circle cx={x+7} cy={68} r="1.6" fill={strokeColor} />
                <circle cx={x-7} cy={82} r="1.6" fill={strokeColor} />
                <circle cx={x+7} cy={82} r="1.6" fill={strokeColor} />
              </g>
            ))}
          </>
        )}

        {styleId === 'SingleRowPave' && (
          <>
            {[34, 52, 70, 88, 106, 124, 142, 160].map(x => drawGem(x, 75, 8))}
            {[25, 43, 61, 79, 97, 115, 133, 151, 169].map(x => (
              <g key={x}>
                <circle cx={x} cy={64} r="1.2" fill={strokeColor} />
                <circle cx={x} cy={86} r="1.2" fill={strokeColor} />
              </g>
            ))}
          </>
        )}

        {styleId === 'UCutPave' && (
          <>
            <path d="M 20,55 Q 32,60 44,55 Q 56,60 68,55 Q 80,60 92,55 Q 104,60 116,55 Q 128,60 140,55 Q 152,60 164,55 Q 172,57 180,55" fill="none" stroke={strokeColor} strokeWidth="1" />
            <path d="M 20,95 Q 32,90 44,95 Q 56,90 68,95 Q 80,90 92,95 Q 104,90 116,95 Q 128,90 140,95 Q 152,90 164,95 Q 172,93 180,95" fill="none" stroke={strokeColor} strokeWidth="1" />
            {[32, 56, 80, 104, 128, 152, 168].map(x => drawGem(x, 75, 10.5))}
            {[44, 68, 92, 116, 140, 164].map(x => (
              <g key={x}>
                <circle cx={x} cy={60} r="1.4" fill={strokeColor} />
                <circle cx={x} cy={90} r="1.4" fill={strokeColor} />
              </g>
            ))}
          </>
        )}

        {styleId === 'ThreadGrain' && (
          <>
            <line x1="20" y1="59" x2="180" y2="59" stroke={strokeColor} strokeWidth="0.8" />
            <line x1="20" y1="91" x2="180" y2="91" stroke={strokeColor} strokeWidth="0.8" />
            <line x1="20" y1="61" x2="180" y2="61" stroke="#ffffff" strokeWidth="0.8" strokeDasharray="1,1" />
            <line x1="20" y1="89" x2="180" y2="89" stroke="#ffffff" strokeWidth="0.8" strokeDasharray="1,1" />
            <rect x="20" y="63" width="160" height="24" fill="rgba(30,41,59,0.3)" />
            {[40, 64, 88, 112, 136, 160].map(x => drawGem(x, 75, 9.5))}
            {[40, 64, 88, 112, 136, 160].map(x => (
              <g key={x}>
                <circle cx={x-5} cy={66} r="1" fill={strokeColor} />
                <circle cx={x+5} cy={66} r="1" fill={strokeColor} />
                <circle cx={x-5} cy={84} r="1" fill={strokeColor} />
                <circle cx={x+5} cy={84} r="1" fill={strokeColor} />
              </g>
            ))}
          </>
        )}

        {drawDim(185, 55, 185, 95, `W: ${width.toFixed(1)}mm`, -3, "start")}
        {drawDim(20, 112, 180, 112, `${CAD_STYLES.find(s => s.id === styleId)?.name.toUpperCase() || styleId.toUpperCase()}`)}
      </svg>
    );
  }

  if (view === 'Perspective') {
    const isHoneycomb = styleId === 'HoneycombPave';
    const isFrench = styleId === 'FrenchPave';
    const isUCut = styleId === 'UCutPave';
    const isProng = styleId === 'ProngBasket';
    const isThread = styleId === 'ThreadGrain';

    return (
      <svg viewBox="0 0 200 150" className="w-full h-full bg-transparent">
        {grid}
        <ellipse cx="100" cy="75" rx="65" ry="40" fill="none" stroke={strokeColor} strokeWidth="1.5" />
        <ellipse cx="100" cy="75" rx="53" ry="32" fill="none" stroke={strokeColor} strokeWidth="1.0" />

        {isFrench && (
          <path d="M 38,64 L 43,62 L 48,65 L 53,62 L 58,65 L 63,62 L 68,65 L 73,62 L 78,65 L 83,62 L 88,65 L 93,62 L 98,65 L 103,62 L 108,65 L 113,62 L 118,65 L 123,62 L 128,65 L 133,62 L 138,65 L 143,62 L 148,65 L 153,62 L 158,65 L 163,64" fill="none" stroke={strokeColor} strokeWidth="0.8" opacity="0.6" />
        )}

        {isUCut && (
          <path d="M 38,64 Q 45,69 52,64 Q 59,69 66,64 Q 73,69 80,64 Q 87,69 94,64 Q 101,69 108,64 Q 115,69 122,64 Q 129,69 136,64 Q 143,69 150,64 Q 157,69 164,64" fill="none" stroke={strokeColor} strokeWidth="0.8" opacity="0.6" />
        )}

        {isThread && (
          <>
            <ellipse cx="100" cy="75" rx="64" ry="39.2" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeDasharray="1.5,1.5" opacity="0.7" />
            <ellipse cx="100" cy="75" rx="54" ry="32.8" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeDasharray="1.5,1.5" opacity="0.7" />
          </>
        )}

        {isHoneycomb ? (
          <>
            {[[52, 60], [68, 53], [84, 49], [100, 48], [116, 49], [132, 53], [148, 60]].map(([x, y], i) => (
              <circle key={`m-${i}`} cx={x} cy={y} r="4.2" fill={gemFill} stroke={gemStroke} strokeWidth="0.6" />
            ))}
            {[[48, 56], [64, 49], [80, 45], [96, 44], [112, 45], [128, 49], [144, 56]].map(([x, y], i) => (
              <circle key={`t-${i}`} cx={x} cy={y-1.5} r="3.2" fill={gemFill} stroke={gemStroke} strokeWidth="0.5" opacity="0.8" />
            ))}
            {[[48, 56], [64, 49], [80, 45], [96, 44], [112, 45], [128, 49], [144, 56]].map(([x, y], i) => (
              <circle key={`b-${i}`} cx={x} cy={y+1.5} r="3.2" fill={gemFill} stroke={gemStroke} strokeWidth="0.5" opacity="0.8" />
            ))}
          </>
        ) : isProng ? (
          <>
            {[[52, 60], [67, 53], [83, 49], [100, 48], [117, 49], [133, 53], [148, 60]].map(([x, y], i) => (
              <g key={`bask-${i}`}>
                <path d={`M ${x-3} ${y+1} L ${x-1} ${y+7} M ${x+3} ${y+1} L ${x+1} ${y+7}`} stroke={strokeColor} strokeWidth="0.8" opacity="0.8" />
                <circle cx={x} cy={y} r="5" fill={gemFill} stroke={gemStroke} strokeWidth="0.8" />
                <circle cx={x-3.2} cy={y-3.2} r="0.8" fill={strokeColor} />
                <circle cx={x+3.2} cy={y-3.2} r="0.8" fill={strokeColor} />
                <circle cx={x-3.2} cy={y+3.2} r="0.8" fill={strokeColor} />
                <circle cx={x+3.2} cy={y+3.2} r="0.8" fill={strokeColor} />
              </g>
            ))}
          </>
        ) : (
          [[52, 60], [67, 53], [83, 49], [100, 48], [117, 49], [133, 53], [148, 60]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="5" fill={gemFill} stroke={gemStroke} strokeWidth="0.8" />
          ))
        )}

        <text x="100" y="132" textAnchor="middle" className="text-[7px] font-mono font-bold fill-brand-400">ISO-3D SHADED WIREFRAME</text>
      </svg>
    );
  }

  if (view === 'Front') {
    const isFrench = styleId === 'FrenchPave';
    const isUCut = styleId === 'UCutPave';
    const isProng = styleId === 'ProngBasket';

    return (
      <svg viewBox="0 0 200 150" className="w-full h-full bg-transparent">
        {grid}
        <circle cx="100" cy="75" r="50" fill="none" stroke={strokeColor} strokeWidth="1.6" />
        <circle cx="100" cy="75" r="42" fill="none" stroke={strokeColor} strokeWidth="1.2" />

        {[-45, -30, -15, 0, 15, 30, 45].map((angle, idx) => {
          const rad = (angle * Math.PI) / 180;
          const cx = 100 + 46 * Math.sin(rad);
          const cy = 75 - 46 * Math.cos(rad);
          
          return (
            <g key={idx}>
              {isFrench && (
                <polygon 
                  points={`
                    ${100 + 50 * Math.sin(rad - 0.1)} ${75 - 50 * Math.cos(rad - 0.1)} 
                    ${100 + 44 * Math.sin(rad)} ${75 - 44 * Math.cos(rad)} 
                    ${100 + 50 * Math.sin(rad + 0.1)} ${75 - 50 * Math.cos(rad + 0.1)}
                  `} 
                  fill="none" 
                  stroke={strokeColor} 
                  strokeWidth="0.8" 
                />
              )}

              {isUCut && (
                <path 
                  d={`
                    M ${100 + 50 * Math.sin(rad - 0.1)} ${75 - 50 * Math.cos(rad - 0.1)} 
                    Q ${100 + 44 * Math.sin(rad)} ${75 - 44 * Math.cos(rad)} 
                    ${100 + 50 * Math.sin(rad + 0.1)} ${75 - 50 * Math.cos(rad + 0.1)}
                  `} 
                  fill="none" 
                  stroke={strokeColor} 
                  strokeWidth="0.8" 
                />
              )}

              {isProng && (
                <rect 
                  x={cx - 3.5} 
                  y={cy - 1} 
                  width="7" 
                  height="4.5" 
                  fill="none" 
                  stroke={strokeColor} 
                  strokeWidth="0.8" 
                  transform={`rotate(${angle}, ${cx}, ${cy})`} 
                />
              )}

              <circle cx={cx} cy={cy} r="4.2" fill={gemFill} stroke={gemStroke} strokeWidth="0.8" />
            </g>
          );
        })}

        {drawDim(100 - 42, 75, 100 + 42, 75, `Inside Ø: ${dMM.toFixed(2)}mm (Size ${size})`)}
        {drawDim(38, 75, 50, 75, `T: ${thickness.toFixed(1)}mm`, -3, "end")}
      </svg>
    );
  }

  if (view === 'Right') {
    const isHoneycomb = styleId === 'HoneycombPave';
    const isChannel = styleId === 'ChannelSet';
    const isFrench = styleId === 'FrenchPave';
    const isProng = styleId === 'ProngBasket';
    const isUCut = styleId === 'UCutPave';
    const isThread = styleId === 'ThreadGrain';

    return (
      <svg viewBox="0 0 200 150" className="w-full h-full bg-transparent">
        {grid}
        
        {isHoneycomb ? (
          <rect x="75" y="45" width="50" height="75" fill="rgba(255,255,255,0.02)" stroke={strokeColor} strokeWidth="1.5" />
        ) : (
          <rect x="85" y="45" width="30" height="75" fill="rgba(255,255,255,0.02)" stroke={strokeColor} strokeWidth="1.5" />
        )}

        {isChannel && (
          <>
            <line x1="85" y1="45" x2="85" y2="30" stroke={strokeColor} strokeWidth="1.5" />
            <line x1="115" y1="45" x2="115" y2="30" stroke={strokeColor} strokeWidth="1.5" />
            {drawGem(100, 42, 9)}
          </>
        )}

        {isFrench && (
          <>
            <polygon points="85,45 100,55 115,45" fill="none" stroke={strokeColor} strokeWidth="1" />
            {drawGem(100, 36, 9)}
            <line x1="85" y1="45" x2="85" y2="36" stroke={strokeColor} strokeWidth="1" />
            <line x1="115" y1="45" x2="115" y2="36" stroke={strokeColor} strokeWidth="1" />
          </>
        )}

        {isUCut && (
          <>
            <path d="M 85,45 Q 100,56 115,45" fill="none" stroke={strokeColor} strokeWidth="1" />
            {drawGem(100, 36, 9.5)}
            <line x1="85" y1="45" x2="85" y2="36" stroke={strokeColor} strokeWidth="1" />
            <line x1="115" y1="45" x2="115" y2="36" stroke={strokeColor} strokeWidth="1" />
          </>
        )}

        {isThread && (
          <>
            <rect x="85" y="41" width="30" height="4" fill="none" stroke={strokeColor} strokeWidth="1" />
            <circle cx="87" cy="43" r="0.8" fill="#ffffff" />
            <circle cx="113" cy="43" r="0.8" fill="#ffffff" />
            {drawGem(100, 40, 8.5)}
          </>
        )}

        {isProng && (
          <>
            <line x1="88" y1="45" x2="92" y2="28" stroke={strokeColor} strokeWidth="1" />
            <line x1="112" y1="45" x2="108" y2="28" stroke={strokeColor} strokeWidth="1" />
            <line x1="90" y1="36" x2="110" y2="36" stroke={strokeColor} strokeWidth="1" />
            {drawGem(100, 26, 10)}
            <line x1="91" y1="26" x2="91" y2="18" stroke={strokeColor} strokeWidth="1.2" />
            <line x1="109" y1="26" x2="109" y2="18" stroke={strokeColor} strokeWidth="1.2" />
          </>
        )}

        {isHoneycomb && (
          <>
            {drawGem(100, 41, 5.5)}
            {drawGem(86, 43, 4.5)}
            {drawGem(114, 43, 4.5)}
          </>
        )}

        {!isChannel && !isFrench && !isProng && !isUCut && !isThread && !isHoneycomb && (
          drawGem(100, 42, 9)
        )}

        {isHoneycomb ? (
          <>
            {drawDim(63, 45, 63, 120, `W: ${width.toFixed(1)}mm`, -3, "end")}
            {drawDim(75, 130, 125, 130, `T: ${thickness.toFixed(1)}mm`, 8)}
          </>
        ) : (
          <>
            {drawDim(73, 45, 73, 120, `W: ${width.toFixed(1)}mm`, -3, "end")}
            {drawDim(85, 130, 115, 130, `T: ${thickness.toFixed(1)}mm`, 8)}
          </>
        )}
      </svg>
    );
  }

  return null;
}
function DiamondShapeIcon({ shape, className = "w-full h-full text-brand-gold" }: { shape: string; className?: string }) {
  const normShape = (shape || '').trim().toLowerCase();

  const strokeColor = "currentColor";
  const strokeWidth = "4.5";
  const facetStroke = "currentColor";
  const facetOpacity = "0.8";

  if (normShape === 'round') {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none">
        <circle cx="50" cy="50" r="44" stroke={strokeColor} strokeWidth={strokeWidth} />
        <polygon points="50,26 67,33 74,50 67,67 50,74 33,67 26,50 33,33" stroke={facetStroke} strokeWidth="3" strokeOpacity={facetOpacity} />
        <line x1="50" y1="6" x2="50" y2="26" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="50" y1="94" x2="50" y2="74" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="6" y1="50" x2="26" y2="50" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="94" y1="50" x2="74" y2="50" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="19" y1="19" x2="33" y2="33" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="81" y1="19" x2="67" y2="33" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="19" y1="81" x2="33" y2="67" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="81" y1="81" x2="67" y2="67" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="50" y1="26" x2="74" y2="50" stroke={facetStroke} strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1="74" y1="50" x2="50" y2="74" stroke={facetStroke} strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1="50" y1="74" x2="26" y2="50" stroke={facetStroke} strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1="26" y1="50" x2="50" y2="26" stroke={facetStroke} strokeWidth="1.5" strokeOpacity="0.5" />
      </svg>
    );
  }

  if (normShape === 'princess') {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none">
        <rect x="8" y="8" width="84" height="84" rx="2" stroke={strokeColor} strokeWidth={strokeWidth} />
        <rect x="28" y="28" width="44" height="44" stroke={facetStroke} strokeWidth="3" strokeOpacity={facetOpacity} />
        <line x1="8" y1="8" x2="28" y2="28" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="92" y1="8" x2="72" y2="28" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="8" y1="92" x2="28" y2="72" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="92" y1="92" x2="72" y2="72" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="50" y1="8" x2="50" y2="92" stroke={facetStroke} strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1="8" y1="50" x2="92" y2="50" stroke={facetStroke} strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1="28" y1="28" x2="72" y2="72" stroke={facetStroke} strokeWidth="1.5" strokeOpacity="0.4" />
        <line x1="72" y1="28" x2="28" y2="72" stroke={facetStroke} strokeWidth="1.5" strokeOpacity="0.4" />
      </svg>
    );
  }

  if (normShape === 'oval') {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none">
        <ellipse cx="50" cy="50" rx="34" ry="45" stroke={strokeColor} strokeWidth={strokeWidth} />
        <ellipse cx="50" cy="50" rx="18" ry="24" stroke={facetStroke} strokeWidth="3" strokeOpacity={facetOpacity} />
        <line x1="50" y1="5" x2="50" y2="26" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="50" y1="95" x2="50" y2="74" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="16" y1="50" x2="32" y2="50" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="84" y1="50" x2="68" y2="50" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="24" y1="18" x2="37" y2="33" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="76" y1="18" x2="63" y2="33" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="24" y1="82" x2="37" y2="67" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="76" y1="82" x2="63" y2="67" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
      </svg>
    );
  }

  if (normShape === 'pear') {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none">
        <path d="M 50 6 C 50 6, 12 48, 16 71 C 20 91, 80 91, 84 71 C 88 48, 50 6, 50 6 Z" stroke={strokeColor} strokeWidth={strokeWidth} />
        <path d="M 50 30 C 50 30, 28 54, 30 67 C 32 79, 68 79, 70 67 C 72 54, 50 30, 50 30 Z" stroke={facetStroke} strokeWidth="3" strokeOpacity={facetOpacity} />
        <line x1="50" y1="6" x2="50" y2="30" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="50" y1="91" x2="50" y2="79" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="16" y1="71" x2="30" y2="67" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="84" y1="71" x2="70" y2="67" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="28" y1="40" x2="38" y2="48" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="72" y1="40" x2="62" y2="48" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="22" y1="85" x2="35" y2="76" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="78" y1="85" x2="65" y2="76" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
      </svg>
    );
  }

  if (normShape === 'emerald') {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none">
        <polygon points="26,8 74,8 92,26 92,74 74,92 26,92 8,74 8,26" stroke={strokeColor} strokeWidth={strokeWidth} />
        <polygon points="31,18 69,18 82,31 82,69 69,82 31,82 18,69 18,31" stroke={facetStroke} strokeWidth="3" strokeOpacity={facetOpacity} />
        <polygon points="37,30 63,30 70,37 70,63 63,70 37,70 30,63 30,37" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="8" y1="26" x2="30" y2="37" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="92" y1="26" x2="70" y2="37" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="92" y1="74" x2="70" y2="63" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="8" y1="74" x2="30" y2="63" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="50" y1="8" x2="50" y2="30" stroke={facetStroke} strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1="50" y1="92" x2="50" y2="70" stroke={facetStroke} strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1="8" y1="50" x2="30" y2="50" stroke={facetStroke} strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1="92" y1="50" x2="70" y2="50" stroke={facetStroke} strokeWidth="1.5" strokeOpacity="0.5" />
      </svg>
    );
  }

  if (normShape === 'marquise') {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none">
        <path d="M 50 4 C 15 35, 15 65, 50 96 C 85 65, 85 35, 50 4 Z" stroke={strokeColor} strokeWidth={strokeWidth} />
        <path d="M 50 24 C 30 42, 30 58, 50 76 C 70 58, 70 42, 50 24 Z" stroke={facetStroke} strokeWidth="3" strokeOpacity={facetOpacity} />
        <line x1="50" y1="4" x2="50" y2="24" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="50" y1="96" x2="50" y2="76" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="17" y1="50" x2="34" y2="50" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="83" y1="50" x2="66" y2="50" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="28" y1="32" x2="40" y2="38" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="72" y1="32" x2="60" y2="38" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="28" y1="68" x2="40" y2="62" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="72" y1="68" x2="60" y2="62" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
      </svg>
    );
  }

  if (normShape === 'cushion') {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none">
        <rect x="8" y="8" width="84" height="84" rx="24" stroke={strokeColor} strokeWidth={strokeWidth} />
        <rect x="28" y="28" width="44" height="44" rx="10" stroke={facetStroke} strokeWidth="3" strokeOpacity={facetOpacity} />
        <line x1="14" y1="14" x2="31" y2="31" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="86" y1="14" x2="69" y2="31" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="14" y1="86" x2="31" y2="69" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="86" y1="86" x2="69" y2="69" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="50" y1="8" x2="50" y2="28" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="50" y1="92" x2="50" y2="72" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="8" y1="50" x2="28" y2="50" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="92" y1="50" x2="72" y2="50" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
      </svg>
    );
  }

  if (normShape === 'radiant') {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none">
        <polygon points="20,8 80,8 92,20 92,80 80,92 20,92 8,80 8,20" stroke={strokeColor} strokeWidth={strokeWidth} />
        <polygon points="34,24 66,24 74,32 74,68 66,76 34,76 26,68 26,32" stroke={facetStroke} strokeWidth="3" strokeOpacity={facetOpacity} />
        <line x1="8" y1="20" x2="26" y2="32" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="92" y1="20" x2="74" y2="32" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="92" y1="80" x2="74" y2="68" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="8" y1="80" x2="26" y2="68" stroke={facetStroke} strokeWidth="2.5" strokeOpacity={facetOpacity} />
        <line x1="50" y1="8" x2="50" y2="24" stroke={facetStroke} strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1="50" y1="92" x2="50" y2="76" stroke={facetStroke} strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1="8" y1="50" x2="26" y2="50" stroke={facetStroke} strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1="92" y1="50" x2="74" y2="50" stroke={facetStroke} strokeWidth="1.5" strokeOpacity="0.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 12h20L12 2z" />
      <path d="M12 22L2 12h20L12 2z" />
    </svg>
  );
}

const getMetalGradientColors = (material: string, color: string) => {
  if (material === 'gold') {
    if (color === 'Yellow') {
      return { stop1: '#FFF3B3', stop2: '#E5A91A', stop3: '#996F0A', stroke: '#A67B10' };
    } else if (color === 'Rose') {
      return { stop1: '#FFD4C9', stop2: '#D48694', stop3: '#9E505E', stroke: '#AD5C6A' };
    }
  }
  return { stop1: '#F5F5F7', stop2: '#AFAFB4', stop3: '#727278', stroke: '#85858A' };
};

interface QuoteCalculatorProps {
  session: QuoteSession;
  onChangeSession: (updater: (prev: QuoteSession) => QuoteSession) => void;
  onSaveQuote: () => void;
  onLaunchSketch: (type: 'sketch' | 'photo', index?: number | null) => void;
  settings: AppSettings;
  spotPrices: { gold: number; silver: number; platinum: number };
  isWholesale: boolean;
  scrapTransactions?: ScrapTransaction[];
  onTriggerPrint?: (printFn: () => void) => void;
}

export default function QuoteCalculator({
  session,
  onChangeSession,
  onSaveQuote,
  onLaunchSketch,
  settings,
  spotPrices,
  isWholesale,
  scrapTransactions,
  onTriggerPrint
}: QuoteCalculatorProps) {
  const getWholesaleBreakdown = () => {
    let rawMetalCost = 0;
    const rawMetalDetails: string[] = [];

    let fabLabor = 0;
    const fabLaborDetails: string[] = [];

    let settingLabor = 0;
    const settingLaborDetails: string[] = [];

    let stoneSupplyCost = 0;
    const stoneSupplyDetails: string[] = [];

    let designAddons = 0;
    const designAddonsDetails: string[] = [];

    const w = (session.wholesaleProfileId && settings.wholesaleProfiles?.find(p => p.id === session.wholesaleProfileId)?.settings)
              || settings.wholesale;
    const sPGold = Number(session.overridePrices?.gold ?? spotPrices.gold);
    const sPPlat = Number(session.overridePrices?.platinum ?? spotPrices.platinum);
    const sPSilv = Number(session.overridePrices?.silver ?? spotPrices.silver);

    session.rings.forEach((r, ringIdx) => {
      if (!hasRingData(r)) return;

      const ringLabel = r.category === 'customRing' ? 'Engagement' 
                  : r.category === 'weddingBand' ? 'Wedding Band'
                  : r.category === 'mensBand' ? "Men's Band"
                  : r.category === 'pendant' ? 'Pendant'
                  : r.category === 'earrings' ? 'Earrings'
                  : 'Tennis';

      const g = Number(r.goldGrams) || 0;

      // 1. Raw Metal Cost
      if (g > 0) {
        let metalC = 0;
        let ratePerGram = 0;
        if (r.material === 'gold') {
          ratePerGram = (((sPGold + Number(w.goldSpotPremium)) / 31.1034768) * (Number(r.goldKarat) / 24));
          metalC = g * ratePerGram;
          rawMetalDetails.push(`${ringLabel}: ${g.toFixed(2)}g x $${ratePerGram.toFixed(2)}/g (${r.goldKarat}K Gold)`);
        } else if (r.material === 'platinum') {
          ratePerGram = (((sPPlat + Number(w.goldSpotPremium)) / 31.1034768) * 0.95);
          metalC = g * ratePerGram;
          rawMetalDetails.push(`${ringLabel}: ${g.toFixed(2)}g x $${ratePerGram.toFixed(2)}/g (Platinum)`);
        } else if (r.material === 'silver') {
          ratePerGram = (((sPSilv + Number(w.goldSpotPremium)) / 31.1034768) * 0.925);
          metalC = g * ratePerGram;
          rawMetalDetails.push(`${ringLabel}: ${g.toFixed(2)}g x $${ratePerGram.toFixed(2)}/g (Silver)`);
        }
        rawMetalCost += metalC;

        // 2. Fab labor
        const ringFabLabor = g * Number(w.laborPerGram);
        fabLabor += ringFabLabor;
        fabLaborDetails.push(`${ringLabel}: ${g.toFixed(2)}g x $${Number(w.laborPerGram).toFixed(2)}/g`);
      }

      // 3. Setting & Stones
      // supplied melee
      let mQ = 0;
      let mC = 0;
      let mCarats = 0;
      r.melee.forEach(m => {
        const q = Number(m.qty) || 0;
        const rate = Number(w.meleeRates?.[m.size] ?? 400);
        mQ += q;
        const carats = q * Number(m.carat);
        mCarats += carats;
        mC += carats * rate;
      });
      if (mQ > 0) {
        settingLabor += mQ * Number(w.settingMelee);
        settingLaborDetails.push(`${ringLabel}: ${mQ}x Melee setting x $${Number(w.settingMelee).toFixed(2)}`);
        stoneSupplyCost += mC;
        stoneSupplyDetails.push(`${ringLabel}: ${mCarats.toFixed(2)}ct Melee x wholesale rate`);
      }

      // supplied fancy
      let fQ = 0;
      let fC = 0;
      let fCarats = 0;
      r.fancy.forEach(f => {
        const aF = FANCY_SHAPES[f.shape] || [];
        const fd = aF[f.sizeIdx] || { carat: 0, label: '' };
        const q = Number(f.qty) || 0;
        const key = fd.label ? `${f.shape}-${fd.label}` : '';
        const rate = Number((key && w.fancyRates?.[key]) ?? w.fancyRates?.[f.shape] ?? 500);
        fQ += q;
        const carats = q * Number(fd.carat);
        fCarats += carats;
        fC += carats * rate;
      });
      if (fQ > 0) {
        settingLabor += fQ * Number(w.settingFancy);
        settingLaborDetails.push(`${ringLabel}: ${fQ}x Fancy setting x $${Number(w.settingFancy).toFixed(2)}`);
        stoneSupplyCost += fC;
        stoneSupplyDetails.push(`${ringLabel}: ${fCarats.toFixed(2)}ct Fancy x wholesale rate`);
      }

      // client stones setting
      let clientCenterQ = 0;
      let clientFancyQ = 0;
      let clientMeleeQ = 0;
      r.clientStones.forEach(cs => {
        const q = Number(cs.qty) || 0;
        if (cs.type === 'Center') {
          clientCenterQ += q;
        } else if (cs.type === 'Fancy') {
          clientFancyQ += q;
        } else {
          clientMeleeQ += q;
        }
      });
      if (clientCenterQ > 0) {
        settingLabor += clientCenterQ * Number(w.settingCenter);
        settingLaborDetails.push(`${ringLabel}: ${clientCenterQ}x Client Center setting x $${Number(w.settingCenter).toFixed(2)}`);
      }
      if (clientFancyQ > 0) {
        settingLabor += clientFancyQ * Number(w.settingFancy);
        settingLaborDetails.push(`${ringLabel}: ${clientFancyQ}x Client Fancy setting x $${Number(w.settingFancy).toFixed(2)}`);
      }
      if (clientMeleeQ > 0) {
        settingLabor += clientMeleeQ * Number(w.settingMelee);
        settingLaborDetails.push(`${ringLabel}: ${clientMeleeQ}x Client Melee setting x $${Number(w.settingMelee).toFixed(2)}`);
      }

      // center stone supplied (if any)
      if (r.stoneSource !== 'customer' && r.centerStone?.carats) {
        const cts = Number(r.centerStone.carats);
        const rate = Number(settings.centerStoneRates[r.centerStone.type]?.[r.centerStone.origin] ?? 1000);
        stoneSupplyCost += cts * rate;
        stoneSupplyDetails.push(`${ringLabel}: Center ${cts.toFixed(2)}ct (${r.centerStone.type} ${r.centerStone.origin}) x $${rate.toFixed(2)}/ct`);
      }
      if (r.stoneSource !== 'customer' && r.category === 'earrings' && r.centerStone2?.carats) {
        const cts = Number(r.centerStone2.carats);
        const rate = Number(settings.centerStoneRates[r.centerStone2.type]?.[r.centerStone2.origin] ?? 1000);
        stoneSupplyCost += cts * rate;
        stoneSupplyDetails.push(`${ringLabel}: Center 2 ${cts.toFixed(2)}ct (${r.centerStone2.type} ${r.centerStone2.origin}) x $${rate.toFixed(2)}/ct`);
      }

      // design fee
      if (r.applyDesignFee) {
        designAddons += Number(w.designFee);
        designAddonsDetails.push(`${ringLabel}: Design Fee ($${Number(w.designFee).toFixed(2)})`);
      }

      // addons
      r.addons.forEach(a => {
        const fee = Number(a.fee) || 0;
        if (fee > 0) {
          designAddons += fee;
          designAddonsDetails.push(`${ringLabel}: ${a.desc || 'Custom Addon'} ($${fee.toFixed(2)})`);
        }
      });
    });

    return {
      rawMetalCost,
      rawMetalDetails,
      fabLabor,
      fabLaborDetails,
      settingLabor,
      settingLaborDetails,
      stoneSupplyCost,
      stoneSupplyDetails,
      designAddons,
      designAddonsDetails
    };
  };

  // Modal for category selection
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScrapLinkModal, setShowScrapLinkModal] = useState(false);
  const [scrapSearchQuery, setScrapSearchQuery] = useState('');

  const getScrapTransactionsList = (): ScrapTransaction[] => {
    if (scrapTransactions && scrapTransactions.length > 0) {
      return scrapTransactions;
    }
    try {
      const raw = localStorage.getItem('gr_scrap_ledger');
      if (raw) {
        return JSON.parse(raw) as ScrapTransaction[];
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  };

  const handleLinkScrapTransaction = (tx: ScrapTransaction) => {
    const payout = parseFloat(tx.total) || 0;
    onChangeSession(prev => ({ 
      ...prev, 
      scrapCredit: parseFloat(payout.toFixed(2))
    }));
    alert(`Successfully linked scrap buyout of $${payout.toFixed(2)} CAD for client "${tx.name || 'Unnamed'}" as a credit!`);
    setShowScrapLinkModal(false);
  };
  const [activeCADStyle, setActiveCADStyle] = useState<string | null>(null);
  const [simViewMode, setSimViewMode] = useState<'realistic' | 'blueprint'>('realistic');
  const [isDesignerMode, setIsDesignerMode] = useState(false);
  const [openDiscounts, setOpenDiscounts] = useState<Record<string, boolean>>({});

  // Active ring being edited in the subtab
  const activeRing = session.rings.find(r => r.id === session.activeSubTab);

  // Auto-calculate metal weight when relevant inputs change
  useEffect(() => {
    if (!activeRing) return;
    
    if (activeRing.category === 'mensBand') {
      if (!activeRing.mbOverrideWeight) {
        const calculated = calculateBandWeight(activeRing);
        if (calculated !== activeRing.goldGrams) {
          updateActiveRing('goldGrams', calculated);
        }
      }
    } else if (activeRing.category === 'tennisBracelet') {
      const calculated = getTennisEstimates(activeRing).estGrams;
      if (String(calculated) !== activeRing.goldGrams) {
        updateActiveRing('goldGrams', String(calculated));
      }
    }
  }, [
    activeRing?.category,
    activeRing?.mbSize,
    activeRing?.mbWidth,
    activeRing?.mbThickness,
    activeRing?.mbProfile,
    activeRing?.mbOverrideWeight,
    activeRing?.cRingSize,
    activeRing?.cBandWidth,
    activeRing?.cBandThickness,
    activeRing?.bandStyle,
    activeRing?.material,
    activeRing?.goldKarat,
    activeRing?.tbLength,
    activeRing?.tbShape,
    activeRing?.tbSizeRound,
    activeRing?.tbSizeIdx
  ]);

  // Helper to update active ring attributes
  const updateActiveRing = <K extends keyof JewelryItem>(field: K, value: JewelryItem[K]) => {
    onChangeSession(prev => ({
      ...prev,
      rings: prev.rings.map(r => r.id === prev.activeSubTab ? { ...r, [field]: value } : r)
    }));
  };

  const sketches = Array.isArray(activeRing?.referenceSketches)
    ? activeRing.referenceSketches
    : (activeRing?.referenceSketch ? [activeRing.referenceSketch] : []);

  const photos = Array.isArray(activeRing?.referencePhotos)
    ? activeRing.referencePhotos
    : (activeRing?.referencePhoto ? [activeRing.referencePhoto] : []);

  const updateSketches = (newSketches: string[]) => {
    onChangeSession(prev => ({
      ...prev,
      rings: prev.rings.map(r => 
        r.id === prev.activeSubTab 
          ? {
              ...r,
              referenceSketch: newSketches[0] || null,
              referenceSketches: newSketches
            }
          : r
      )
    }));
  };

  const updatePhotos = (newPhotos: string[]) => {
    onChangeSession(prev => ({
      ...prev,
      rings: prev.rings.map(r => 
        r.id === prev.activeSubTab 
          ? {
              ...r,
              referencePhoto: newPhotos[0] || null,
              referencePhotos: newPhotos
            }
          : r
      )
    }));
  };

  // Helper to update nested center stone attributes
  const updateCenterStone = (field: string, value: string) => {
    if (!activeRing) return;
    const currentCenter = activeRing.centerStone || { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' };
    updateActiveRing('centerStone', {
      ...currentCenter,
      [field]: value
    });
  };

  const updateCenterStone2 = (field: string, value: string) => {
    if (!activeRing) return;
    const currentCenter = activeRing.centerStone2 || { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' };
    updateActiveRing('centerStone2', {
      ...currentCenter,
      [field]: value
    });
  };

  const addCenterStoneRow = () => {
    if (!activeRing) return;
    const current = activeRing.centerStones || [];
    updateActiveRing('centerStones', [...current, { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' }]);
  };

  const removeCenterStoneRow = (idx: number) => {
    if (!activeRing) return;
    const current = activeRing.centerStones || [];
    updateActiveRing('centerStones', current.filter((_, i) => i !== idx));
  };

  const updateCenterStoneRow = (idx: number, field: string, value: string) => {
    if (!activeRing) return;
    const current = activeRing.centerStones || [];
    updateActiveRing('centerStones', current.map((cs, i) => i === idx ? { ...cs, [field]: value } : cs));
  };

  // Multi-item lists mutations
  const addMelee = () => {
    if (!activeRing) return;
    const current = activeRing.melee || [];
    updateActiveRing('melee', [...current, { qty: '', carat: '', size: '' }]);
  };

  const removeMelee = (idx: number) => {
    if (!activeRing) return;
    updateActiveRing('melee', activeRing.melee.filter((_, i) => i !== idx));
  };

  const updateMelee = (idx: number, field: keyof MeleeItem, val: string) => {
    if (!activeRing) return;
    const updated = activeRing.melee.map((m, i) => {
      if (i !== idx) return m;
      const nm = { ...m, [field]: val };
      // if size changes, prefill estimated carat weight automatically
      if (field === 'size') {
        nm.carat = val ? String(ROUND_MELEE[val] || '0.000') : '';
      }
      return nm;
    });
    updateActiveRing('melee', updated);
  };

  const addFancy = () => {
    if (!activeRing) return;
    const current = activeRing.fancy || [];
    updateActiveRing('fancy', [...current, { qty: '', shape: 'Princess', sizeIdx: 0 }]);
  };

  const removeFancy = (idx: number) => {
    if (!activeRing) return;
    updateActiveRing('fancy', activeRing.fancy.filter((_, i) => i !== idx));
  };

  const updateFancy = (idx: number, field: keyof FancyItem, val: any) => {
    if (!activeRing) return;
    updateActiveRing('fancy', activeRing.fancy.map((f, i) => i === idx ? { ...f, [field]: val } : f));
  };

  const addClientStone = () => {
    if (!activeRing) return;
    const current = activeRing.clientStones || [];
    updateActiveRing('clientStones', [...current, { qty: '', carats: '', size: '1.5', type: 'Melee' }]);
  };

  const removeClientStone = (idx: number) => {
    if (!activeRing) return;
    updateActiveRing('clientStones', activeRing.clientStones.filter((_, i) => i !== idx));
  };

  const updateClientStone = (idx: number, field: keyof ClientStoneItem, val: any) => {
    if (!activeRing) return;
    updateActiveRing('clientStones', activeRing.clientStones.map((cs, i) => {
      if (i === idx) {
        const updated = { ...cs, [field]: val };
        if (field === 'type') {
          if (val === 'Fancy') {
            if (!updated.shape) updated.shape = 'Princess';
            if (updated.sizeIdx === undefined) updated.sizeIdx = 0;
          } else if (val === 'Melee') {
            if (!updated.size) updated.size = '1.5';
          }
        }

        // Auto calculate carats for Melee type
        if (updated.type === 'Melee') {
          const currentSize = updated.size || '1.5';
          const perStoneCarat = ROUND_MELEE[currentSize] || 0.015;
          const qtyVal = parseInt(updated.qty) || 0;
          updated.carats = (qtyVal * perStoneCarat).toFixed(3);
        }

        return updated;
      }
      return cs;
    }));
  };

  const addAddon = () => {
    if (!activeRing) return;
    const current = activeRing.addons || [];
    updateActiveRing('addons', [...current, { fee: '', desc: '' }]);
  };

  const removeAddon = (idx: number) => {
    if (!activeRing) return;
    updateActiveRing('addons', activeRing.addons.filter((_, i) => i !== idx));
  };

  const updateAddon = (idx: number, field: keyof AddonItem, val: string) => {
    if (!activeRing) return;
    updateActiveRing('addons', activeRing.addons.map((a, i) => i === idx ? { ...a, [field]: val } : a));
  };

  const addDesignNote = () => {
    if (!activeRing) return;
    const current = activeRing.designNotes || [];
    updateActiveRing('designNotes', [...current, { text: '' }]);
  };

  const removeDesignNote = (idx: number) => {
    if (!activeRing) return;
    updateActiveRing('designNotes', activeRing.designNotes.filter((_, i) => i !== idx));
  };

  const updateDesignNote = (idx: number, val: string) => {
    if (!activeRing) return;
    updateActiveRing('designNotes', activeRing.designNotes.map((dn, i) => i === idx ? { text: val } : dn));
  };

  // Add Item callback
  const handleAddNewItem = (category: CategoryType) => {
    const newItem = getEmptyRing(category);
    onChangeSession(prev => ({
      ...prev,
      rings: [...prev.rings, newItem],
      activeSubTab: newItem.id
    }));
    setShowAddModal(false);
  };

  // Remove Entire Item Piece
  const handleRemoveItem = (id: string) => {
    onChangeSession(prev => {
      const remaining = prev.rings.filter(r => r.id !== id);
      return {
        ...prev,
        rings: remaining,
        activeSubTab: remaining.length > 0 ? remaining[0].id : ''
      };
    });
  };

  const handleLinkLatestScrap = () => {
    try {
      const raw = localStorage.getItem('gr_scrap_ledger');
      if (raw) {
        const items = JSON.parse(raw);
        if (items && items.length > 0) {
          const latest = items[0];
          const payout = latest.payoutAmount || 0;
          if (payout > 0) {
            onChangeSession(prev => ({ ...prev, scrapCredit: parseFloat(payout.toFixed(2)) }));
            alert(`Successfully linked latest scrap buyout of $${payout.toFixed(2)} CAD as a credit!`);
            return;
          }
        }
      }
      alert("No recent scrap transactions found in ledger.");
    } catch (e) {
      alert("Could not access ledger histories: " + String(e));
    }
  };

  // Session Totals Compile
  const compileSessionCost = () => {
    let grossTotal = 0;
    let totalDiscount = 0;
    
    session.rings.forEach(r => {
      if (!hasRingData(r)) return;
      const cost = calculateRingCost(r, settings, spotPrices, isWholesale ? 'wholesale' : 'retail', session.overridePrices, isWholesale ? session.wholesaleProfileId : undefined);
      grossTotal += cost;
      
      const val = parseFloat(r.discount) || 0;
      totalDiscount += r.discountType === '%' ? cost * (val / 100) : val;
    });

    const subtotal = Math.max(0, grossTotal - totalDiscount - Number(session.scrapCredit));
    const tax = session.applyTax ? subtotal * 0.12 : 0;
    const grandTotal = subtotal + tax;

    return {
      grossTotal,
      totalDiscount,
      subtotal,
      tax,
      grandTotal
    };
  };

  const totals = compileSessionCost();

  const getConsolidatedStones = () => {
    const list: Array<{
      source: 'customer' | 'company';
      category: string;
      shape: string;
      sizeLabel: string;
      qty: number;
      totalCarats: number;
      pieces: number[];
    }> = [];

    session.rings.filter(r => hasRingData(r)).forEach((r, ri) => {
      const pNum = ri + 1;

      // 1. Center Stone 1
      if (r.centerStone?.carats) {
        const qty = 1;
        const source = r.stoneSource === 'customer' ? 'customer' : 'company';
        const totalCarats = parseFloat(r.centerStone.carats) || 0;
        const shape = r.centerStone.shape || 'Round';
        const category = 'Center Stone';
        const sizeLabel = r.centerStone.type ? `${r.centerStone.type} (${r.centerStone.origin})` : 'Center';

        list.push({ source, category, shape, sizeLabel, qty, totalCarats, pieces: [pNum] });
      }

      // 2. Center Stone 2 (Pair)
      if (r.centerStone2?.carats) {
        const qty = 1;
        const source = r.stoneSource === 'customer' ? 'customer' : 'company';
        const totalCarats = parseFloat(r.centerStone2.carats) || 0;
        const shape = r.centerStone2.shape || 'Round';
        const category = 'Center Stone (Pair)';
        const sizeLabel = r.centerStone2.type ? `${r.centerStone2.type} (${r.centerStone2.origin})` : 'Center 2';

        list.push({ source, category, shape, sizeLabel, qty, totalCarats, pieces: [pNum] });
      }

      // 3. Melee Accent Stones
      r.melee.filter(m => parseInt(m.qty) > 0).forEach(m => {
        const qty = parseInt(m.qty) || 0;
        const caratPerStone = parseFloat(m.carat) || 0;
        const totalCarats = qty * caratPerStone;
        const sizeLabel = m.size ? `${m.size}mm` : 'Round Melee';

        list.push({
          source: 'company',
          category: 'Melee Accent',
          shape: 'Round Brilliant',
          sizeLabel,
          qty,
          totalCarats,
          pieces: [pNum]
        });
      });

      // 4. Fancy Accent Stones
      r.fancy.filter(f => parseInt(f.qty) > 0).forEach(f => {
        const qty = parseInt(f.qty) || 0;
        const currentShape = f.shape || 'Princess';
        const sizes = FANCY_SHAPES[currentShape] || [];
        const activeSize = sizes[f.sizeIdx] || { label: 'Fancy Melee', carat: 0 };
        const totalCarats = qty * (activeSize.carat || 0);

        list.push({
          source: 'company',
          category: 'Fancy Accent',
          shape: currentShape,
          sizeLabel: activeSize.label,
          qty,
          totalCarats,
          pieces: [pNum]
        });
      });

      // 5. Client Owned Stones
      if (Array.isArray(r.clientStones)) {
        r.clientStones.filter(cs => parseInt(cs.qty) > 0).forEach(cs => {
          const qty = parseInt(cs.qty) || 0;
          const isFancy = cs.type === 'Fancy';
          let shape = 'Round Brilliant';
          let sizeLabel = cs.size || '--';
          let totalCarats = cs.carats ? (parseFloat(cs.carats) || 0) : 0;
          const category = cs.type === 'Center' ? 'Center Stone' : cs.type === 'Fancy' ? 'Fancy Accent' : 'Melee Accent';

          if (isFancy) {
            const currentShape = cs.shape || 'Princess';
            const sizes = FANCY_SHAPES[currentShape] || [];
            const activeSize = sizes[cs.sizeIdx !== undefined ? cs.sizeIdx : 0];
            shape = currentShape;
            sizeLabel = activeSize ? activeSize.label : 'Fancy Melee';
            totalCarats = qty * (activeSize ? activeSize.carat : 0);
          } else if (cs.type === 'Melee') {
            shape = 'Round Brilliant';
            sizeLabel = cs.size ? `${cs.size}mm` : 'Round Melee';
            totalCarats = qty * (ROUND_MELEE[cs.size || '1.5'] || 0.015);
          } else if (cs.type === 'Center') {
            shape = r.centerStone?.shape || 'Round';
          }

          list.push({
            source: 'customer',
            category,
            shape,
            sizeLabel,
            qty,
            totalCarats,
            pieces: [pNum]
          });
        });
      }
    });

    const grouped: Record<string, typeof list[number]> = {};
    list.forEach(item => {
      const key = `${item.source}_${item.category}_${item.shape}_${item.sizeLabel}`;
      if (!grouped[key]) {
        grouped[key] = { ...item };
      } else {
        grouped[key].qty += item.qty;
        grouped[key].totalCarats += item.totalCarats;
        item.pieces.forEach(p => {
          if (!grouped[key].pieces.includes(p)) {
            grouped[key].pieces.push(p);
          }
        });
      }
    });

    return Object.values(grouped).sort((a, b) => {
      if (a.source !== b.source) {
        return a.source === 'company' ? -1 : 1;
      }
      const order = ['Center Stone', 'Center Stone (Pair)', 'Fancy Accent', 'Melee Accent'];
      const idxA = order.indexOf(a.category);
      const idxB = order.indexOf(b.category);
      if (idxA !== idxB) {
        return idxA - idxB;
      }
      return a.shape.localeCompare(b.shape) || a.sizeLabel.localeCompare(b.sizeLabel);
    });
  };

  const consolidatedStones = getConsolidatedStones();

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* 1. Client Intake Form */}
      {!isWholesale ? (
        <div className="bg-[#f8fafc] rounded-2xl border border-slate-200/60 p-5 shadow-sm print:hidden">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Client Intake</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">CLIENT NAME *</label>
              <input
                type="text"
                placeholder="Required for billing"
                autoComplete="name"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold shadow-sm outline-none focus:border-slate-400"
                value={session.cName}
                onChange={(e) => onChangeSession(prev => ({ ...prev, cName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">PHONE</label>
              <input
                type="tel"
                placeholder="604-555-5555"
                autoComplete="tel"
                className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold shadow-sm outline-none focus:border-slate-400"
                value={session.cPhone}
                onChange={(e) => onChangeSession(prev => ({ ...prev, cPhone: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">EMAIL</label>
              <input
                type="email"
                placeholder="name@gmail.com"
                autoComplete="email"
                autoCorrect="off"
                autoCapitalize="none"
                className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold shadow-sm outline-none focus:border-slate-400"
                value={session.cEmail}
                onChange={(e) => onChangeSession(prev => ({ ...prev, cEmail: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">PIECE DESCRIPTION</label>
              <input
                type="text"
                placeholder="e.g. 1.5ct Solitaire Engagement Ring"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold shadow-sm outline-none focus:border-slate-400"
                value={session.jobDesc}
                onChange={(e) => onChangeSession(prev => ({ ...prev, jobDesc: e.target.value }))}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#f0fdf4] rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-4 print:hidden">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Wholesale Account Intake</h3>
            {session.wholesaleProfileId && (
              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full">
                Custom Rates Active: {settings.wholesaleProfiles?.find(p => p.id === session.wholesaleProfileId)?.name}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-emerald-700 mb-1 block">JOB # *</label>
              <input
                type="text"
                placeholder="e.g. Job #8859"
                className="w-full bg-white border border-emerald-200 p-3 rounded-xl text-xs font-bold shadow-sm outline-none focus:border-emerald-400"
                value={session.jobNum}
                onChange={(e) => onChangeSession(prev => ({ ...prev, jobNum: e.target.value }))}
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-[10px] font-bold text-emerald-700 mb-1 block">ITEM DESCRIPTION</label>
              <input
                type="text"
                placeholder="e.g. 14K Solitaire Ring with 4 Claws"
                className="w-full bg-white border border-emerald-200 p-3 rounded-xl text-xs font-bold shadow-sm outline-none focus:border-emerald-400"
                value={session.jobDesc}
                onChange={(e) => onChangeSession(prev => ({ ...prev, jobDesc: e.target.value }))}
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-[10px] font-bold text-emerald-700 mb-1 block">WHOLESALE PROFILE</label>
              <select
                className="w-full bg-white border border-emerald-200 p-3 rounded-xl text-xs font-bold shadow-sm outline-none focus:border-emerald-400"
                value={session.wholesaleProfileId || ""}
                onChange={(e) => {
                  const profileId = e.target.value;
                  onChangeSession(prev => {
                    const selectedProfile = settings.wholesaleProfiles?.find(p => p.id === profileId);
                    return {
                      ...prev,
                      wholesaleProfileId: profileId || undefined,
                      cName: selectedProfile ? selectedProfile.name : prev.cName
                    };
                  });
                }}
              >
                <option value="">Default Rates</option>
                {(settings.wholesaleProfiles || []).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-emerald-700 mb-1 block">CLIENT NAME</label>
              <input
                type="text"
                placeholder="Store / Name"
                autoComplete="name"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-white border border-emerald-200 p-3 rounded-xl text-xs font-bold shadow-sm outline-none focus:border-emerald-400"
                value={session.cName}
                onChange={(e) => onChangeSession(prev => ({ ...prev, cName: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-emerald-700 mb-1 block">PHONE</label>
              <input
                type="tel"
                placeholder="604-555-5555"
                autoComplete="tel"
                className="w-full bg-white border border-emerald-200 p-3 rounded-xl text-xs font-bold shadow-sm outline-none focus:border-emerald-400"
                value={session.cPhone}
                onChange={(e) => onChangeSession(prev => ({ ...prev, cPhone: e.target.value }))}
              />
            </div>
          </div>

          {/* Spot override bar */}
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200/60 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">JOB METAL SPOT OVERRIDES (CAD/OZ)</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <div>
                <span className="text-[9px] font-bold text-emerald-700 block mb-1">JOB GOLD SPOT</span>
                <input
                  type="number"
                  className="p-2 border border-emerald-200 rounded-xl font-bold text-xs bg-white text-emerald-900 w-28 outline-none focus:border-emerald-400"
                  value={session.overridePrices?.gold ?? spotPrices.gold}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    onChangeSession(prev => ({
                      ...prev,
                      overridePrices: { ...(prev.overridePrices || {}), gold: val }
                    }));
                  }}
                />
              </div>
              <div>
                <span className="text-[9px] font-bold text-emerald-700 block mb-1">JOB PLAT SPOT</span>
                <input
                  type="number"
                  className="p-2 border border-emerald-200 rounded-xl font-bold text-xs bg-white text-emerald-900 w-28 outline-none focus:border-emerald-400"
                  value={session.overridePrices?.platinum ?? spotPrices.platinum}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    onChangeSession(prev => ({
                      ...prev,
                      overridePrices: { ...(prev.overridePrices || {}), platinum: val }
                    }));
                  }}
                />
              </div>
              <div>
                <span className="text-[9px] font-bold text-emerald-700 block mb-1">JOB SILVER SPOT</span>
                <input
                  type="number"
                  className="p-2 border border-emerald-200 rounded-xl font-bold text-xs bg-white text-emerald-900 w-28 outline-none focus:border-emerald-400"
                  value={session.overridePrices?.silver ?? spotPrices.silver}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    onChangeSession(prev => ({
                      ...prev,
                      overridePrices: { ...(prev.overridePrices || {}), silver: val }
                    }));
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Grand Total / Session Breakdown Banner */}
      {!isWholesale ? (
        <div className="bg-[#0f172a] text-white rounded-3xl p-6 shadow-md relative overflow-hidden print:hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-[#1e293b] to-slate-900 opacity-50"></div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Left Side: Piece Breakdown */}
            <div className="space-y-3.5 border-r border-slate-700/40 pr-0 md:pr-6 text-left">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">PIECE BREAKDOWN</div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-xs">
                {session.rings.map((r, ri) => {
                  if (!hasRingData(r)) return null;
                  const cost = calculateRingCost(r, settings, spotPrices, 'retail');
                  const discVal = parseFloat(r.discount) || 0;
                  const discDeduction = r.discountType === '%' ? cost * (discVal / 100) : discVal;
                  const finalPieceCost = Math.max(0, cost - discDeduction);
                  const rawCost = calculateRawCost(r, settings, spotPrices);
                  const showRawBreakdown = settings.showRawCostOnQuoteTab;
                  const isDiscountOpen = !!openDiscounts[r.id];

                  return (
                    <div key={r.id} className="space-y-1.5 py-1.5 border-b border-slate-800/40 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="truncate font-bold text-slate-200 flex items-center gap-1.5">
                          Piece {ri + 1}: {r.category === 'customRing' ? 'Engagement' : r.category === 'weddingBand' ? 'Band' : r.category === 'mensBand' ? "Men's" : r.category === 'pendant' ? 'Pendant' : r.category === 'earrings' ? 'Earrings' : 'Tennis'}
                          <button
                            type="button"
                            onClick={() => setOpenDiscounts(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                            className={`p-1 rounded-lg transition-all cursor-pointer ${
                              discVal > 0 
                                ? 'bg-amber-400/20 text-amber-300 hover:bg-amber-400/30' 
                                : isDiscountOpen
                                  ? 'bg-slate-700 text-white'
                                  : 'bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                            title="Apply Discount"
                          >
                            <Tag size={10} className={discVal > 0 ? "animate-pulse" : ""} />
                          </button>
                        </span>
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-[#f1c40f]">${finalPieceCost.toFixed(2)}</span>
                          {discVal > 0 && (
                            <span className="text-[9px] text-red-400 font-bold font-mono">
                              (Disc. -{r.discountType === '%' ? `${discVal}%` : `$${discVal}`})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Interactive Discount Area (Toggleable) */}
                      {isDiscountOpen && (
                        <div className="flex items-center gap-1.5 mt-1 bg-slate-950/80 border border-slate-800/80 px-2 py-1.5 rounded-xl transition-all animate-fadeIn">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider shrink-0">Discount:</span>
                          <div className="flex rounded-lg overflow-hidden border border-slate-700/80 shrink-0 bg-slate-950">
                            <button
                              type="button"
                              onClick={() => {
                                onChangeSession(prev => ({
                                  ...prev,
                                  rings: prev.rings.map(item => item.id === r.id ? { ...item, discountType: '$' } : item)
                                }));
                              }}
                              className={`px-2 py-0.5 text-[10px] font-black transition-all ${r.discountType === '$' || !r.discountType ? 'bg-brand-gold text-slate-950 font-extrabold shadow-inner' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
                            >
                              $
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onChangeSession(prev => ({
                                  ...prev,
                                  rings: prev.rings.map(item => item.id === r.id ? { ...item, discountType: '%' } : item)
                                }));
                              }}
                              className={`px-2 py-0.5 text-[10px] font-black transition-all ${r.discountType === '%' ? 'bg-brand-gold text-slate-950 font-extrabold shadow-inner' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
                            >
                              %
                            </button>
                          </div>
                          <input
                            type="number"
                            value={r.discount || ''}
                            placeholder="0"
                            onChange={(e) => {
                              const val = e.target.value;
                              onChangeSession(prev => ({
                                ...prev,
                                rings: prev.rings.map(item => item.id === r.id ? { ...item, discount: val } : item)
                              }));
                            }}
                            className="w-16 bg-slate-950 border border-slate-800 text-[11px] text-[#f1c40f] font-mono font-bold text-center rounded-lg px-1.5 py-0.5 outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold"
                          />
                          {discVal > 0 && (
                            <span className="text-[10px] text-red-400 font-bold ml-auto font-mono">
                              -${discDeduction.toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}

                      {showRawBreakdown && (
                        <div className="flex justify-between items-center text-[10px] text-amber-400 bg-amber-950/40 border border-amber-900/50 px-2 py-1 rounded-lg mt-1 font-bold animate-fadeIn">
                          <span className="uppercase tracking-wider flex items-center gap-1">
                            <Sparkles size={10} className="text-brand-gold animate-pulse" />
                            Internal Raw Cost:
                          </span>
                          <span>${rawCost.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {settings.showRawCostOnQuoteTab && (() => {
                  let totalSessionRawCost = 0;
                  session.rings.forEach(r => {
                    if (hasRingData(r)) {
                      totalSessionRawCost += calculateRawCost(r, settings, spotPrices);
                    }
                  });
                  return (
                    <div className="flex justify-between items-center text-amber-300 font-bold border-t border-dashed border-amber-900/50 pt-2 pb-1 bg-amber-950/20 px-2.5 rounded-lg border border-amber-900/30 animate-fadeIn">
                      <span className="uppercase text-[9px] tracking-wider">Total Est. Raw Cost:</span>
                      <span>${totalSessionRawCost.toFixed(2)}</span>
                    </div>
                  );
                })()}

                {Number(session.scrapCredit) > 0 && (
                  <div className="flex justify-between items-center text-green-400 font-bold border-t border-slate-800 pt-1.5">
                    <span>Scrap Buyback Credit</span>
                    <span>-${Number(session.scrapCredit).toFixed(2)}</span>
                  </div>
                )}

                {session.applyTax && (
                  <div className="flex justify-between items-center text-slate-400 font-bold border-t border-slate-800 pt-1.5">
                    <span>Tax (12% BC)</span>
                    <span>+${totals.tax.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-700/40 pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="retailTaxCheckbox"
                  className="w-4 h-4 text-brand-gold bg-slate-800 border-slate-700 rounded focus:ring-brand-gold accent-brand-gold cursor-pointer"
                  checked={session.applyTax}
                  onChange={(e) => onChangeSession(prev => ({ ...prev, applyTax: e.target.checked }))}
                />
                <label htmlFor="retailTaxCheckbox" className="text-xs text-slate-300 font-bold tracking-wider uppercase select-none cursor-pointer">
                  + Tax (12% BC)
                </label>
              </div>
            </div>

            {/* Right Side: Estimated Total */}
            <div className="text-center md:text-right space-y-1 pl-0 md:pl-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ESTIMATED TOTAL DUE</p>
              <h1 className="text-5xl md:text-6xl font-serif italic font-black text-[#f1c40f] tracking-tight">
                ${totals.grandTotal.toFixed(2)}
              </h1>
              <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Calculated CAD Valuation</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0f2d24] text-white rounded-3xl p-6 shadow-md relative overflow-hidden print:hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#061f18] via-[#0d2d22] to-[#061f18] opacity-50"></div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Left Side: Breakdown list */}
            <div className="space-y-3.5 border-r border-[#155e46]/40 pr-0 md:pr-6">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1.5">SESSION BREAKDOWN</div>
              
              {(() => {
                const wb = getWholesaleBreakdown();
                return (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs text-slate-300 font-mono">
                        <span className="font-bold text-emerald-300">Raw Metal Cost:</span>
                        <span className="font-bold text-white">${wb.rawMetalCost.toFixed(2)}</span>
                      </div>
                      {wb.rawMetalDetails.map((det, idx) => (
                        <div key={idx} className="text-[9px] text-slate-400 font-mono pl-3 leading-tight">• {det}</div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs text-slate-300 font-mono">
                        <span className="font-bold text-emerald-300">Fabrication Labor:</span>
                        <span className="font-bold text-white">${wb.fabLabor.toFixed(2)}</span>
                      </div>
                      {wb.fabLaborDetails.map((det, idx) => (
                        <div key={idx} className="text-[9px] text-slate-400 font-mono pl-3 leading-tight">• {det}</div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs text-slate-300 font-mono">
                        <span className="font-bold text-emerald-300">Setting Labor:</span>
                        <span className="font-bold text-white">${wb.settingLabor.toFixed(2)}</span>
                      </div>
                      {wb.settingLaborDetails.map((det, idx) => (
                        <div key={idx} className="text-[9px] text-slate-400 font-mono pl-3 leading-tight">• {det}</div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs text-slate-300 font-mono">
                        <span className="font-bold text-emerald-300">Stone Supply Cost:</span>
                        <span className="font-bold text-white">${wb.stoneSupplyCost.toFixed(2)}</span>
                      </div>
                      {wb.stoneSupplyDetails.map((det, idx) => (
                        <div key={idx} className="text-[9px] text-slate-400 font-mono pl-3 leading-tight">• {det}</div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs text-slate-300 font-mono">
                        <span className="font-bold text-emerald-300">Design / Addons:</span>
                        <span className="font-bold text-white">${wb.designAddons.toFixed(2)}</span>
                      </div>
                      {wb.designAddonsDetails.map((det, idx) => (
                        <div key={idx} className="text-[9px] text-slate-400 font-mono pl-3 leading-tight">• {det}</div>
                      ))}
                    </div>
                  </>
                );
              })()}

              <div className="border-t border-[#155e46]/40 pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="wholesaleTaxCheckbox"
                  className="w-4 h-4 text-[#f1c40f] bg-emerald-950 border-emerald-800 rounded accent-[#f1c40f] cursor-pointer"
                  checked={session.applyTax}
                  onChange={(e) => onChangeSession(prev => ({ ...prev, applyTax: e.target.checked }))}
                />
                <label htmlFor="wholesaleTaxCheckbox" className="text-[10px] text-slate-300 font-bold tracking-wider uppercase select-none cursor-pointer">
                  Apply BC Tax (12%)
                </label>
              </div>
            </div>

            {/* Right Side: Final Balance */}
            <div className="text-center md:text-right space-y-1 pl-0 md:pl-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">FINAL BALANCE</p>
              <h1 className="text-5xl md:text-6xl font-serif italic font-black text-[#f1c40f] tracking-tight">
                ${totals.grandTotal.toFixed(2)}
              </h1>
              <p className="text-[9px] text-emerald-300/80 font-mono uppercase tracking-wider">Estimated Balance CAD</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Capsule Tabs Bar */}
      <div className="flex overflow-x-auto hide-scrollbar whitespace-nowrap items-center gap-2 border-b border-slate-100 pb-3 print:hidden">
        {session.rings.map((r, idx) => {
          const isSelected = session.activeSubTab === r.id;
          const label = r.category === 'customRing' ? 'Engagement' 
                      : r.category === 'weddingBand' ? 'Wedding Band'
                      : r.category === 'mensBand' ? "Men's Band"
                      : r.category === 'pendant' ? 'Pendant'
                      : r.category === 'earrings' ? 'Earrings'
                      : 'Tennis Bracelet';
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onChangeSession(prev => ({ ...prev, activeSubTab: r.id }))}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-1.5 shadow-sm cursor-pointer ${
                isSelected 
                  ? 'bg-slate-900 text-[#f1c40f] border-slate-900 font-bold' 
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              {label}
              {session.rings.length >= 1 && (
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveItem(r.id);
                  }}
                  className="ml-1 text-slate-400 hover:text-red-500 font-bold"
                >
                  ✕
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-600 hover:bg-slate-100 border border-dashed border-slate-300 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
        >
          <Plus size={11} className="text-[#f1c40f]" />
          Add Piece
        </button>

        <button
          key="summary"
          type="button"
          onClick={() => onChangeSession(prev => ({ ...prev, activeSubTab: 'summary' }))}
          className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-1.5 shadow-sm ml-auto cursor-pointer ${
            session.activeSubTab === 'summary' 
              ? 'bg-slate-900 text-[#f1c40f] border-slate-900' 
              : 'bg-[#0f172a] text-white hover:bg-slate-800 border-slate-800'
          }`}
        >
          <FileText size={12} />
          ✓ Finalize Summary
        </button>
      </div>

        {/* PIECE PARAMETERS EDITOR LAYOUT */}
        {session.activeSubTab !== 'summary' && activeRing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start animate-fadeIn">
            {/* COLUMN 1: Metal Attributes, Sketches & Pricing Summary */}
            <div className="space-y-6">
              {/* Piece Specifications Card */}
              <div className="space-y-6 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
              {/* Header: Name Category */}
              <div className="flex justify-between items-center border-b border-brand-100 pb-3">
                <h2 className="text-xs font-black text-brand-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Compass size={14} className="text-[#f1c40f]" />
                  Piece Specifications
                </h2>
                <span className="bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border border-brand-200">
                  Category: {activeRing.category === 'customRing' ? 'Engagement / Custom' : activeRing.category === 'weddingBand' ? 'Wedding Band' : activeRing.category === 'mensBand' ? "Men's Band" : activeRing.category === 'pendant' ? 'Pendant' : activeRing.category === 'earrings' ? 'Earrings Pair' : 'Tennis Bracelet'}
                </span>
              </div>

              {/* SECTION 1: Metal & Density Inputs */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-brand-400 uppercase tracking-wider block border-b border-brand-50 pb-1">1. Metal Attributes</h3>
                
                <div className="space-y-4">
                  {/* Visual Metal Material Select Grid */}
                  <div>
                    <label className="text-[9px] font-black text-brand-500 uppercase tracking-wider block mb-1.5">Metal Material</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'gold', name: 'Gold', dot: 'bg-amber-400 ring-amber-100' },
                        { id: 'silver', name: 'Silver', dot: 'bg-slate-300 ring-slate-100' },
                        { id: 'platinum', name: 'Platinum', dot: 'bg-indigo-200 ring-indigo-100' }
                      ].map(item => {
                        const isSel = activeRing.material === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              updateActiveRing('material', item.id as MaterialType);
                              // Auto-set color to White if silver or platinum to prevent invalid states
                              if (item.id !== 'gold') {
                                updateActiveRing('metalColor', 'White');
                              }
                            }}
                            className={`py-2 px-1 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                              isSel 
                                ? 'bg-brand-900 border-brand-900 text-brand-gold font-bold ring-2 ring-brand-900/10'
                                : 'bg-white border-brand-200 text-brand-700 hover:border-brand-300'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ring-4 ${item.dot}`}></span>
                            {item.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Visual Metal Color Select Grid */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[9px] font-black text-brand-500 uppercase tracking-wider block">Metal Color</label>
                      {activeRing.material !== 'gold' && (
                        <span className="text-[8px] text-brand-400 font-bold uppercase font-mono bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100">Auto White Match</span>
                      )}
                    </div>
                    
                    {activeRing.material === 'gold' ? (
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'Yellow', name: 'Yellow', color: 'bg-[#f1c40f] border-[#f39c12]' },
                          { id: 'White', name: 'White', color: 'bg-[#eaeded] border-[#bdc3c7]' },
                          { id: 'Rose', name: 'Rose', color: 'bg-[#e59866] border-[#d35400]' }
                        ].map(item => {
                          const isSel = activeRing.metalColor === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => updateActiveRing('metalColor', item.id as MetalColorType)}
                              className={`py-2 px-1 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                                isSel 
                                  ? 'bg-brand-900 border-brand-900 text-brand-gold font-bold ring-2 ring-brand-900/10'
                                  : 'bg-white border-brand-200 text-brand-700 hover:border-brand-300'
                              }`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full border ${item.color}`}></span>
                              {item.name}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-brand-50/50 border border-brand-200/60 p-2.5 rounded-xl text-xs font-bold text-brand-600 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full border bg-[#eaeded] border-[#bdc3c7] shrink-0"></span>
                        <span>White {activeRing.material === 'platinum' ? 'Platinum' : 'Silver'} (Default)</span>
                      </div>
                    )}
                  </div>

                  {/* Row for Karat and Grams */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Karat select (Gold only) */}
                    {activeRing.material === 'gold' ? (
                      <div>
                        <label className="text-[9px] font-black text-brand-500 uppercase tracking-wider block mb-1">Purity Karat</label>
                        <select
                          value={activeRing.goldKarat}
                          onChange={(e) => updateActiveRing('goldKarat', parseInt(e.target.value))}
                          className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-xs font-bold"
                        >
                          {PURITY_OPTIONS.gold.map((karat) => (
                            <option key={karat} value={karat}>{karat}k</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[9px] font-black text-brand-400 uppercase tracking-wider block mb-1">Purity Level</label>
                        <div className="bg-brand-50/50 border border-brand-200/60 p-2.5 rounded-xl text-xs font-bold text-brand-600">
                          {activeRing.material === 'platinum' ? '95.0% pure (950)' : '92.5% pure (Sterling)'}
                        </div>
                      </div>
                    )}

                    {/* Metal Weight Grams */}
                    {activeRing.category !== 'mensBand' && activeRing.category !== 'tennisBracelet' ? (
                      <div>
                        <label className="text-[9px] font-black text-brand-500 uppercase tracking-wider block mb-1">Metal Grams</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          className="w-full bg-brand-50/50 border border-brand-200 p-2.5 rounded-xl text-xs font-bold no-spinner"
                          value={activeRing.goldGrams}
                          onChange={(e) => updateActiveRing('goldGrams', e.target.value)}
                        />
                      </div>
                    ) : activeRing.category === 'mensBand' ? (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[9px] font-black text-brand-400 uppercase tracking-wider block">Metal weight</label>
                          <button
                            type="button"
                            onClick={() => {
                              const nextOverride = !activeRing.mbOverrideWeight;
                              updateActiveRing('mbOverrideWeight', nextOverride);
                              if (!nextOverride) {
                                // If locking it, reset back to calculated value immediately
                                const calculated = calculateBandWeight(activeRing);
                                updateActiveRing('goldGrams', calculated);
                              }
                            }}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-all ${
                              activeRing.mbOverrideWeight
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                                : 'bg-brand-100 text-brand-800 hover:bg-brand-200 border border-brand-200'
                            }`}
                          >
                            {activeRing.mbOverrideWeight ? (
                              <>
                                <Unlock size={10} className="text-amber-600 shrink-0" />
                                Unlocked (Override)
                              </>
                            ) : (
                              <>
                                <Lock size={10} className="text-brand-600 shrink-0" />
                                Locked (Calculated)
                              </>
                            )}
                          </button>
                        </div>
                        {activeRing.mbOverrideWeight ? (
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="w-full bg-amber-50/30 border border-amber-300 p-2.5 pr-8 rounded-xl text-xs font-bold text-brand-900 no-spinner font-mono"
                              value={activeRing.goldGrams}
                              onChange={(e) => updateActiveRing('goldGrams', e.target.value)}
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-brand-400 font-bold font-mono">g</span>
                          </div>
                        ) : (
                          <div className="bg-brand-50/50 border border-brand-200/60 p-2.5 rounded-xl text-xs font-bold text-brand-800 font-mono flex justify-between items-center">
                            <span>{activeRing.goldGrams || '0.00'}g</span>
                            <span className="text-[9px] text-brand-400 font-black uppercase tracking-wider font-sans">Auto-Calculated</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="text-[9px] font-black text-brand-400 uppercase tracking-wider block mb-1">Metal weight</label>
                        <div className="bg-brand-50/50 border border-brand-200/60 p-2.5 rounded-xl text-xs font-bold text-brand-800 font-mono">
                          {activeRing.goldGrams || '0.00'}g (Calculated)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Specific Dimensions Inputs */}
              {activeRing.category === 'mensBand' && (
                <div className="flex flex-col gap-5 bg-brand-50/50 p-4 rounded-2xl border border-brand-100">
                  {/* Ring Size Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-brand-700 uppercase tracking-wider font-black">Ring Size (US)</span>
                      <span className="text-brand-900 font-mono font-black bg-white px-1.5 py-0.5 rounded border border-brand-100">
                        {(parseFloat(activeRing.mbSize) || 8.0).toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="4.0"
                      max="15.0"
                      step="0.25"
                      value={parseFloat(activeRing.mbSize) || 8.0}
                      onChange={(e) => updateActiveRing('mbSize', e.target.value)}
                      className="w-full accent-brand-900 cursor-pointer h-1.5 bg-brand-200/60 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[7px] text-brand-400 font-black font-mono">
                      <span>Size 4.0 (Small)</span>
                      <span>8.0 (Average)</span>
                      <span>15.0 (Large)</span>
                    </div>
                  </div>

                  {/* Width Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-brand-700 uppercase tracking-wider font-black">Band Width</span>
                      <span className="text-brand-900 font-mono font-black bg-white px-1.5 py-0.5 rounded border border-brand-100">
                        {(parseFloat(activeRing.mbWidth) || 5.0).toFixed(1)} mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min="2.0"
                      max="12.0"
                      step="0.1"
                      value={parseFloat(activeRing.mbWidth) || 5.0}
                      onChange={(e) => updateActiveRing('mbWidth', e.target.value)}
                      className="w-full accent-brand-900 cursor-pointer h-1.5 bg-brand-200/60 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[7px] text-brand-400 font-black font-mono">
                      <span>2.0mm (Sleek)</span>
                      <span>5.0mm (Classic)</span>
                      <span>12.0mm (Statement)</span>
                    </div>
                  </div>

                  {/* Thickness Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-brand-700 uppercase tracking-wider font-black">Band Thickness</span>
                      <span className="text-brand-900 font-mono font-black bg-white px-1.5 py-0.5 rounded border border-brand-100">
                        {(parseFloat(activeRing.mbThickness) || 1.7).toFixed(1)} mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="3.5"
                      step="0.1"
                      value={parseFloat(activeRing.mbThickness) || 1.7}
                      onChange={(e) => updateActiveRing('mbThickness', e.target.value)}
                      className="w-full accent-brand-900 cursor-pointer h-1.5 bg-brand-200/60 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[7px] text-brand-400 font-black font-mono">
                      <span>1.0mm (Ultra-thin)</span>
                      <span>1.7mm (Medium)</span>
                      <span>3.5mm (Heavy-duty)</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-brand-100">
                    <label className="text-[9px] font-bold text-brand-500 uppercase tracking-wider block mb-1">Ring Profile Shape (Cross-Section)</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-9 gap-2">
                      {PROFILE_SHAPES.map((shape) => {
                        const isSelected = (activeRing.mbProfile || 'Flat') === shape.id;
                        const colors = getMetalGradientColors(activeRing.material, activeRing.metalColor);
                        return (
                          <button
                            key={shape.id}
                            type="button"
                            onClick={() => updateActiveRing('mbProfile', shape.id)}
                            className={`p-1.5 pb-2 rounded-xl border transition-all flex flex-col items-center text-center justify-between min-h-[76px] w-full ${
                              isSelected
                                ? 'bg-brand-900 border-brand-900 text-white shadow-md'
                                : 'bg-white border-brand-100 text-brand-800 hover:border-brand-300'
                            }`}
                          >
                            <div className="w-full h-10 flex items-center justify-center my-0.5">
                              <svg width="60" height="36" viewBox="0 0 80 50" className="max-w-full max-h-full">
                                <defs>
                                  <linearGradient id={`metalGrad-${shape.id}-${activeRing.id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={colors.stop1} />
                                    <stop offset="50%" stopColor={colors.stop2} />
                                    <stop offset="100%" stopColor={colors.stop3} />
                                  </linearGradient>
                                </defs>
                                <path
                                  d={shape.path}
                                  fill={`url(#metalGrad-${shape.id}-${activeRing.id})`}
                                  stroke={colors.stroke}
                                  strokeWidth="1.5"
                                  strokeLinejoin="round"
                                />
                                {shape.inlayPath && (
                                  <path
                                    d={shape.inlayPath}
                                    fill="#1e293b"
                                    stroke="#0f172a"
                                    strokeWidth="1"
                                    strokeLinejoin="round"
                                  />
                                )}
                              </svg>
                            </div>
                            <div className="mt-0.5 w-full">
                              <span className="text-[9px] font-black block leading-tight truncate">{shape.name}</span>
                              <span className={`text-[7px] font-mono font-bold block ${isSelected ? 'text-brand-gold' : 'text-brand-500'}`}>
                                {Math.round(parseFloat(shape.factor) * 100)}% wt
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {/* Live Profile Simulator (2D Cross-Section Viewer) */}
                    {(() => {
                      const widthVal = parseFloat(activeRing.mbWidth) || 5.0;
                      const thicknessVal = parseFloat(activeRing.mbThickness) || 1.7;
                      const activeProfileId = activeRing.mbProfile || 'Flat';
                      const selectedProfile = PROFILE_SHAPES.find(s => s.id === activeProfileId) || PROFILE_SHAPES[0];
                      const profileColors = getMetalGradientColors(activeRing.material, activeRing.metalColor);

                      // Clamped dimensions for SVG visualization so it doesn't overflow
                      const w = Math.max(2.0, Math.min(12.0, widthVal));
                      const t = Math.max(1.0, Math.min(4.0, thicknessVal));

                      const SCALE = 22; // 22 pixels per mm
                      const cx = 200;
                      const cy = 150; // baseline

                      const w_px = w * SCALE;
                      const t_px = t * SCALE;
                      const xStart = cx - w_px / 2;
                      const xEnd = cx + w_px / 2;
                      const yBottom = cy;
                      const yTop = cy - t_px;

                      // Generate paths dynamically based on selected shape
                      let d = '';
                      let inlayD = '';

                      if (activeProfileId === 'Flat') {
                        d = `M ${xStart} ${yBottom} L ${xEnd} ${yBottom} L ${xEnd} ${yTop} L ${xStart} ${yTop} Z`;
                      } else if (activeProfileId === 'Dome') {
                        const wall = t_px * 0.15;
                        const yWall = yBottom - wall;
                        d = `M ${xStart} ${yBottom} L ${xEnd} ${yBottom} L ${xEnd} ${yWall} Q ${cx} ${yTop} ${xStart} ${yWall} Z`;
                      } else if (activeProfileId === 'HalfRound') {
                        d = `M ${xStart} ${yBottom} L ${xEnd} ${yBottom} Q ${cx} ${yTop} ${xStart} ${yBottom} Z`;
                      } else if (activeProfileId === 'Comfort') {
                        const bottomEdge = yBottom - t_px * 0.15;
                        d = `M ${xStart} ${bottomEdge} Q ${cx} ${yBottom} ${xEnd} ${bottomEdge} Q ${cx} ${yTop} ${xStart} ${bottomEdge} Z`;
                      } else if (activeProfileId === 'Beveled') {
                        const bevelW = w_px * 0.18;
                        const bevelH = t_px * 0.35;
                        const xL = xStart + bevelW;
                        const xR = xEnd - bevelW;
                        const yB = yTop + bevelH;
                        d = `M ${xStart} ${yBottom} L ${xEnd} ${yBottom} L ${xEnd} ${yB} L ${xR} ${yTop} L ${xL} ${yTop} L ${xStart} ${yB} Z`;
                      } else if (activeProfileId === 'KnifeEdge') {
                        d = `M ${xStart} ${yBottom} L ${xEnd} ${yBottom} L ${cx} ${yTop} Z`;
                      } else if (activeProfileId === 'Concave') {
                        const dip = yTop + t_px * 0.3;
                        d = `M ${xStart} ${yBottom} L ${xEnd} ${yBottom} L ${xEnd} ${yTop} Q ${cx} ${dip} ${xStart} ${yTop} Z`;
                      } else if (activeProfileId === 'StepEdge') {
                        const stepW = w_px * 0.15;
                        const stepH = t_px * 0.3;
                        const xStepL = xStart + stepW;
                        const xStepR = xEnd - stepW;
                        const yStep = yTop + stepH;
                        d = `M ${xStart} ${yBottom} L ${xEnd} ${yBottom} L ${xEnd} ${yStep} L ${xStepR} ${yStep} L ${xStepR} ${yTop} L ${xStepL} ${yTop} L ${xStepL} ${yStep} L ${xStart} ${yStep} Z`;
                      } else if (activeProfileId === 'Inlay') {
                        const inlayW = w_px * 0.4;
                        const inlayDepth = t_px * 0.25;
                        const xInL = cx - inlayW / 2;
                        const xInR = cx + inlayW / 2;
                        const yIn = yTop + inlayDepth;
                        d = `M ${xStart} ${yBottom} L ${xEnd} ${yBottom} L ${xEnd} ${yTop} L ${xInR} ${yTop} L ${xInR} ${yIn} L ${xInL} ${yIn} L ${xInL} ${yTop} L ${xStart} ${yTop} Z`;
                        inlayD = `M ${xInL} ${yTop} L ${xInR} ${yTop} L ${xInR} ${yIn} L ${xInL} ${yIn} Z`;
                      } else {
                        d = `M ${xStart} ${yBottom} L ${xEnd} ${yBottom} L ${xEnd} ${yTop} L ${xStart} ${yTop} Z`;
                      }

                      // Presets handler
                      const applyPreset = (pWidth: number, pThick: number, pProfile: string) => {
                        updateActiveRing('mbWidth', pWidth.toFixed(1));
                        updateActiveRing('mbThickness', pThick.toFixed(1));
                        updateActiveRing('mbProfile', pProfile);
                      };

                      // Grid lines coordinates
                      const gridMMs = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
                      const thickMMs = [1, 2, 3, 4];

                      const isBlueprint = simViewMode === 'blueprint';

                      return (
                        <div className="mt-4 space-y-4 bg-brand-50/20 p-4 sm:p-5 rounded-2xl border border-brand-200/60 shadow-sm animate-fadeIn">
                          {/* Title and View Mode Toggles */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-brand-100">
                            <div>
                              <h4 className="text-xs font-black text-brand-900 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="flex h-2 w-2 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-gold"></span>
                                </span>
                                Live Profile
                              </h4>
                            </div>
                            <div className="flex bg-brand-100/60 p-1 rounded-xl self-stretch sm:self-auto">
                              <button
                                type="button"
                                onClick={() => setSimViewMode('realistic')}
                                className={`flex-1 sm:flex-initial text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${
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
                                className={`flex-1 sm:flex-initial text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${
                                  simViewMode === 'blueprint'
                                    ? 'bg-brand-900 text-brand-gold shadow-sm'
                                    : 'text-brand-600 hover:text-brand-800'
                                }`}
                              >
                                CAD Blueprint
                              </button>
                            </div>
                          </div>

                          {/* Canvas Container */}
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                            
                            {/* SVG Simulation Area */}
                            <div className="lg:col-span-8 flex flex-col items-stretch">
                              <div className={`relative rounded-2xl border flex-1 flex flex-col overflow-hidden min-h-[220px] shadow-inner transition-colors duration-300 ${
                                isBlueprint 
                                  ? 'bg-[#0b1a2d] border-[#1b3a5d]' 
                                  : 'bg-[#070b12] border-brand-900/10'
                              }`}>
                                <svg className="w-full h-full flex-1 min-h-[200px]" viewBox="0 0 400 240">
                                  <defs>
                                    {/* Metal Gradient */}
                                    <linearGradient id={`simGrad-${activeRing.id}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor={profileColors.stop1} />
                                      <stop offset="50%" stopColor={profileColors.stop2} />
                                      <stop offset="100%" stopColor={profileColors.stop3} />
                                    </linearGradient>

                                    {/* Blueprint Infill */}
                                    <pattern id="blueprintGrid" width="22" height="22" patternUnits="userSpaceOnUse">
                                      <path d="M 22 0 L 0 0 0 22" fill="none" stroke="rgba(34, 211, 238, 0.04)" strokeWidth="1" />
                                    </pattern>
                                  </defs>

                                  {/* Blueprint Grid Overlay */}
                                  {isBlueprint && (
                                    <rect width="400" height="240" fill="url(#blueprintGrid)" />
                                  )}

                                  {/* Subtle Reference Grid Lines */}
                                  <g opacity={isBlueprint ? "0.2" : "0.1"}>
                                    {/* Horizontal grid lines */}
                                    {thickMMs.map(m => (
                                      <line 
                                        key={`grid-h-${m}`}
                                        x1="40" 
                                        y1={cy - m * SCALE} 
                                        x2="360" 
                                        y2={cy - m * SCALE} 
                                        stroke={isBlueprint ? "#22d3ee" : "#94a3b8"} 
                                        strokeWidth="0.5" 
                                        strokeDasharray="2,2" 
                                      />
                                    ))}
                                    {/* Vertical grid lines */}
                                    {gridMMs.map(m => (
                                      <line 
                                        key={`grid-v-${m}`}
                                        x1={cx + m * SCALE} 
                                        y1="30" 
                                        x2={cx + m * SCALE} 
                                        y2="190" 
                                        stroke={isBlueprint ? "#22d3ee" : "#94a3b8"} 
                                        strokeWidth={m === 0 ? "1" : "0.5"} 
                                        strokeDasharray={m === 0 ? "none" : "2,2"} 
                                      />
                                    ))}
                                  </g>

                                  {/* Finger Guide Arc */}
                                  <path 
                                    d={`M ${xStart - 40} ${yBottom + 12} Q ${cx} ${yBottom} ${xEnd + 40} ${yBottom + 12}`} 
                                    fill="none" 
                                    stroke={isBlueprint ? "rgba(34, 211, 238, 0.4)" : "rgba(229, 169, 26, 0.25)"} 
                                    strokeWidth="1.5" 
                                    strokeDasharray="4,4" 
                                  />
                                  <text 
                                    x={cx} 
                                    y={yBottom + 26} 
                                    textAnchor="middle" 
                                    className={`text-[8px] font-black uppercase tracking-wider ${
                                      isBlueprint ? 'fill-cyan-400/60' : 'fill-brand-400'
                                    }`}
                                  >
                                    Finger Contact Surface (Ring ID)
                                  </text>

                                  {/* Primary Profile Shape Rendering */}
                                  <g className="transition-all duration-300">
                                    <path 
                                      d={d}
                                      fill={isBlueprint ? 'rgba(34, 211, 238, 0.1)' : `url(#simGrad-${activeRing.id})`}
                                      stroke={isBlueprint ? '#22d3ee' : profileColors.stroke}
                                      strokeWidth={isBlueprint ? '2' : '1.5'}
                                      strokeLinejoin="round"
                                      className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                                    />
                                    
                                    {/* Inlay Rendering */}
                                    {inlayD && (
                                      <path 
                                        d={inlayD}
                                        fill={isBlueprint ? 'rgba(239, 68, 68, 0.2)' : '#1e293b'}
                                        stroke={isBlueprint ? '#ef4444' : '#0f172a'}
                                        strokeWidth={isBlueprint ? '1.5' : '1'}
                                        strokeLinejoin="round"
                                      />
                                    )}
                                  </g>

                                  {/* Center axis guide (Blueprint style) */}
                                  {isBlueprint && (
                                    <g opacity="0.3">
                                      <line x1={cx} y1="10" x2={cx} y2="230" stroke="#ef4444" strokeWidth="0.75" strokeDasharray="8,2,2,2" />
                                      <circle cx={cx} cy={yBottom} r="3" fill="none" stroke="#ef4444" strokeWidth="0.75" />
                                    </g>
                                  )}

                                  {/* Dimension Arrow: Width */}
                                  <g className="transition-all duration-300">
                                    <line 
                                      x1={xStart} 
                                      y1={yBottom + 4} 
                                      x2={xEnd} 
                                      y2={yBottom + 4} 
                                      stroke={isBlueprint ? '#22d3ee' : '#f1c40f'} 
                                      strokeWidth="1" 
                                    />
                                    {/* Left Arrow Head */}
                                    <polygon 
                                      points={`${xStart},${yBottom+4} ${xStart+6},${yBottom+1} ${xStart+6},${yBottom+7}`} 
                                      fill={isBlueprint ? '#22d3ee' : '#f1c40f'} 
                                    />
                                    {/* Right Arrow Head */}
                                    <polygon 
                                      points={`${xEnd},${yBottom+4} ${xEnd-6},${yBottom+1} ${xEnd-6},${yBottom+7}`} 
                                      fill={isBlueprint ? '#22d3ee' : '#f1c40f'} 
                                    />
                                    {/* Dimension Label Text */}
                                    <rect 
                                      x={cx - 30} 
                                      y={yBottom - 2} 
                                      width="60" 
                                      height="12" 
                                      rx="4" 
                                      fill={isBlueprint ? '#0b1a2d' : '#070b12'} 
                                    />
                                    <text 
                                      x={cx} 
                                      y={yBottom + 7} 
                                      textAnchor="middle" 
                                      className={`text-[9px] font-black font-mono tracking-wider ${
                                        isBlueprint ? 'fill-cyan-300' : 'fill-brand-gold'
                                      }`}
                                    >
                                      w: {widthVal.toFixed(1)}mm
                                    </text>
                                  </g>

                                  {/* Dimension Arrow: Thickness */}
                                  <g className="transition-all duration-300">
                                    <line 
                                      x1={xEnd + 8} 
                                      y1={yBottom} 
                                      x2={xEnd + 8} 
                                      y2={yTop} 
                                      stroke={isBlueprint ? '#22d3ee' : '#f1c40f'} 
                                      strokeWidth="1" 
                                    />
                                    {/* Bottom Arrow Head */}
                                    <polygon 
                                      points={`${xEnd+8},${yBottom} ${xEnd+5},${yBottom-6} ${xEnd+11},${yBottom-6}`} 
                                      fill={isBlueprint ? '#22d3ee' : '#f1c40f'} 
                                    />
                                    {/* Top Arrow Head */}
                                    <polygon 
                                      points={`${xEnd+8},${yTop} ${xEnd+5},${yTop+6} ${xEnd+11},${yTop+6}`} 
                                      fill={isBlueprint ? '#22d3ee' : '#f1c40f'} 
                                    />
                                    {/* Dimension Label Text */}
                                    <rect 
                                      x={xEnd + 12} 
                                      y={(yBottom + yTop) / 2 - 7} 
                                      width="52" 
                                      height="14" 
                                      rx="4" 
                                      fill={isBlueprint ? '#0b1a2d' : '#070b12'} 
                                    />
                                    <text 
                                      x={xEnd + 16} 
                                      y={(yBottom + yTop) / 2 + 3} 
                                      textAnchor="start" 
                                      className={`text-[9px] font-black font-mono tracking-wider ${
                                        isBlueprint ? 'fill-cyan-300' : 'fill-brand-gold'
                                      }`}
                                    >
                                      t: {thicknessVal.toFixed(1)}mm
                                    </text>
                                  </g>

                                  {/* Draft Title Box (CAD style) */}
                                  {isBlueprint && (
                                    <g transform="translate(10, 10)">
                                      <rect width="105" height="42" fill="none" stroke="rgba(34, 211, 238, 0.2)" strokeWidth="0.75" />
                                      <text x="6" y="12" className="text-[7px] font-mono fill-cyan-400 font-bold uppercase">SEC: 2D CROSS SECTION</text>
                                      <text x="6" y="22" className="text-[7px] font-mono fill-cyan-400/80">SCALE: 22.0:1</text>
                                      <text x="6" y="32" className="text-[7px] font-mono fill-cyan-400/80">STYLE: {activeProfileId.toUpperCase()}</text>
                                    </g>
                                  )}
                                </svg>

                                {/* Live Info Overlay */}
                                <div className="absolute top-3 right-3 flex flex-col items-end gap-1 pointer-events-none">
                                  <div className={`px-2 py-0.5 rounded-md text-[8px] font-bold font-mono tracking-wide border uppercase ${
                                    isBlueprint 
                                      ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800/40' 
                                      : 'bg-[#0f172a]/90 text-brand-gold border-brand-900/10'
                                  }`}>
                                    Vol mult: {selectedProfile.factor}x
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Control Sidebar (Right side of canvas grid) */}
                            <div className="lg:col-span-4 space-y-4">
                              {/* Selected Shape Detail Card */}
                              <div className="bg-white rounded-2xl border border-brand-100 p-3.5 space-y-2.5 h-full flex flex-col justify-between">
                                <div className="space-y-2.5">
                                  <div className="flex items-center gap-1.5 border-b border-brand-50 pb-2">
                                    <span className="text-sm">📐</span>
                                    <div>
                                      <span className="text-xs font-black text-brand-900 block leading-tight">{selectedProfile.name}</span>
                                      <span className="text-[8px] font-bold text-brand-500 uppercase tracking-wider font-mono">Cross-section Specs</span>
                                    </div>
                                  </div>
                                  <p className="text-[11px] text-brand-600 font-medium leading-relaxed">
                                    {selectedProfile.desc}
                                  </p>
                                </div>
                                <div className="bg-brand-50/50 p-3 rounded-xl border border-brand-100/50 space-y-2 font-mono text-[9px] font-bold text-brand-700">
                                  <div className="flex justify-between">
                                    <span>Nominal Width:</span>
                                    <span className="text-brand-900 font-bold">{widthVal.toFixed(1)} mm</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Center Thickness:</span>
                                    <span className="text-brand-900 font-bold">{thicknessVal.toFixed(1)} mm</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Material Density:</span>
                                    <span className="text-brand-900 font-bold">
                                      {activeRing.material === 'gold' ? `${activeRing.goldKarat}K Gold` : activeRing.material === 'platinum' ? 'Pt950 Platinum' : 'Sterling Silver'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between pt-1 border-t border-brand-100/40">
                                    <span>Approx. Weight:</span>
                                    <span className="text-brand-900 font-black text-[10px]">{activeRing.goldGrams || '0.00'}g</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="col-span-3 text-[10px] font-mono text-brand-500 flex justify-between pt-1 border-t border-brand-100">
                    <span>Density Formula-calculated Metal weight:</span>
                    <span className="font-bold text-brand-800">{activeRing.goldGrams || '0.00'}g</span>
                  </div>
                </div>
              )}

              {['customRing', 'weddingBand'].includes(activeRing.category) && (
                <div className="grid grid-cols-3 gap-3 bg-brand-50/50 p-4 rounded-2xl border border-brand-100">
                  <div>
                    <label className="text-[9px] font-bold text-brand-500 mb-0.5 block">Ring Size (US)</label>
                    <input
                      type="number"
                      placeholder="6.5"
                      step="0.25"
                      className="w-full bg-white border border-brand-200 p-2 rounded-xl text-xs font-bold"
                      value={activeRing.cRingSize || ''}
                      onChange={(e) => updateActiveRing('cRingSize', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-brand-500 mb-0.5 block">Band Width (mm)</label>
                    <input
                      type="number"
                      placeholder="2.0"
                      step="0.1"
                      className="w-full bg-white border border-brand-200 p-2 rounded-xl text-xs font-bold"
                      value={activeRing.cBandWidth || ''}
                      onChange={(e) => updateActiveRing('cBandWidth', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-brand-500 mb-0.5 block">Band Thickness (mm)</label>
                    <input
                      type="number"
                      placeholder="1.5"
                      step="0.1"
                      className="w-full bg-white border border-brand-200 p-2 rounded-xl text-xs font-bold"
                      value={activeRing.cBandThickness || ''}
                      onChange={(e) => updateActiveRing('cBandThickness', e.target.value)}
                    />
                  </div>

                  <div className="col-span-3 text-[10px] font-mono text-brand-500 flex justify-between pt-1 border-t border-brand-100">
                    <span>Metal Weight:</span>
                    <span className="font-bold text-brand-800">Manually adjust grams in Metal Grams field above</span>
                  </div>
                </div>
              )}

              {activeRing.category === 'tennisBracelet' && (() => {
                const est = getTennisEstimates(activeRing);
                const totalCt = est.estStones * est.caratPerStone;
                return (
                  <div className="flex flex-col gap-4 bg-brand-50/50 p-4 rounded-2xl border border-brand-100 shadow-sm">
                    <div className="flex flex-col gap-3.5">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[9px] font-bold text-brand-500 uppercase tracking-wider">Length (inches)</label>
                          <span className="text-xs font-black text-brand-900 bg-white px-2.5 py-0.5 rounded-lg border border-brand-200 shadow-xs">
                            {activeRing.tbLength || 7.0}"
                          </span>
                        </div>
                        <div className="relative pt-1">
                          <input
                            type="range"
                            min="4"
                            max="9"
                            step="0.25"
                            className="w-full accent-brand-gold cursor-pointer h-1.5 bg-brand-100 rounded-lg appearance-none"
                            value={activeRing.tbLength || 7.0}
                            onChange={(e) => updateActiveRing('tbLength', parseFloat(e.target.value))}
                          />
                          <div className="flex justify-between text-[8px] font-extrabold text-brand-400 mt-1 uppercase tracking-wider select-none px-0.5">
                            <span>4.0" Min</span>
                            <span>9.0" Max</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-brand-500 mb-1 block uppercase tracking-wider">Stone Cut/Shape</label>
                        <select
                          className="w-full bg-white border border-brand-200 p-2 rounded-xl text-xs font-bold"
                          value={activeRing.tbShape || 'Round'}
                          onChange={(e) => updateActiveRing('tbShape', e.target.value)}
                        >
                          <option value="Round">Round</option>
                          <option value="Princess">Princess</option>
                          <option value="Oval">Oval</option>
                          <option value="Cushion">Cushion</option>
                        </select>
                      </div>
                      {activeRing.tbShape === 'Round' ? (
                        <div>
                          <label className="text-[9px] font-bold text-brand-500 mb-1 block uppercase tracking-wider">Size (mm)</label>
                          <select
                            className="w-full bg-white border border-brand-200 p-2 rounded-xl text-xs font-bold"
                            value={activeRing.tbSizeRound || '2.0'}
                            onChange={(e) => updateActiveRing('tbSizeRound', e.target.value)}
                          >
                            {Object.keys(ROUND_MELEE).map(sz => (
                              <option key={sz} value={sz}>{sz}mm ({ROUND_MELEE[sz]}ct)</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="text-[9px] font-bold text-brand-500 mb-1 block uppercase tracking-wider">Size Dimensions</label>
                          <select
                            className="w-full bg-white border border-brand-200 p-2 rounded-xl text-xs font-bold"
                            value={activeRing.tbSizeIdx || 0}
                            onChange={(e) => updateActiveRing('tbSizeIdx', parseInt(e.target.value))}
                          >
                            {(FANCY_SHAPES[activeRing.tbShape || 'Princess'] || []).map((fd, x) => (
                              <option key={x} value={x}>{fd.label} ({fd.carat}ct)</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-brand-100 pt-3 mt-1">
                      <div className="bg-white/80 border border-brand-100 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-brand-700 uppercase tracking-wider">Calculated Estimates</span>
                          <span className="text-[8px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-bold uppercase">Jewelry Averages</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                          <div className="bg-brand-50/40 p-2 rounded-lg border border-brand-100">
                            <p className="text-[8px] text-brand-400 font-bold uppercase tracking-wider">Metal Weight</p>
                            <p className="text-xs font-black text-brand-800">{est.estGrams}g</p>
                          </div>
                          <div className="bg-brand-50/40 p-2 rounded-lg border border-brand-100">
                            <p className="text-[8px] text-brand-400 font-bold uppercase tracking-wider">Total Stones</p>
                            <p className="text-xs font-black text-brand-800">{est.estStones}</p>
                          </div>
                          <div className="bg-brand-50/40 p-2 rounded-lg border border-brand-100">
                            <p className="text-[8px] text-brand-400 font-bold uppercase tracking-wider">Total Carats</p>
                            <p className="text-xs font-black text-brand-800">{totalCt.toFixed(2)} ct</p>
                          </div>
                        </div>
                        <p className="text-[8px] text-brand-400/80 font-medium text-center italic leading-normal pt-1">
                          Averages are calculated automatically based on your dimensions and selected shape
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
              </div>

              {/* Piece specific thumbnail sketches & controls */}
              {activeRing && (
                <div className="bg-white p-4 rounded-3xl border border-brand-100 shadow-sm space-y-4">
                  <h3 className="text-[10px] font-black text-brand-800 uppercase tracking-widest border-b border-brand-100 pb-2 flex items-center gap-1.5 justify-center">
                    <Camera size={12} className="text-brand-gold" />
                    Sketches & Reference Photo
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Column 1: Sketches */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center border-b border-brand-50 pb-1">
                        <span className="text-[9px] font-black uppercase text-brand-600 tracking-wider">Interactive Sketches ({sketches.length})</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 min-h-[76px] bg-brand-50/20 p-2 rounded-2xl border border-dashed border-brand-200 items-center justify-start">
                        {sketches.length === 0 ? (
                          <div className="w-full flex flex-col items-center justify-center py-2 text-center">
                            <Sparkles size={14} className="text-brand-300" />
                            <span className="text-[8px] text-brand-400 mt-1">No sketches drawn yet</span>
                          </div>
                        ) : (
                          sketches.map((sketchUrl, sIdx) => (
                            <div key={sIdx} className="relative group border border-brand-150 bg-white rounded-xl p-0.5 w-16 h-16 flex flex-col items-center justify-center shadow-sm cursor-pointer overflow-hidden transition-all">
                              <img src={sketchUrl} alt={`Sketch ${sIdx + 1}`} className="w-full h-full object-cover rounded-lg" />
                              <div className="absolute inset-0 bg-brand-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onLaunchSketch('sketch', sIdx)}
                                  className="p-1 bg-white text-brand-900 rounded-md hover:bg-brand-50 transition-colors shadow"
                                  title="Edit Sketch"
                                >
                                  <Sparkles size={10} className="text-brand-gold" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateSketches(sketches.filter((_, i) => i !== sIdx));
                                  }}
                                  className="p-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow"
                                  title="Delete"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onLaunchSketch('sketch', sketches.length)}
                        className="w-full py-1.5 px-2 bg-brand-50 hover:bg-brand-100 text-brand-900 hover:text-brand-950 rounded-xl border border-brand-200 hover:border-brand-300 font-bold text-[10px] tracking-wide shadow-sm transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus size={10} className="text-brand-gold" />
                        + Interactive Sketch
                      </button>
                    </div>

                    {/* Column 2: Photos */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center border-b border-brand-50 pb-1">
                        <span className="text-[9px] font-black uppercase text-brand-600 tracking-wider">Reference Photos ({photos.length})</span>
                      </div>

                      <div className="flex flex-wrap gap-2 min-h-[76px] bg-brand-50/20 p-2 rounded-2xl border border-dashed border-brand-200 items-center justify-start">
                        {photos.length === 0 ? (
                          <div className="w-full flex flex-col items-center justify-center py-2 text-center">
                            <Camera size={14} className="text-brand-300" />
                            <span className="text-[8px] text-brand-400 mt-1">No photos imported</span>
                          </div>
                        ) : (
                          photos.map((photoUrl, pIdx) => (
                            <div key={pIdx} className="relative group border border-brand-150 bg-white rounded-xl p-0.5 w-16 h-16 flex flex-col items-center justify-center shadow-sm cursor-pointer overflow-hidden transition-all">
                              <img src={photoUrl} alt={`Photo ${pIdx + 1}`} className="w-full h-full object-cover rounded-lg" />
                              <div className="absolute inset-0 bg-brand-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onLaunchSketch('photo', pIdx)}
                                  className="p-1 bg-white text-brand-900 rounded-md hover:bg-brand-50 transition-colors shadow"
                                  title="Edit Photo"
                                >
                                  <Camera size={10} className="text-brand-gold" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updatePhotos(photos.filter((_, i) => i !== pIdx));
                                  }}
                                  className="p-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow"
                                  title="Delete"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Hidden File Input for iPad Camera & Gallery selection */}
                      <input
                        type="file"
                        id={`direct-photo-picker-trigger-${activeRing.id}`}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const result = ev.target?.result as string;
                            updatePhotos([...photos, result]);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />

                      <label
                        htmlFor={`direct-photo-picker-trigger-${activeRing.id}`}
                        className="w-full py-1.5 px-2 bg-brand-50 hover:bg-brand-100 text-brand-900 hover:text-brand-950 rounded-xl border border-brand-200 hover:border-brand-300 font-bold text-[10px] tracking-wide shadow-sm transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus size={10} className="text-brand-gold" />
                        + Photo
                      </label>
                    </div>
                  </div>
                  <p className="text-[8px] text-brand-400 italic text-center">Tap buttons above to draw a custom sketch or snap/import an iPad photo directly</p>
                </div>
              )}

              {/* Pricing Calculations Sheet Box */}
              <div className="bg-white p-5 rounded-3xl border border-brand-100 shadow-lg flex flex-col justify-between space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  {/* Left Side: Calculations Breakdown */}
                  <div className="space-y-2 border-r border-brand-100 pr-4 font-mono text-[11px] text-brand-600">
                    <p className="text-[9px] font-black text-brand-400 uppercase tracking-widest border-b border-brand-50 pb-1 mb-1">Active Piece Specs</p>
                    <div className="flex justify-between items-center text-[10px] text-brand-700 font-sans font-bold">
                      <span>Category</span>
                      <span className="text-brand-900">{activeRing.category === 'customRing' ? 'Engagement' : activeRing.category === 'weddingBand' ? 'Wedding Band' : activeRing.category === 'mensBand' ? "Men's Band" : activeRing.category === 'pendant' ? 'Pendant' : activeRing.category === 'earrings' ? 'Earrings' : 'Tennis'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-brand-700 font-sans">
                      <span>Material / Purity</span>
                      <span className="font-bold text-brand-900">{activeRing.material === 'gold' ? `${activeRing.goldKarat}K ${activeRing.metalColor} Gold` : `${activeRing.metalColor} ${activeRing.material}`}</span>
                    </div>
                    {activeRing.goldGrams && (
                      <div className="flex justify-between items-center text-[10px] text-brand-700 font-sans">
                        <span>Calculated Metal Wt</span>
                        <span className="font-mono font-bold text-brand-900">{activeRing.goldGrams}g</span>
                      </div>
                    )}
                  </div>

                  {/* Right Side: Total Display */}
                  <div className="text-center space-y-1">
                    <p className="text-[9px] uppercase font-black tracking-widest text-brand-400">ESTIMATED TOTAL DUE</p>
                    <h1 className="text-3xl font-serif font-black italic text-brand-950 tracking-tight">
                      ${totals.grandTotal.toFixed(2)}
                    </h1>
                    <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${isWholesale ? 'bg-green-100 text-green-700' : 'bg-brand-100 text-brand-800'}`}>
                      {isWholesale ? 'Wholesale' : 'Retail'}
                    </span>
                    <p className="text-[8px] text-brand-400 font-mono">Calculated CAD valuation</p>
                  </div>
                </div>

                {/* Piece Raw cost disclosure (for transparency) */}
                {activeRing && !isWholesale && settings.showRawCostOnQuoteTab && (
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200/80 text-left text-[10px] text-amber-700 leading-relaxed flex items-start gap-1.5">
                    <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold uppercase text-[8px] tracking-wider text-amber-800">Internal Manufacturing Raw Cost</p>
                      <p className="font-mono mt-0.5 font-bold text-amber-900">
                        Raw Cost CAD: ${calculateRawCost(activeRing, settings, spotPrices).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Save/Commit Action */}
                <button
                  type="button"
                  onClick={onSaveQuote}
                  className="w-full bg-brand-900 text-brand-gold hover:bg-brand-950 font-black py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 border border-brand-800 mt-6 cursor-pointer"
                >
                  <CheckCircle size={14} />
                  Commit Quote to Ledger
                </button>
              </div>
            </div>

            {/* COLUMN 2: Stone Sourcing, Addons & Reductions */}
            <div className="space-y-6 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
              {/* SECTION 2: Stone Sourcing */}
              <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-brand-50 pb-1">
                <h3 className="text-[10px] font-black text-brand-400 uppercase tracking-wider block">2. Stone Supply & Setting</h3>
              </div>

              {/* CENTER STONE(S) PARAMETERS */}
              {['customRing', 'pendant', 'earrings'].includes(activeRing.category) && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/70">
                    <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-widest flex items-center gap-1.5">
                      <Gem size={12} className="text-amber-500" /> Supplied Center Stones
                    </span>
                    <button
                      type="button"
                      onClick={addCenterStoneRow}
                      className="text-[9px] font-bold uppercase tracking-widest bg-white hover:bg-amber-100/50 text-amber-900 border border-amber-200/80 hover:border-amber-300 px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-150 flex items-center gap-1 active:scale-[0.98] cursor-pointer"
                    >
                      <Plus size={10} /> Add Supplied Center Stone
                    </button>
                  </div>

                  {activeRing.centerStones && activeRing.centerStones.map((cs, idx) => (
                    <div key={idx} className="space-y-3 p-4 bg-amber-50/20 rounded-2xl border border-amber-200/40 mt-2 relative group/item">
                      <div className="flex justify-between items-center mb-1 border-b border-amber-100/40 pb-2">
                        <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-widest flex items-center gap-1">
                          <Gem size={10} className="text-amber-500" /> Supplied Center Stone #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeCenterStoneRow(idx)}
                          className="text-[9px] font-bold uppercase tracking-widest bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 px-2.5 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-150 flex items-center gap-1 active:scale-[0.98] cursor-pointer"
                        >
                          <Trash2 size={10} /> Remove Stone
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="text-[9px] font-bold text-amber-800/60 block mb-0.5 uppercase tracking-wide">Carat Weight</label>
                          <input
                            type="number"
                            placeholder="1.00"
                            className="w-full bg-white border border-amber-200 p-2 rounded-lg text-xs font-bold focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                            value={cs.carats}
                            onChange={(e) => updateCenterStoneRow(idx, 'carats', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-amber-800/60 block mb-0.5 uppercase tracking-wide">Stone Type</label>
                          <select
                            className="w-full bg-white border border-amber-200 p-2 rounded-lg text-xs font-bold focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                            value={cs.type}
                            onChange={(e) => updateCenterStoneRow(idx, 'type', e.target.value)}
                          >
                            {Object.keys(settings.centerStoneRates).map(st => <option key={st} value={st}>{st}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-amber-800/60 block mb-0.5 uppercase tracking-wide">Shape (Cut)</label>
                          <div className="flex gap-1.5 items-center">
                            <select
                              className="flex-1 min-w-0 bg-white border border-amber-200 p-2 rounded-lg text-xs font-bold focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                              value={cs.shape}
                              onChange={(e) => updateCenterStoneRow(idx, 'shape', e.target.value)}
                            >
                              {CENTER_SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <div className="w-9 h-9 flex items-center justify-center bg-amber-50/80 border border-amber-200 rounded-lg shrink-0 p-1.5 text-amber-600 shadow-sm" title={cs.shape}>
                              <DiamondShapeIcon shape={cs.shape} className="w-full h-full" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-amber-800/60 block mb-0.5 uppercase tracking-wide">Setting Style</label>
                          <select
                            className="w-full bg-white border border-amber-200 p-2 rounded-lg text-xs font-bold focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                            value={cs.setting}
                            onChange={(e) => updateCenterStoneRow(idx, 'setting', e.target.value)}
                          >
                            {SETTING_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] font-bold text-amber-800/60 block mb-0.5 uppercase tracking-wide">Origin</label>
                          <select
                            className="w-full bg-white border border-amber-200 p-2 rounded-lg text-xs font-bold focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                            value={cs.origin}
                            onChange={(e) => updateCenterStoneRow(idx, 'origin', e.target.value)}
                          >
                            <option value="Lab">Lab-grown</option>
                            <option value="Natural">Natural</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* MELEE DIAMONDS EXPANDABLE ROWS */}
              {activeRing.stoneSource === 'our' && activeRing.category !== 'tennisBracelet' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-sky-50/70 p-2.5 rounded-xl border border-sky-200/70">
                    <span className="text-[10px] font-extrabold text-sky-900 uppercase tracking-widest flex items-center gap-1.5">
                      <Gem size={12} className="text-sky-500" /> Supplied Round Melee
                    </span>
                    <button
                      type="button"
                      onClick={addMelee}
                      className="text-[9px] font-bold uppercase tracking-widest bg-white hover:bg-sky-100/50 text-sky-900 border border-sky-200/80 hover:border-sky-300 px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-150 flex items-center gap-1 active:scale-[0.98] cursor-pointer"
                    >
                      <Plus size={10} /> Add Melee Row
                    </button>
                  </div>
                  {activeRing.melee && activeRing.melee.length > 0 && (
                    <div className="grid grid-cols-12 gap-2 px-2.5 text-[8px] font-black text-sky-800/60 uppercase tracking-wider">
                      <div className="col-span-2">Stones Qty</div>
                      <div className="col-span-5">Size (mm)</div>
                      <div className="col-span-4">Total Carats (ctw)</div>
                      <div className="col-span-1"></div>
                    </div>
                  )}
                  {activeRing.melee?.map((m, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-sky-50/20 p-2.5 rounded-xl border border-sky-200/40">
                      <div className="col-span-2">
                        <input
                          type="number"
                          className="w-full bg-white border border-sky-200/60 p-1.5 rounded text-xs font-bold focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                          value={m.qty}
                          onChange={(e) => updateMelee(idx, 'qty', e.target.value)}
                        />
                      </div>
                      <div className="col-span-5">
                        <select
                          className={`w-full bg-white border border-sky-200/60 p-1.5 rounded text-xs focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all ${
                            m.size === '' ? 'text-slate-400 font-medium' : 'text-slate-800 font-bold'
                          }`}
                          value={m.size}
                          onChange={(e) => updateMelee(idx, 'size', e.target.value)}
                        >
                          <option value="" className="text-slate-400 font-medium bg-white">Select Size...</option>
                          {Object.keys(ROUND_MELEE).map(sz => (
                            <option key={sz} value={sz} className="text-slate-800 font-bold bg-white">
                              {sz}mm ({ROUND_MELEE[sz]}ct)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-4">
                        <input
                          type="number"
                          className="w-full bg-sky-50/50 border border-sky-200/40 p-1.5 rounded text-xs font-bold text-sky-900/60"
                          value={(Number(m.qty) * Number(m.carat)).toFixed(3)}
                          disabled
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeMelee(idx)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded flex items-center justify-center mx-auto transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* FANCY MELEE EXPANDABLE ROWS */}
              {activeRing.stoneSource === 'our' && activeRing.category !== 'tennisBracelet' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-violet-50/70 p-2.5 rounded-xl border border-violet-200/70">
                    <span className="text-[10px] font-extrabold text-violet-900 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles size={12} className="text-violet-500 animate-pulse" /> Supplied Fancy Melee
                    </span>
                    <button
                      type="button"
                      onClick={addFancy}
                      className="text-[9px] font-bold uppercase tracking-widest bg-white hover:bg-violet-100/50 text-violet-900 border border-violet-200/80 hover:border-violet-300 px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-150 flex items-center gap-1 active:scale-[0.98] cursor-pointer"
                    >
                      <Plus size={10} /> Add Fancy Row
                    </button>
                  </div>
                  {activeRing.fancy && activeRing.fancy.length > 0 && (
                    <div className="grid grid-cols-12 gap-2 px-2.5 text-[8px] font-black text-violet-800/60 uppercase tracking-wider">
                      <div className="col-span-2">Stones Qty</div>
                      <div className="col-span-5">Cut/Shape</div>
                      <div className="col-span-4">Carat Size</div>
                      <div className="col-span-1"></div>
                    </div>
                  )}
                  {activeRing.fancy?.map((f, idx) => {
                    const sizes = FANCY_SHAPES[f.shape] || [];
                    const activeSize = sizes[f.sizeIdx] || { carat: 0 };
                    return (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-violet-50/20 p-2.5 rounded-xl border border-violet-200/40">
                        <div className="col-span-2">
                          <input
                            type="number"
                            className="w-full bg-white border border-violet-200/60 p-1.5 rounded text-xs font-bold focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                            value={f.qty}
                            onChange={(e) => updateFancy(idx, 'qty', e.target.value)}
                          />
                        </div>
                        <div className="col-span-5">
                          <select
                            className="w-full bg-white border border-violet-200/60 p-1.5 rounded text-xs font-bold focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                            value={f.shape}
                            onChange={(e) => updateFancy(idx, 'shape', e.target.value)}
                          >
                            {Object.keys(FANCY_SHAPES).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="col-span-4">
                          <select
                            className="w-full bg-white border border-violet-200/60 p-1.5 rounded text-xs font-bold focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                            value={f.sizeIdx}
                            onChange={(e) => updateFancy(idx, 'sizeIdx', parseInt(e.target.value))}
                          >
                            {sizes.map((sz, sidx) => (
                              <option key={sidx} value={sidx}>{sz.label} ({sz.carat}ct)</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeFancy(idx)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded flex items-center justify-center mx-auto transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CLIENT STONES EXPANDABLE ROWS (SETTING LABOR ONLY) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/70">
                  <span className="text-[10px] font-extrabold text-emerald-900 uppercase tracking-widest flex items-center gap-1.5">
                    <UserCheck size={12} className="text-emerald-500" /> Client-Owned Setting Fees
                  </span>
                  <button
                    type="button"
                    onClick={addClientStone}
                    className="text-[9px] font-bold uppercase tracking-widest bg-white hover:bg-emerald-100/50 text-emerald-900 border border-emerald-200/80 hover:border-emerald-300 px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-150 flex items-center gap-1 active:scale-[0.98] cursor-pointer"
                  >
                    <Plus size={10} /> Add Client Setting Fee Row
                  </button>
                </div>
                {activeRing.clientStones && activeRing.clientStones.length > 0 && (
                  <div className="grid grid-cols-12 gap-2 px-2.5 text-[8px] font-black text-emerald-800/60 uppercase tracking-wider">
                    <div className="col-span-2">Stones Qty</div>
                    <div className="col-span-3">Category</div>
                    <div className="col-span-6">Stone Details / Size / Carats</div>
                    <div className="col-span-1"></div>
                  </div>
                )}
                {activeRing.clientStones?.map((c, idx) => {
                  const isFancy = c.type === 'Fancy';
                  const shapes = Object.keys(FANCY_SHAPES);
                  const currentShape = c.shape || 'Princess';
                  const sizes = FANCY_SHAPES[currentShape] || [];
                  const currentSizeIdx = c.sizeIdx !== undefined ? c.sizeIdx : 0;

                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-emerald-50/20 p-2.5 rounded-xl border border-emerald-200/40">
                      <div className="col-span-2">
                        <input
                          type="number"
                          className="w-full bg-white border border-emerald-200/60 p-1.5 rounded text-xs font-bold focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                          value={c.qty}
                          onChange={(e) => updateClientStone(idx, 'qty', e.target.value)}
                        />
                      </div>
                      <div className="col-span-3">
                        <select
                          className="w-full bg-white border border-emerald-200/60 p-1.5 rounded text-xs font-bold focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                          value={c.type}
                          onChange={(e) => updateClientStone(idx, 'type', e.target.value as any)}
                        >
                          <option value="Center">Center Stone</option>
                          <option value="Fancy">Fancy Melee</option>
                          <option value="Melee">Round Melee</option>
                        </select>
                      </div>
                      
                      <div className="col-span-6">
                        {isFancy ? (
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              className="w-full bg-white border border-emerald-200/60 p-1.5 rounded text-xs font-bold focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                              value={currentShape}
                              onChange={(e) => {
                                updateClientStone(idx, 'shape', e.target.value);
                                updateClientStone(idx, 'sizeIdx', 0);
                              }}
                            >
                              {shapes.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select
                              className="w-full bg-white border border-emerald-200/60 p-1.5 rounded text-xs font-bold focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                              value={currentSizeIdx}
                              onChange={(e) => updateClientStone(idx, 'sizeIdx', parseInt(e.target.value))}
                            >
                              {sizes.map((sz, sidx) => (
                                <option key={sidx} value={sidx}>{sz.label} ({sz.carat}ct)</option>
                              ))}
                            </select>
                          </div>
                        ) : c.type === 'Melee' ? (
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              className="w-full bg-white border border-emerald-200/60 p-1.5 rounded text-xs font-bold focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                              value={c.size || '1.5'}
                              onChange={(e) => updateClientStone(idx, 'size', e.target.value)}
                            >
                              {Object.keys(ROUND_MELEE).map(sz => (
                                <option key={sz} value={sz}>{sz}mm ({ROUND_MELEE[sz]}ct)</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              className="w-full bg-emerald-50/50 border border-emerald-200/40 p-1.5 rounded text-xs font-bold text-emerald-900/60"
                              value={c.carats ? `${c.carats} ctw` : '0.000 ctw'}
                              disabled
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Size (e.g. 6.5mm)"
                              className="w-full bg-white border border-emerald-200/60 p-1.5 rounded text-xs font-bold focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                              value={c.size || ''}
                              onChange={(e) => updateClientStone(idx, 'size', e.target.value)}
                            />
                            <input
                              type="number"
                              placeholder="Total Carats"
                              className="w-full bg-white border border-emerald-200/60 p-1.5 rounded text-xs font-bold focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                              value={c.carats}
                              onChange={(e) => updateClientStone(idx, 'carats', e.target.value)}
                            />
                          </div>
                        )}
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeClientStone(idx)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded flex items-center justify-center mx-auto transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 3: Custom Add-ons & Engravings */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-brand-400 uppercase tracking-wider block border-b border-brand-50 pb-1">3. Custom Add-ons</h3>
              
              {/* Addons List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-rose-50/70 p-2.5 rounded-xl border border-rose-200/70">
                  <span className="text-[10px] font-extrabold text-rose-900 uppercase tracking-widest flex items-center gap-1.5">
                    <Tag size={12} className="text-rose-500" /> Custom Addon Fees
                  </span>
                  <button
                    type="button"
                    onClick={addAddon}
                    className="text-[9px] font-bold uppercase tracking-widest bg-white hover:bg-rose-100/50 text-rose-900 border border-rose-200/80 hover:border-rose-300 px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all duration-150 flex items-center gap-1 active:scale-[0.98] cursor-pointer"
                  >
                    <Plus size={10} /> Add Fee Row
                  </button>
                </div>
                {activeRing.addons?.map((a, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-rose-50/20 p-2.5 rounded-xl border border-rose-200/40">
                    <div className="col-span-4">
                      <label className="text-[8px] text-rose-800/70 font-bold uppercase block mb-0.5">Fee Amount ($)</label>
                      <input
                        type="number"
                        placeholder="100"
                        className="w-full bg-white border border-rose-200/60 p-1.5 rounded text-xs font-bold focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                        value={a.fee}
                        onChange={(e) => updateAddon(idx, 'fee', e.target.value)}
                      />
                    </div>
                    <div className="col-span-7">
                      <label className="text-[8px] text-rose-800/70 font-bold uppercase block mb-0.5">Fee Description</label>
                      <input
                        type="text"
                        placeholder="french pave, 2 tone, appraisal"
                        className="w-full bg-white border border-rose-200/60 p-1.5 rounded text-xs font-bold focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                        value={a.desc}
                        onChange={(e) => updateAddon(idx, 'desc', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 text-center pt-4">
                      <button
                        type="button"
                        onClick={() => removeAddon(idx)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Engraving toggle */}
              <div className="bg-brand-50/50 p-4 rounded-2xl border border-brand-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-brand-700 flex items-center gap-1">
                    <Type size={14} className="text-brand-gold" />
                    Apply Laser Engraving
                  </span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-brand-gold bg-brand-100 border-brand-300 rounded focus:ring-brand-gold focus:ring-2 accent-brand-gold"
                    checked={activeRing.showEngraving}
                    onChange={(e) => updateActiveRing('showEngraving', e.target.checked)}
                  />
                </div>
                {activeRing.showEngraving && (
                  <div className="space-y-3 mt-2 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Enter engraving inscription..."
                        className="w-full bg-white border border-brand-200 p-2 rounded-xl text-xs font-medium"
                        value={activeRing.engravingText}
                        onChange={(e) => updateActiveRing('engravingText', e.target.value)}
                      />
                      <select
                        className="w-full bg-white border border-brand-200 p-2 rounded-xl text-sm font-bold cursor-pointer transition-all focus:border-brand-300"
                        style={{ fontFamily: activeRing.engravingFont }}
                        value={activeRing.engravingFont}
                        onChange={(e) => updateActiveRing('engravingFont', e.target.value)}
                      >
                        <option style={{ fontFamily: "'Times New Roman', Times, serif" }} value="'Times New Roman', Times, serif">Times New Roman</option>
                        <option style={{ fontFamily: "Tahoma, Geneva, sans-serif" }} value="Tahoma, Geneva, sans-serif">Tahoma</option>
                        <option style={{ fontFamily: "'Great Vibes', cursive" }} value="'Great Vibes', cursive">Great Vibes (Calligraphy)</option>
                        <option style={{ fontFamily: "'Dancing Script', cursive" }} value="'Dancing Script', cursive">Dancing Script (Elegant Hand)</option>
                        <option style={{ fontFamily: "'Cinzel', serif" }} value="'Cinzel', serif">Cinzel (Roman Capital)</option>
                        <option style={{ fontFamily: "'Alex Brush', cursive" }} value="'Alex Brush', cursive">Alex Brush (Brush Script)</option>
                        <option style={{ fontFamily: "'Pinyon Script', cursive" }} value="'Pinyon Script', cursive">Pinyon Script (Classic Script)</option>
                        <option style={{ fontFamily: "'Petit Formal Script', cursive" }} value="'Petit Formal Script', cursive">Petit Formal Script</option>
                        <option style={{ fontFamily: "'Allura', cursive" }} value="'Allura', cursive">Allura (Satin Script)</option>
                        <option style={{ fontFamily: "'Parisienne', cursive" }} value="'Parisienne', cursive">Parisienne (Romantic Calligraphy)</option>
                        <option style={{ fontFamily: "Georgia, serif" }} value="Georgia, serif">Georgia (Classic Serif)</option>
                      </select>
                    </div>

                    {/* Quick Symbols Shortcuts */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-brand-50/50 p-2 rounded-xl border border-brand-100">
                      <span className="text-[9px] font-black uppercase tracking-wider text-brand-500 mr-1 pl-1">Insert Symbol:</span>
                      <button
                        type="button"
                        onClick={() => updateActiveRing('engravingText', (activeRing.engravingText || '') + '❤')}
                        className="px-2 py-1 bg-white hover:bg-brand-50 border border-brand-200 rounded-lg text-xs font-bold text-red-500 shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1"
                      >
                        <span>❤</span> <span className="text-[10px] font-medium text-slate-500">Solid Heart</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateActiveRing('engravingText', (activeRing.engravingText || '') + '♡')}
                        className="px-2 py-1 bg-white hover:bg-brand-50 border border-brand-200 rounded-lg text-xs font-bold text-red-400 shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1"
                      >
                        <span>♡</span> <span className="text-[10px] font-medium text-slate-500">Outline Heart</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateActiveRing('engravingText', (activeRing.engravingText || '') + '∞')}
                        className="px-2 py-1 bg-white hover:bg-brand-50 border border-brand-200 rounded-lg text-xs font-bold text-brand-800 shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1"
                      >
                        <span>∞</span> <span className="text-[10px] font-medium text-slate-500">Infinity</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateActiveRing('engravingText', (activeRing.engravingText || '') + ' • ')}
                        className="px-2 py-1 bg-white hover:bg-brand-50 border border-brand-200 rounded-lg text-xs font-bold text-brand-800 shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1"
                      >
                        <span>•</span> <span className="text-[10px] font-medium text-slate-500">Spacer Dot</span>
                      </button>
                    </div>
                    
                    {/* Live Engraving Preview */}
                    <div className="bg-white border border-brand-100 p-3 rounded-xl flex flex-col items-center justify-center min-h-[64px] text-center shadow-inner">
                      <span className="text-[8px] font-black text-brand-400 uppercase tracking-widest mb-1.5">Live Engraving Preview</span>
                      <span 
                        style={{ fontFamily: activeRing.engravingFont }} 
                        className="text-base sm:text-lg md:text-xl text-brand-900 font-bold tracking-wide break-all"
                      >
                        {activeRing.engravingText || "Your Inscription Here"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 4: Piece Studio Notes */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-brand-400 uppercase tracking-wider block border-b border-brand-50 pb-1">4. Studio Notes</h3>
              <div className="bg-brand-50/50 p-4 rounded-2xl border border-brand-100 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-brand-700">Studio Notes</label>
                  <button
                    type="button"
                    onClick={addDesignNote}
                    className="text-[8px] font-black uppercase text-brand-700 bg-white border px-2 py-0.5 rounded shadow-sm"
                  >
                    + Note
                  </button>
                </div>
                <div className="space-y-1 overflow-y-auto max-h-24">
                  {activeRing.designNotes?.map((dn, idx) => (
                    <div key={idx} className="flex gap-1 items-center">
                      <input
                        type="text"
                        placeholder="Special design instructions..."
                        className="w-full bg-white border border-brand-200 p-1.5 rounded text-[10px] font-medium"
                        value={dn.text}
                        onChange={(e) => updateDesignNote(idx, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeDesignNote(idx)}
                        className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EMPTY STATE FOR PIECE LIST */}
      {session.activeSubTab !== 'summary' && session.rings.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/60 p-12 text-center max-w-2xl mx-auto space-y-6 shadow-sm my-8 animate-fadeIn">
          <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto text-brand-gold">
            <Compass size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-bold italic text-brand-900">Start Your Custom Quote</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              No jewelry pieces have been added to this quote yet. Click below to add your first custom piece and begin designing.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-900 text-brand-gold hover:bg-brand-950 rounded-xl font-bold text-sm uppercase tracking-widest shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              <Plus size={16} />
              Add Piece
            </button>
          </div>
        </div>
      )}

        {/* SUMMARY & TAX CONFIGURATION TAB */}
        {session.activeSubTab === 'summary' && (
          <div className="space-y-6 animate-fadeIn print:bg-white print:p-0">
            {(() => {
              const printPiecesCount = session.rings.filter(r => hasRingData(r)).length;
              const shouldFitOnePage = printPiecesCount <= 2;
              if (shouldFitOnePage) {
                return (
                  <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                      @page {
                        size: letter portrait !important;
                        margin: 0.15in !important;
                      }
                      body, html, #root {
                        font-size: 7.5pt !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        padding: 0 !important;
                        margin: 0 !important;
                      }
                      
                      /* Grayscale and high-contrast color mappings for printing */
                      .text-brand-gold, .text-brand-gold-hover, .text-amber-500, .text-amber-600 {
                        color: #374151 !important;
                      }
                      .text-brand-900, .text-brand-950, .text-slate-900, .text-slate-950, .text-slate-800 {
                        color: #000000 !important;
                      }
                      .text-slate-500, .text-slate-600, .text-brand-500, .text-brand-600, .text-slate-400, .text-brand-400 {
                        color: #4b5563 !important;
                      }
                      .text-emerald-700, .text-emerald-800, .text-emerald-900, .text-emerald-600 {
                        color: #111827 !important;
                      }
                      .bg-brand-900, .bg-brand-950, .bg-slate-900, .bg-slate-800 {
                        background-color: #f3f4f6 !important;
                        color: #000000 !important;
                      }
                      .bg-brand-50, .bg-brand-100, .bg-slate-50, .bg-slate-100, .bg-slate-200 {
                        background-color: #f9fafb !important;
                      }
                      .bg-emerald-50, .bg-emerald-100 {
                        background-color: #f9fafb !important;
                      }
                      .border-brand-100, .border-brand-200, .border-slate-100, .border-slate-200, .border-slate-300 {
                        border-color: #d1d5db !important;
                      }
                      .border, .border-t, .border-b, .border-l, .border-r {
                        border-color: #d1d5db !important;
                      }
                      
                      /* Drastically tighten padding, margins, and gaps for 1-page fit */
                      .print\\:p-0 { padding: 0 !important; }
                      .print\\:p-1 { padding: 1px !important; }
                      .print\\:p-1\\.5 { padding: 2px !important; }
                      .print\\:p-2 { padding: 3px !important; }
                      .print\\:p-2\\.5 { padding: 3px !important; }
                      .print\\:p-3 { padding: 4px !important; }
                      .print\\:p-4 { padding: 5px !important; }
                      .print\\:p-5 { padding: 5px !important; }
                      .print\\:p-6 { padding: 5px !important; }
                      .print\\:p-8 { padding: 0 !important; }
                      
                      .print\\:pt-1 { padding-top: 1px !important; }
                      .print\\:pt-2 { padding-top: 2px !important; }
                      .print\\:pt-3 { padding-top: 3px !important; }
                      .print\\:pt-6 { padding-top: 4px !important; }
                      
                      .print\\:pb-1 { padding-bottom: 1px !important; }
                      .print\\:pb-1\\.5 { padding-bottom: 2px !important; }
                      .print\\:pb-2 { padding-bottom: 2px !important; }
                      .print\\:pb-2\\.5 { padding-bottom: 2px !important; }
                      .print\\:pb-3 { padding-bottom: 3px !important; }
                      .print\\:pb-6 { padding-bottom: 4px !important; }
                      
                      .print\\:space-y-1 { margin-top: 1px !important; }
                      .print\\:space-y-1\\.5 { margin-top: 2px !important; }
                      .print\\:space-y-2 { margin-top: 2px !important; }
                      .print\\:space-y-3 { margin-top: 3px !important; }
                      .print\\:space-y-4 { margin-top: 4px !important; }
                      .print\\:space-y-5 { margin-top: 4px !important; }
                      .print\\:space-y-8 { margin-top: 5px !important; }
                      
                      .print\\:gap-1\\.5 { gap: 2px !important; }
                      .print\\:gap-2 { gap: 3px !important; }
                      .print\\:gap-3 { gap: 3px !important; }
                      .print\\:gap-4 { gap: 4px !important; }
                      
                      .print\\:rounded-none { border-radius: 0 !important; }
                      .print\\:rounded-lg { border-radius: 4px !important; }
                      .print\\:rounded-xl { border-radius: 6px !important; }
                      
                      /* Tighter grid spacing and margins */
                      .grid { gap: 4px !important; }
                      .space-y-6 > * + * { margin-top: 3px !important; }
                      .space-y-4 > * + * { margin-top: 2px !important; }
                      .space-y-3 > * + * { margin-top: 2px !important; }
                      .space-y-2 > * + * { margin-top: 1px !important; }
                      .space-y-5 > * + * { margin-top: 3px !important; }
                      
                      /* Scales for images inside specs & references */
                      .print\\:h-12 { height: 1.5rem !important; }
                      .print\\:h-16 { height: 1.8rem !important; }
                      .print\\:h-20 { height: 2.2rem !important; }
                      .print\\:h-28 { height: 3.2rem !important; }
                      .print\\:h-44 { height: 4.2rem !important; }
                      
                      /* Make text and layout extremely condensed */
                      h1 { font-size: 12pt !important; margin: 0 !important; }
                      h2 { font-size: 10pt !important; margin: 0 !important; }
                      h3 { font-size: 8pt !important; margin: 0 !important; padding-top: 1px !important; }
                      h4 { font-size: 7.5pt !important; margin: 0 !important; }
                      p, span, li, td, th { font-size: 7pt !important; line-height: 1.15 !important; }
                      
                      th, td {
                        padding: 2px 4px !important;
                      }
                      
                      /* Border/divider margins */
                      .border-t {
                        margin-top: 3px !important;
                        padding-top: 3px !important;
                      }
                      
                      /* Reduce signature block height */
                      .print\\:w-32 { width: 5.5rem !important; }
                      .print\\:h-8 { height: 1.2rem !important; }
                      .print\\:h-10 { height: 1.5rem !important; }
                      
                      /* Prevent page breaks inside container blocks */
                      .page-break-inside-avoid {
                        page-break-inside: avoid !important;
                      }
                    }
                  ` }} />
                );
              }
              return null;
            })()}
            {/* Print Mode Selector Bar */}
            <div className="bg-white p-4 rounded-2xl border border-brand-200 shadow-sm flex flex-wrap gap-4 items-center justify-between print:hidden">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-brand-900 flex items-center gap-1.5">
                  <FileText size={14} className="text-brand-gold" />
                  Print & PDF Configuration
                </h3>
                <p className="text-[10px] text-brand-500 mt-0.5">
                  Choose between the Customer Invoice copy or a CAD Designer's Blueprint specification sheet.
                </p>
              </div>
              <div className="flex bg-brand-50 p-1 rounded-xl border border-brand-100">
                <button
                  type="button"
                  onClick={() => setIsDesignerMode(false)}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    !isDesignerMode
                      ? 'bg-brand-900 text-brand-gold shadow-sm'
                      : 'text-brand-600 hover:text-brand-900'
                  }`}
                >
                  <UserCheck size={13} />
                  Customer Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setIsDesignerMode(true)}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    isDesignerMode
                      ? 'bg-brand-900 text-brand-gold shadow-sm'
                      : 'text-brand-600 hover:text-brand-900'
                  }`}
                >
                  <Compass size={13} />
                  CAD Designer Specs
                </button>
              </div>
            </div>

            {!isDesignerMode ? (
              <div className="bg-white p-8 rounded-[2rem] border border-brand-200 shadow-xl space-y-6 print:p-0 print:border-none print:shadow-none print:rounded-none print:space-y-3.5">
                {/* Invoice Header */}
                <div className="flex justify-between items-start border-b border-brand-200 pb-6 print:pb-3">
                  <div>
                    <h1 className="font-serif italic font-black text-3xl text-brand-900 tracking-tight print:text-2xl">{settings.storeName || 'Gold & Rose'}</h1>
                    <p className="text-[10px] text-brand-500 font-mono uppercase tracking-widest mt-1 print:text-[8px]">{settings.storeSubName || 'Jewellery Corporation'}</p>
                    <p className="text-xs text-brand-600 mt-2 print:text-[10px] print:mt-1">{settings.storeAddress || '4501 North Rd #209, Burnaby, BC V3N 4J5'}</p>
                    <p className="text-xs text-brand-600 print:text-[10px]">{settings.storeContact || 'info@goldandrosejewellery.com | (604) 420-9077'}</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-brand-900 text-brand-gold px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md print:px-3 print:py-1 print:text-[8px]">
                      {isWholesale ? 'Wholesale Agreement' : 'Custom Retail Estimate'}
                    </span>
                    <p className="text-xs text-brand-500 font-mono mt-3 print:mt-1.5 print:text-[9px]">Date: {new Date().toLocaleDateString()}</p>
                    {session.jobNum && <p className="text-xs font-bold text-brand-800 mt-1 print:mt-0.5 print:text-[9px]">Job #: {session.jobNum}</p>}
                  </div>
                </div>

                {/* Client Credentials & Brief Summary Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-brand-50 p-5 rounded-2xl border border-brand-200 print:gap-3 print:p-3 print:rounded-xl">
                  <div>
                    <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2 print:mb-0.5 print:text-[8px]">Customer Details</h3>
                    <p className="text-sm font-bold text-brand-950 print:text-xs">{session.cName || 'Unnamed Customer'}</p>
                    {session.cPhone && <p className="text-xs text-brand-600 mt-1 print:mt-0 print:text-[10px]">Phone: {session.cPhone}</p>}
                    {session.cEmail && <p className="text-xs text-brand-600 print:text-[10px]">Email: {session.cEmail}</p>}
                  </div>
                  {session.jobDesc && (
                    <div>
                      <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2 print:mb-0.5 print:text-[8px]">
                        {isWholesale ? 'Design Description' : 'Piece Description'}
                      </h3>
                      <p className="text-xs text-brand-700 leading-relaxed italic print:text-[10px] print:leading-snug">"{session.jobDesc}"</p>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div className="space-y-4 print:space-y-2">
                  <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-widest pl-1 print:text-[8px]">Jewelry Specifications Breakdown</h3>
                  <div className="border border-brand-200 rounded-2xl overflow-hidden shadow-sm print:rounded-xl">
                    <table className="w-full text-left border-collapse text-xs print:text-[11px]">
                      <thead>
                        <tr className="bg-brand-900 text-brand-gold border-b border-brand-800 uppercase text-[9px] tracking-wider font-black">
                          <th className="p-3 pl-4 print:p-2 print:pl-3">Piece</th>
                          <th className="p-3 print:p-2">Metal / Material</th>
                          <th className="p-3 print:p-2">Gems & Stones</th>
                          <th className="p-3 print:p-2">Special Addons / Notes</th>
                          <th className="p-3 pr-4 text-right print:p-2 print:pr-3">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-100">
                        {session.rings.filter(r => hasRingData(r)).map((r, ri) => {
                          const cost = calculateRingCost(r, settings, spotPrices, isWholesale ? 'wholesale' : 'retail', session.overridePrices, isWholesale ? session.wholesaleProfileId : undefined);
                          const discVal = parseFloat(r.discount) || 0;
                          const discDeduction = r.discountType === '%' ? cost * (discVal / 100) : discVal;
                          const finalPieceCost = Math.max(0, cost - discDeduction);

                          return (
                            <tr key={r.id} className="hover:bg-brand-50/50 transition-colors">
                              <td className="p-3 pl-4 font-bold text-brand-900 print:p-2 print:pl-3">
                                #{ri + 1} {r.category === 'customRing' ? 'Engagement' : r.category === 'weddingBand' ? 'Band' : r.category === 'mensBand' ? "Men's" : r.category === 'pendant' ? 'Pendant' : r.category === 'earrings' ? 'Earrings' : 'Tennis'}
                              </td>
                              <td className="p-3 print:p-2">
                                <span className="font-semibold block print:text-[11px]">{r.goldKarat ? `${r.goldKarat}K` : ''} {r.metalColor} {r.material}</span>
                                <span className="text-[10px] text-brand-500 font-mono print:text-[9px]">{r.goldGrams || '0.0'}g</span>
                              </td>
                              <td className="p-3 space-y-1 print:p-2 print:space-y-0.5">
                                {r.centerStones && r.centerStones.length > 0 ? (
                                  r.centerStones.map((cs, csIdx) => cs.carats && (
                                    <span key={csIdx} className="block text-[11px] print:text-[10px]">
                                      Center #{csIdx + 1}: {cs.carats}ct {cs.shape} {cs.type} ({cs.origin})
                                    </span>
                                  ))
                                ) : (
                                  <>
                                    {r.centerStone?.carats && (
                                      <span className="block text-[11px] print:text-[10px]">
                                        Center: {r.centerStone.carats}ct {r.centerStone.shape} {r.centerStone.type} ({r.centerStone.origin})
                                      </span>
                                    )}
                                    {r.centerStone2?.carats && (
                                      <span className="block text-[11px] print:text-[10px]">
                                        Stone 2: {r.centerStone2.carats}ct {r.centerStone2.shape} {r.centerStone2.type} ({r.centerStone2.origin})
                                      </span>
                                    )}
                                  </>
                                )}
                                {r.melee.some(m => m.qty) && (
                                  <span className="block text-[10px] text-brand-600 font-mono print:text-[9px]">
                                    Melee: {r.melee.reduce((acc, m) => acc + (parseInt(m.qty) || 0), 0)} st ({r.melee.reduce((acc, m) => acc + ((parseInt(m.qty) || 0) * (parseFloat(m.carat) || 0)), 0).toFixed(2)}ctw)
                                  </span>
                                )}
                                {r.fancy.some(f => f.qty) && (
                                  <span className="block text-[10px] text-brand-600 font-mono print:text-[9px]">
                                    Fancy: {r.fancy.reduce((acc, f) => acc + (parseInt(f.qty) || 0), 0)} st
                                  </span>
                                )}
                              </td>
                              <td className="p-3 space-y-1 print:p-2 print:space-y-0.5">
                                {r.engravingText && <span className="block text-xs font-semibold italic print:text-[10px]" style={{ fontFamily: r.engravingFont }}>"Engraved: {r.engravingText}"</span>}
                                {r.designNotes.map((n, ni) => <span key={ni} className="block text-[10px] text-brand-500 leading-tight print:text-[9px]">• {n.text}</span>)}
                              </td>
                              <td className="p-3 pr-4 text-right font-mono font-bold text-brand-950 print:p-2 print:pr-3 print:text-[11px]">
                                {discVal > 0 ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-slate-400/90 line-through font-normal">
                                      ${cost.toFixed(2)}
                                    </span>
                                    <span className="text-[9px] text-red-600 font-extrabold font-sans">
                                      -{r.discountType === '%' ? `${discVal}%` : `$${discVal.toFixed(2)}`}
                                    </span>
                                    <span className="text-brand-950 font-bold">${finalPieceCost.toFixed(2)}</span>
                                  </div>
                                ) : (
                                  <span>${finalPieceCost.toFixed(2)}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Consolidated Stones & Gemstones Manifest */}
                {consolidatedStones.length > 0 && (
                  <div className="space-y-4 print:space-y-2 border-t border-brand-100 pt-6 print:pt-3">
                    <h3 className="text-xs font-black text-brand-900 uppercase tracking-widest pl-1 flex items-center gap-2 print:text-[9px]">
                      <span>💎 Consolidated Manufacturing Stones & Procurement Manifest</span>
                      <span className="text-[9px] font-black uppercase text-brand-500 font-mono tracking-normal print:text-[7.5px]">
                        ({consolidatedStones.reduce((acc, s) => acc + s.qty, 0)} stones total)
                      </span>
                    </h3>
                    <div className="border border-brand-200 rounded-2xl overflow-hidden shadow-sm print:rounded-xl">
                      <table className="w-full text-left border-collapse text-xs print:text-[10px]">
                        <thead>
                          <tr className="bg-brand-900 text-brand-gold border-b border-brand-800 uppercase text-[9px] tracking-wider font-black">
                            <th className="p-2.5 pl-4 print:p-1.5 print:pl-3">Procurement Source</th>
                            <th className="p-2.5 print:p-1.5">Stone Type</th>
                            <th className="p-2.5 print:p-1.5">Shape/Cut</th>
                            <th className="p-2.5 print:p-1.5">Size/Dimension</th>
                            <th className="p-2.5 print:p-1.5 text-center">Qty</th>
                            <th className="p-2.5 print:p-1.5">Total Weight</th>
                            <th className="p-2.5 pr-4 text-right print:p-1.5 print:pr-3">Used in Pieces</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-100">
                          {consolidatedStones.map((stone, sIdx) => (
                            <tr key={sIdx} className={`${stone.source === 'customer' ? 'bg-amber-50/20' : 'hover:bg-brand-50/30'} transition-colors`}>
                              <td className="p-2.5 pl-4 print:p-1.5 print:pl-3 font-medium">
                                {stone.source === 'customer' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full print:text-[8px] print:px-1.5">
                                    ⚠️ Client Supplied
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full print:text-[8px] print:px-1.5">
                                    🏢 Stock Supplied
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 print:p-1.5 font-bold text-brand-900">{stone.category}</td>
                              <td className="p-2.5 print:p-1.5 font-semibold text-brand-800">{stone.shape}</td>
                              <td className="p-2.5 print:p-1.5 font-mono text-brand-600">{stone.sizeLabel}</td>
                              <td className="p-2.5 print:p-1.5 text-center font-bold font-mono text-brand-950">{stone.qty} pcs</td>
                              <td className="p-2.5 print:p-1.5 font-bold font-mono text-brand-900">
                                {stone.totalCarats > 0 ? `${stone.totalCarats.toFixed(2)} ctw` : '--'}
                              </td>
                              <td className="p-2.5 pr-4 text-right font-bold text-brand-600 print:p-1.5 print:pr-3">
                                {stone.pieces.map(p => `#${p}`).join(', ')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Wholesale Session Cost Breakdown */}
                {isWholesale && (
                  <div className="space-y-4 print:space-y-2 border-t border-brand-100 pt-6 print:pt-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-100/50 pb-3 print:pb-1.5">
                      <h3 className="text-xs font-black text-brand-900 uppercase tracking-widest pl-1 flex items-center gap-2 print:text-[9px]">
                        <span>🛠️ Wholesale Manufacturing Session Cost Breakdown</span>
                      </h3>
                      <div className="flex flex-wrap gap-4 text-[10px] font-bold text-slate-500 font-mono pl-1 sm:pl-0 print:text-[8px] print:gap-3">
                        <div>
                          <span className="text-slate-400">GOLD:</span>{' '}
                          <span className="text-brand-950">${(session.overridePrices?.gold ?? spotPrices.gold).toFixed(2)}/oz</span>
                        </div>
                        <div>
                          <span className="text-slate-400">PLATINUM:</span>{' '}
                          <span className="text-brand-950">${(session.overridePrices?.platinum ?? spotPrices.platinum).toFixed(2)}/oz</span>
                        </div>
                        <div>
                          <span className="text-slate-400">SILVER:</span>{' '}
                          <span className="text-brand-950">${(session.overridePrices?.silver ?? spotPrices.silver).toFixed(2)}/oz</span>
                        </div>
                      </div>
                    </div>
                    {(() => {
                      const wb = getWholesaleBreakdown();
                      const categories = [
                        {
                          title: 'Raw Metal Cost',
                          cost: wb.rawMetalCost,
                          details: wb.rawMetalDetails,
                          bgColor: 'bg-[#f4fbf9]/60',
                          borderColor: 'border-[#e2f5f0]',
                          textColor: 'text-emerald-800'
                        },
                        {
                          title: 'Fabrication Labor',
                          cost: wb.fabLabor,
                          details: wb.fabLaborDetails,
                          bgColor: 'bg-[#f4fbf9]/60',
                          borderColor: 'border-[#e2f5f0]',
                          textColor: 'text-emerald-800'
                        },
                        {
                          title: 'Setting Labor',
                          cost: wb.settingLabor,
                          details: wb.settingLaborDetails,
                          bgColor: 'bg-[#f4fbf9]/60',
                          borderColor: 'border-[#e2f5f0]',
                          textColor: 'text-emerald-800'
                        },
                        {
                          title: 'Stone Supply Cost',
                          cost: wb.stoneSupplyCost,
                          details: wb.stoneSupplyDetails,
                          bgColor: 'bg-[#f4fbf9]/60',
                          borderColor: 'border-[#e2f5f0]',
                          textColor: 'text-emerald-800'
                        },
                        {
                          title: 'Design / Addons',
                          cost: wb.designAddons,
                          details: wb.designAddonsDetails,
                          bgColor: 'bg-[#f4fbf9]/60',
                          borderColor: 'border-[#e2f5f0]',
                          textColor: 'text-emerald-800'
                        }
                      ];

                      return (
                        <div className="space-y-3.5 print:space-y-2">
                          {categories.map((cat, cidx) => (
                            <div key={cidx} className={`p-4 rounded-2xl border ${cat.bgColor} ${cat.borderColor} print:p-3 print:rounded-xl`}>
                              <div className="flex justify-between items-center border-b border-brand-100/30 pb-2 mb-2 print:pb-1.5 print:mb-1.5">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider print:text-[8.5px]">{cat.title}</span>
                                <span className={`font-mono font-black text-base ${cat.textColor} print:text-xs`}>
                                  ${cat.cost.toFixed(2)}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 print:grid-cols-2 print:gap-x-4">
                                {cat.details.map((det, detIdx) => (
                                  <p key={detIdx} className="text-[10.5px] text-slate-600 leading-normal font-medium print:text-[8.5px] print:leading-tight flex items-start gap-1">
                                    <span className="text-emerald-500 mt-0.5">•</span>
                                    <span>{det}</span>
                                  </p>
                                ))}
                                {cat.details.length === 0 && (
                                  <p className="text-[10px] text-slate-400 italic font-medium print:text-[8px]">No charges recorded</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Dynamic Mockups Thumbnail Anchors side-by-side inside the Invoice */}
                {session.rings.some(r => r.referenceSketch || r.referencePhoto || (Array.isArray(r.referenceSketches) && r.referenceSketches.length > 0) || (Array.isArray(r.referencePhotos) && r.referencePhotos.length > 0)) && (
                  <div className="border-t border-brand-100 pt-6 space-y-4 print:pt-3 print:space-y-1.5">
                    <h4 className="text-[10px] font-black text-brand-800 uppercase tracking-widest text-center print:text-[8px]">Reference Sketches & Photos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
                      {session.rings.map((r, ri) => {
                        const rSketches = Array.isArray(r.referenceSketches) ? r.referenceSketches : (r.referenceSketch ? [r.referenceSketch] : []);
                        const rPhotos = Array.isArray(r.referencePhotos) ? r.referencePhotos : (r.referencePhoto ? [r.referencePhoto] : []);
                        if (rSketches.length === 0 && rPhotos.length === 0) return null;
                        return (
                          <div key={r.id} className="border border-brand-100 bg-brand-50/20 rounded-2xl p-3 space-y-3 print:p-1.5 print:space-y-1.5 print:rounded-xl">
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

                {/* Pricing Math calculations details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-brand-200 pt-6 print:pt-3 print:gap-4">
                  <div className="text-xs text-brand-600 leading-relaxed font-mono print:text-[9px]">
                    <p className="font-sans text-brand-700 font-bold uppercase text-[10px] tracking-wider mb-2 print:mb-0.5 print:text-[8px]">Transaction Ledger Notes</p>
                    <p className="text-brand-500 leading-relaxed italic">Estimates are based on dynamic spot valuations in CAD.</p>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-brand-100 print:hidden">
                      <span className="text-xs font-bold text-brand-700">Charge BC Sales Tax (12%)</span>
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-brand-gold bg-brand-100 border-brand-300 rounded focus:ring-brand-gold focus:ring-2 accent-brand-gold"
                        checked={session.applyTax}
                        onChange={(e) => onChangeSession(prev => ({ ...prev, applyTax: e.target.checked }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 text-xs font-mono text-brand-700 print:space-y-1 print:text-[10px]">
                    <div className="flex justify-between"><span>Gross Total Cost:</span><span>${totals.grossTotal.toFixed(2)}</span></div>
                    {totals.totalDiscount > 0 && <div className="flex justify-between text-red-600"><span>Client Deduction Reductions:</span><span>-${totals.totalDiscount.toFixed(2)}</span></div>}
                    {Number(session.scrapCredit) > 0 && (
                      <div className="flex justify-between text-green-600 items-center">
                        <span>Connected Scrap Payout Credit:</span>
                        <span className="flex items-center gap-1.5">
                          -${Number(session.scrapCredit).toFixed(2)}
                          <button 
                            type="button" 
                            onClick={() => onChangeSession(prev => ({ ...prev, scrapCredit: 0 }))}
                            className="text-red-500 hover:text-red-700 ml-1 font-sans font-bold text-[9px] uppercase border border-red-200 bg-red-50 hover:bg-red-100 rounded px-1.5 py-0.5 print:hidden cursor-pointer"
                          >
                            unlink
                          </button>
                        </span>
                      </div>
                    )}
                    <div className="border-t border-brand-200 my-1 print:my-0.5"></div>
                    <div className="flex justify-between"><span>Subtotal Value:</span><span>${totals.subtotal.toFixed(2)}</span></div>
                    {session.applyTax && <div className="flex justify-between"><span>BC Taxes & GST (12%):</span><span>+${totals.tax.toFixed(2)}</span></div>}
                    <div className="border-t-2 border-brand-900 my-1 print:my-0.5"></div>
                    <div className="flex justify-between font-bold text-sm text-brand-950 font-sans print:text-xs">
                      <span>FINAL BALANCE DUE:</span>
                      <span className="text-lg font-black text-brand-900 print:text-sm">${totals.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Authorisation Sign-off block inside PDF */}
                <div className="border-t border-brand-200 pt-6 print:pt-3">
                  <h4 className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2 print:mb-1 print:text-[8px]">Agreement Authorization Signature</h4>
                  <div className="flex flex-col sm:flex-row justify-between items-center bg-brand-50/50 p-4 rounded-2xl border border-brand-200 gap-4 print:p-2.5 print:rounded-xl print:gap-2">
                    <p className="text-[11px] text-brand-600 italic leading-relaxed max-w-md print:text-[9px] print:leading-snug">
                      "I hereby authorize Gold & Rose Jewellery Corp to proceed with CAD engineering models and wax prints for the custom styles breakdown above."
                    </p>
                    {session.signatureImg ? (
                      <div className="bg-white border rounded-xl p-1.5 shadow-sm print:p-1 print:rounded-lg">
                        <img src={session.signatureImg} alt="Client Authorization Signature" className="h-12 w-44 object-contain print:h-8 print:w-32" />
                      </div>
                    ) : (
                      <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider bg-red-50 border border-red-200 px-3 py-2 rounded-xl print:px-2 print:py-1 print:text-[8px] print:rounded-lg">Pending Client Signature Below</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-[2rem] border border-brand-200 shadow-xl space-y-6 print:p-0 print:border-none print:shadow-none print:rounded-none print:space-y-3.5">
                {/* CAD Specs Header */}
                <div className="flex justify-between items-start border-b border-brand-200 pb-6 print:pb-3">
                  <div>
                    <h1 className="font-serif italic font-black text-2xl text-brand-900 tracking-tight flex items-center gap-2 print:text-xl">
                      Gold & Rose
                    </h1>
                    <p className="text-[10px] text-brand-500 font-mono uppercase tracking-widest mt-1 print:text-[8px]">Jewellery Corporation</p>
                    <p className="text-xs text-brand-700 mt-2 font-bold uppercase tracking-wider text-slate-500 print:text-[10px] print:mt-1">🛠️ CAD PRODUCTION BLUEPRINT & SPEC SHEET</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-brand-950 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md print:px-3 print:py-1 print:text-[8px]">
                      CAD Specifications
                    </span>
                    <p className="text-xs text-brand-500 font-mono mt-3 print:mt-1.5 print:text-[9px]">Date: {new Date().toLocaleDateString()}</p>
                    {session.jobNum && <p className="text-xs font-bold text-brand-800 mt-1 print:mt-0.5 print:text-[9px]">Job #: {session.jobNum}</p>}
                  </div>
                </div>

                {/* Client & Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200 print:gap-3 print:p-3 print:rounded-xl">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 print:mb-0.5 print:text-[8px]">Customer / Reference</h3>
                    <p className="text-sm font-bold text-brand-950 print:text-xs">{session.cName || 'Unnamed Customer'}</p>
                    {session.cPhone && <p className="text-xs text-brand-600 mt-0.5 print:text-[10px]">Phone: {session.cPhone}</p>}
                    {session.cEmail && <p className="text-xs text-brand-600 print:text-[10px]">Email: {session.cEmail}</p>}
                  </div>
                  {session.jobDesc && (
                    <div>
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 print:mb-0.5 print:text-[8px]">
                        {isWholesale ? 'Design Overview Notes' : 'Piece Description'}
                      </h3>
                      <p className="text-xs text-brand-700 leading-relaxed italic print:text-[10px] print:leading-snug">"{session.jobDesc}"</p>
                    </div>
                  )}
                </div>

                {/* CAD Items Specs Breakdown */}
                <div className="space-y-8 print:space-y-3">
                  <h3 className="text-xs font-black text-brand-900 uppercase tracking-widest pl-1 border-b border-brand-200 pb-2 print:pb-1 print:text-[10px]">
                    Custom Piece Engineering Specifications
                  </h3>
                  
                  {session.rings.filter(r => hasRingData(r)).map((r, ri) => {
                    const rSketches = Array.isArray(r.referenceSketches) ? r.referenceSketches : (r.referenceSketch ? [r.referenceSketch] : []);
                    const rPhotos = Array.isArray(r.referencePhotos) ? r.referencePhotos : (r.referencePhoto ? [r.referencePhoto] : []);

                    return (
                      <div key={r.id} className="border border-slate-200 rounded-2xl bg-slate-50/20 p-5 space-y-5 page-break-inside-avoid print:p-3 print:space-y-3 print:rounded-xl">
                        {/* Piece Title & Basic Classification */}
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3 print:pb-1.5">
                          <h4 className="text-sm font-black text-brand-900 uppercase tracking-wider print:text-xs">
                            Piece #{ri + 1}: {r.category === 'customRing' ? 'Engagement Ring' : r.category === 'weddingBand' ? 'Wedding Band' : r.category === 'mensBand' ? "Men's Band" : r.category === 'pendant' ? 'Pendant' : r.category === 'earrings' ? 'Earrings' : 'Tennis Bracelet'}
                          </h4>
                          <span className="text-[10px] font-black uppercase bg-slate-200 text-slate-700 px-3 py-1 rounded-md print:px-2 print:py-0.5 print:text-[8px]">
                            {r.material.toUpperCase()} ({r.goldKarat ? `${r.goldKarat}K` : 'N/A'}) - {r.metalColor}
                          </span>
                        </div>

                        {/* Dimensions & Target Specs Grid */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-sm print:p-3 print:space-y-2 print:rounded-xl">
                          <span className="text-[10px] font-black text-brand-900 uppercase tracking-widest block border-b border-slate-100 pb-2 flex items-center gap-1.5 print:pb-1 print:text-[8px]">
                            <Compass size={13} className="text-brand-gold" />
                            CAD Engineering Specifications & Blueprint Parameters
                          </span>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs print:gap-2">
                            <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 print:p-2 print:rounded-lg">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1 print:text-[8px]">
                                {r.category === 'pendant' ? 'Pendant Dimensions' : r.category === 'tennisBracelet' ? 'Bracelet Length' : r.category === 'earrings' ? 'Backing Type' : 'Finger Size'}
                              </span>
                              <span className="font-bold text-brand-950 text-sm print:text-xs">
                                {r.category === 'mensBand' 
                                  ? (r.mbSize || 'Not set') 
                                  : (r.category === 'customRing' || r.category === 'weddingBand') 
                                    ? (r.cRingSize || 'Not set') 
                                    : r.category === 'pendant' 
                                      ? (r.pDimensions || 'N/A') 
                                      : r.category === 'tennisBracelet' 
                                        ? (r.tbLength ? `${r.tbLength}"` : 'N/A') 
                                        : r.category === 'earrings' 
                                          ? (r.backingType || 'N/A') 
                                          : 'N/A'}
                              </span>
                            </div>

                            <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 print:p-2 print:rounded-lg">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1 print:text-[8px]">Band Width</span>
                              <span className="font-bold text-brand-950 text-sm print:text-xs">
                                {r.category === 'mensBand' 
                                  ? (r.mbWidth ? `${r.mbWidth} mm` : 'N/A') 
                                  : (r.category === 'customRing' || r.category === 'weddingBand') 
                                    ? (r.cBandWidth ? `${r.cBandWidth} mm` : 'N/A') 
                                    : 'N/A'}
                              </span>
                            </div>

                            <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 print:p-2 print:rounded-lg">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1 print:text-[8px]">Band Thickness</span>
                              <span className="font-bold text-brand-950 text-sm print:text-xs">
                                {r.category === 'mensBand' 
                                  ? (r.mbThickness ? `${r.mbThickness} mm` : 'N/A') 
                                  : (r.category === 'customRing' || r.category === 'weddingBand') 
                                    ? (r.cBandThickness ? `${r.cBandThickness} mm` : 'N/A') 
                                    : 'N/A'}
                              </span>
                            </div>

                            <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 print:p-2 print:rounded-lg">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1 print:text-[8px]">Target Metal Weight</span>
                              <span className="font-mono font-bold text-brand-950 text-sm print:text-xs">
                                {r.goldGrams || 'N/A'} grams
                              </span>
                            </div>
                          </div>

                          {/* Extra Specific Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 print:gap-2 print:pt-0">
                            <div className="bg-slate-50/30 p-2.5 rounded-xl border border-slate-100 print:p-2 print:rounded-lg">
                              <span className="text-[8px] font-black text-slate-400 uppercase block mb-1 print:text-[7px]">Metal Alloy / Color</span>
                              <span className="font-bold text-brand-900 block print:text-[11px]">
                                {r.goldKarat ? `${r.goldKarat}K` : ''} {r.metalColor} {r.material.toUpperCase()}
                              </span>
                            </div>
                            <div className="bg-slate-50/30 p-2.5 rounded-xl border border-slate-100 print:p-2 print:rounded-lg">
                              <span className="text-[8px] font-black text-slate-400 uppercase block mb-1 print:text-[7px]">Band Profile / Finish Style</span>
                              <span className="font-bold text-brand-900 block print:text-[11px]">
                                {r.category === 'mensBand' ? (r.mbProfile || 'Flat') : (r.bandStyle || 'Solid plain shank / standard')}
                              </span>
                            </div>
                            <div className="bg-slate-50/30 p-2.5 rounded-xl border border-slate-100 print:p-2 print:rounded-lg">
                              <span className="text-[8px] font-black text-slate-400 uppercase block mb-1 print:text-[7px]">Stone Procurement Source</span>
                              <span className={`font-black text-[10px] block print:text-[9px] ${r.stoneSource === 'customer' ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}`}>
                                {r.stoneSource === 'customer' ? '⚠️ Client Supplied Stones' : '🏢 Company Inventory'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Detailed Stones Specification Table */}
                        <div className="space-y-2 print:space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block pl-1 print:text-[8px]">Stones & Gemstones Configuration</span>
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white print:rounded-lg">
                            <table className="w-full text-left border-collapse text-xs font-mono print:text-[10px]">
                              <thead>
                                <tr className="bg-slate-100 text-slate-700 uppercase text-[8px] tracking-wider font-black border-b border-slate-200">
                                  <th className="p-2.5 pl-3 print:py-1 print:px-2 print:pl-2.5">Stone Type</th>
                                  <th className="p-2.5 print:py-1 print:px-2">Shape / Cut</th>
                                  <th className="p-2.5 print:py-1 print:px-2">Qty</th>
                                  <th className="p-2.5 print:py-1 print:px-2">Size (mm)</th>
                                  <th className="p-2.5 print:py-1 print:px-2">Total Ct Weight</th>
                                  <th className="p-2.5 pr-3 print:py-1 print:px-2 print:pr-2.5">Procurement Source</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {/* Center Stone 1 */}
                                {r.centerStones && r.centerStones.length > 0 ? (
                                  r.centerStones.map((cs, csIdx) => cs.carats && (
                                    <tr key={`cs-row-${csIdx}`}>
                                      <td className="p-2.5 pl-3 font-bold font-sans text-brand-950 print:py-1 print:px-2 print:pl-2.5">Center Stone #{csIdx + 1}</td>
                                      <td className="p-2.5 font-bold font-sans print:py-1 print:px-2">{cs.shape}</td>
                                      <td className="p-2.5 print:py-1 print:px-2">1</td>
                                      <td className="p-2.5 print:py-1 print:px-2">--</td>
                                      <td className="p-2.5 font-bold print:py-1 print:px-2">{cs.carats} ct</td>
                                      <td className="p-2.5 font-sans print:py-1 print:px-2">{r.stoneSource === 'customer' ? 'Client' : `${cs.type} (${cs.origin})`}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <>
                                    {r.centerStone?.carats && (
                                      <tr>
                                        <td className="p-2.5 pl-3 font-bold font-sans text-brand-950 print:py-1 print:px-2 print:pl-2.5">Center Stone</td>
                                        <td className="p-2.5 font-bold font-sans print:py-1 print:px-2">{r.centerStone.shape}</td>
                                        <td className="p-2.5 print:py-1 print:px-2">1</td>
                                        <td className="p-2.5 print:py-1 print:px-2">--</td>
                                        <td className="p-2.5 font-bold print:py-1 print:px-2">{r.centerStone.carats} ct</td>
                                        <td className="p-2.5 font-sans print:py-1 print:px-2">{r.stoneSource === 'customer' ? 'Client' : `${r.centerStone.type} (${r.centerStone.origin})`}</td>
                                      </tr>
                                    )}

                                    {/* Center Stone 2 for earrings */}
                                    {r.centerStone2?.carats && (
                                      <tr>
                                        <td className="p-2.5 pl-3 font-bold font-sans text-brand-950 print:py-1 print:px-2 print:pl-2.5">Center Stone 2 (Pair)</td>
                                        <td className="p-2.5 font-bold font-sans print:py-1 print:px-2">{r.centerStone2.shape}</td>
                                        <td className="p-2.5 print:py-1 print:px-2">1</td>
                                        <td className="p-2.5 print:py-1 print:px-2">--</td>
                                        <td className="p-2.5 font-bold print:py-1 print:px-2">{r.centerStone2.carats} ct</td>
                                        <td className="p-2.5 font-sans print:py-1 print:px-2">{r.stoneSource === 'customer' ? 'Client' : `${r.centerStone2.type} (${r.centerStone2.origin})`}</td>
                                      </tr>
                                    )}
                                  </>
                                )}

                                {/* Melee Stones */}
                                {r.melee.filter(m => parseInt(m.qty) > 0).map((m, mIdx) => {
                                  const count = parseInt(m.qty) || 0;
                                  const singleCarat = parseFloat(m.carat) || 0;
                                  const totalCarats = count * singleCarat;
                                  return (
                                    <tr key={`m-${mIdx}`}>
                                      <td className="p-2.5 pl-3 font-sans print:py-1 print:px-2 print:pl-2.5">Melee Accent ({mIdx + 1})</td>
                                      <td className="p-2.5 print:py-1 print:px-2">Round Brilliant</td>
                                      <td className="p-2.5 print:py-1 print:px-2">{count}</td>
                                      <td className="p-2.5 print:py-1 print:px-2">{m.size ? `${m.size}mm` : 'N/A'}</td>
                                      <td className="p-2.5 font-bold print:py-1 print:px-2">{totalCarats.toFixed(2)} ctw</td>
                                      <td className="p-2.5 font-sans print:py-1 print:px-2">Company Inventory</td>
                                    </tr>
                                  );
                                })}

                                {/* Fancy Stones */}
                                {r.fancy.filter(f => parseInt(f.qty) > 0).map((f, fIdx) => {
                                  const count = parseInt(f.qty) || 0;
                                  const sizes = FANCY_SHAPES[f.shape] || [];
                                  const activeSize = sizes[f.sizeIdx] || { label: 'Fancy Melee', carat: 0 };
                                  const totalCarats = count * (activeSize.carat || 0);
                                  return (
                                    <tr key={`f-${fIdx}`}>
                                      <td className="p-2.5 pl-3 font-sans print:py-1 print:px-2 print:pl-2.5">Fancy Accent ({fIdx + 1})</td>
                                      <td className="p-2.5 font-sans font-bold print:py-1 print:px-2">{f.shape}</td>
                                      <td className="p-2.5 print:py-1 print:px-2">{count}</td>
                                      <td className="p-2.5 print:py-1 print:px-2">{activeSize.label}</td>
                                      <td className="p-2.5 font-bold print:py-1 print:px-2">{totalCarats.toFixed(2)} ctw</td>
                                      <td className="p-2.5 font-sans print:py-1 print:px-2">Company Inventory</td>
                                    </tr>
                                  );
                                })}

                                {/* Client Provided Custom Stones list if custom sources exist */}
                                {Array.isArray(r.clientStones) && r.clientStones.filter(cs => parseInt(cs.qty) > 0).map((cs, csIdx) => {
                                  const isFancy = cs.type === 'Fancy';
                                  const isMelee = cs.type === 'Melee';
                                  let shapeDisplay = '--';
                                  let sizeDisplay = cs.size || '--';
                                  let caratDisplay = cs.carats ? `${cs.carats} ct` : '--';

                                  if (isFancy) {
                                    const currentShape = cs.shape || 'Princess';
                                    const sizes = FANCY_SHAPES[currentShape] || [];
                                    const activeSize = sizes[cs.sizeIdx !== undefined ? cs.sizeIdx : 0];
                                    shapeDisplay = currentShape;
                                    sizeDisplay = activeSize ? activeSize.label : '--';
                                    const qtyNum = parseInt(cs.qty) || 0;
                                    caratDisplay = activeSize ? `${(qtyNum * activeSize.carat).toFixed(2)} ctw` : '--';
                                  } else if (isMelee) {
                                    shapeDisplay = 'Round Brilliant';
                                    sizeDisplay = cs.size ? `${cs.size}mm` : '--';
                                    const qtyNum = parseInt(cs.qty) || 0;
                                    const stoneCarat = ROUND_MELEE[cs.size || '1.5'] || 0.015;
                                    caratDisplay = `${(qtyNum * stoneCarat).toFixed(2)} ctw`;
                                  }

                                  return (
                                    <tr key={`cs-${csIdx}`} className="bg-amber-50/50">
                                      <td className="p-2.5 pl-3 font-bold font-sans text-amber-900 print:py-1 print:px-2 print:pl-2.5">Client Supplied ({cs.type === 'Melee' ? 'Round Melee' : cs.type === 'Fancy' ? 'Fancy Melee' : 'Center Stone'})</td>
                                      <td className="p-2.5 font-sans font-bold text-amber-800 print:py-1 print:px-2">{shapeDisplay}</td>
                                      <td className="p-2.5 text-amber-900 print:py-1 print:px-2">{cs.qty}</td>
                                      <td className="p-2.5 text-amber-900 print:py-1 print:px-2">{sizeDisplay}</td>
                                      <td className="p-2.5 font-bold text-amber-900 print:py-1 print:px-2">{caratDisplay}</td>
                                      <td className="p-2.5 font-sans font-bold text-amber-800 print:py-1 print:px-2">Client Provided</td>
                                    </tr>
                                  );
                                })}

                                {/* If no stones whatsoever */}
                                {!(r.centerStones && r.centerStones.some(cs => cs.carats)) && !r.centerStone?.carats && !r.centerStone2?.carats && !r.melee.some(m => parseInt(m.qty) > 0) && !r.fancy.some(f => parseInt(f.qty) > 0) && (!Array.isArray(r.clientStones) || r.clientStones.filter(cs => parseInt(cs.qty) > 0).length === 0) && (
                                  <tr>
                                    <td colSpan={6} className="p-4 text-center font-sans text-slate-400 italic print:py-2">
                                      No stones / gemstones specified. Plain metal band / design.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Special Instructions & Engraving */}
                        {(r.showEngraving || r.designNotes?.length > 0) && (
                          <div className="bg-white p-4 rounded-xl border border-slate-100 text-xs space-y-3 print:p-2.5 print:space-y-1.5 print:rounded-lg">
                            {r.showEngraving && r.engravingText && (
                              <div className="border-b border-slate-100 pb-2.5 print:pb-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1 print:text-[8px] print:mb-0.5">Inside Shank Laser Engraving</span>
                                <span className="block font-bold text-brand-900 italic print:text-[10px]" style={{ fontFamily: r.engravingFont }}>
                                  " {r.engravingText} " <span className="font-sans text-[10px] text-slate-400 font-normal print:text-[8px]"> (Font: {r.engravingFont})</span>
                                </span>
                              </div>
                            )}
                            {r.designNotes?.length > 0 && (
                              <div>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 print:text-[8px] print:mb-0.5">CAD Designer Notes & Blueprint Instructions</span>
                                <div className="space-y-1.5 pl-2 print:space-y-0.5">
                                  {r.designNotes.map((n, ni) => (
                                    <p key={ni} className="text-xs text-slate-700 leading-relaxed font-sans flex items-start gap-1.5 print:text-[10px]">
                                      <span className="text-brand-gold font-bold mt-0.5 print:mt-0">•</span>
                                      {n.text}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Visual References: Sketches & Photos rendered directly inside the specific piece's specs sheet */}
                        {(rSketches.length > 0 || rPhotos.length > 0) && (
                          <div className="space-y-3 pt-2 print:space-y-1 print:pt-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block pl-1 print:text-[8px]">Visual Mockup References</span>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:gap-2">
                              {rSketches.map((sk, skIdx) => (
                                <div key={`sk-${skIdx}`} className="border border-slate-200 rounded-xl p-2 bg-white flex flex-col items-center print:p-2 print:rounded-xl">
                                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1.5 print:mb-1 print:text-[7px]">Sketch {skIdx + 1}</span>
                                  <img src={sk} alt={`Piece ${ri+1} Sketch ${skIdx+1}`} className="h-44 w-full object-contain rounded-lg print:h-64 print:rounded-lg" />
                                </div>
                              ))}
                              {rPhotos.map((ph, phIdx) => (
                                <div key={`ph-${phIdx}`} className="border border-slate-200 rounded-xl p-2 bg-white flex flex-col items-center print:p-2 print:rounded-xl">
                                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1.5 print:mb-1 print:text-[7px]">Photo {phIdx + 1}</span>
                                  <img src={ph} alt={`Piece ${ri+1} Photo ${phIdx+1}`} className="h-44 w-full object-contain rounded-lg print:h-64 print:rounded-lg" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Consolidated Stones & Gemstones Manifest */}
                {consolidatedStones.length > 0 && (
                  <div className="space-y-4 print:space-y-2 border-t border-slate-200 pt-6 print:pt-3">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest pl-1 flex items-center gap-2 print:text-[9px]">
                      <span>🛠️ Consolidated Manufacturing Stones & Procurement Manifest</span>
                      <span className="text-[9px] font-black uppercase text-slate-400 font-mono tracking-normal print:text-[7.5px]">
                        ({consolidatedStones.reduce((acc, s) => acc + s.qty, 0)} stones total)
                      </span>
                    </h3>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm print:rounded-xl">
                      <table className="w-full text-left border-collapse text-xs print:text-[10px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase text-[9px] tracking-wider font-black">
                            <th className="p-2.5 pl-4 print:p-1.5 print:pl-3">Procurement Source</th>
                            <th className="p-2.5 print:p-1.5">Stone Type</th>
                            <th className="p-2.5 print:p-1.5">Shape/Cut</th>
                            <th className="p-2.5 print:p-1.5">Size/Dimension</th>
                            <th className="p-2.5 print:p-1.5 text-center">Qty</th>
                            <th className="p-2.5 print:p-1.5">Total Weight</th>
                            <th className="p-2.5 pr-4 text-right print:p-1.5 print:pr-3">Used in Pieces</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {consolidatedStones.map((stone, sIdx) => (
                            <tr key={sIdx} className={`${stone.source === 'customer' ? 'bg-amber-50/10' : 'hover:bg-slate-50/20'} transition-colors`}>
                              <td className="p-2.5 pl-4 print:p-1.5 print:pl-3 font-medium">
                                {stone.source === 'customer' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full print:text-[8px] print:px-1.5">
                                    ⚠️ Client Supplied
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full print:text-[8px] print:px-1.5">
                                    🏢 Stock Supplied
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 print:p-1.5 font-bold text-slate-900">{stone.category}</td>
                              <td className="p-2.5 print:p-1.5 font-semibold text-slate-700">{stone.shape}</td>
                              <td className="p-2.5 print:p-1.5 font-mono text-slate-600">{stone.sizeLabel}</td>
                              <td className="p-2.5 print:p-1.5 text-center font-bold font-mono text-slate-950">{stone.qty} pcs</td>
                              <td className="p-2.5 print:p-1.5 font-bold font-mono text-slate-900">
                                {stone.totalCarats > 0 ? `${stone.totalCarats.toFixed(2)} ctw` : '--'}
                              </td>
                              <td className="p-2.5 pr-4 text-right font-bold text-slate-600 print:p-1.5 print:pr-3">
                                {stone.pieces.map(p => `#${p}`).join(', ')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Signature / Approval block for CAD Designer */}
                <div className="border-t border-brand-200 pt-6 print:pt-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 print:mb-1 print:text-[8px]">CAD Model Verification Sign-off</h4>
                  <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-5 rounded-2xl border border-slate-200 gap-4 print:p-3 print:rounded-xl print:gap-2">
                    <p className="text-[11px] text-slate-500 italic leading-relaxed max-w-md print:text-[9px] print:leading-snug">
                      "I hereby certify that these digital specifications, measurements, and references have been cross-checked and approved for CAD modeling & 3D prototyping."
                    </p>
                    <div className="border-2 border-dashed border-slate-300 w-44 h-16 rounded-xl flex items-center justify-center bg-white text-[9px] font-black text-slate-400 uppercase tracking-widest print:w-32 print:h-10 print:text-[8px]">
                      Designer Initial / Date
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contract terms client signatures canvas */}
            <div className="bg-white p-6 rounded-3xl border border-brand-100 shadow-md space-y-4 print:hidden">
              <h3 className="text-[10px] font-black text-brand-700 uppercase tracking-wider flex items-center gap-1">
                <Signature size={14} className="text-brand-gold" />
                Sign Authorization Contract
              </h3>
              <p className="text-[10px] text-brand-400 italic">
                Please sign below to lock in estimates. Signatures instantly update the contract document.
              </p>
              <SignaturePad
                initialSignature={session.signatureImg}
                onSave={(sig) => onChangeSession(prev => ({ ...prev, signatureImg: sig }))}
                onClear={() => onChangeSession(prev => ({ ...prev, signatureImg: null }))}
              />
            </div>

            {/* Quick Action Buttons Row */}
            <div className="flex flex-wrap gap-3 items-center justify-center p-2 print:hidden">
              <button
                type="button"
                onClick={() => setShowScrapLinkModal(true)}
                className="bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-800 font-bold py-3 px-6 rounded-2xl text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Calculator size={14} className="text-brand-gold" />
                Link Ledger Scrap Credit
              </button>
              <button
                type="button"
                onClick={onSaveQuote}
                className="bg-brand-900 text-brand-gold hover:bg-brand-950 font-black py-4 px-8 rounded-2xl shadow-lg transition-all text-xs uppercase tracking-widest flex items-center gap-2 border border-brand-800 cursor-pointer"
              >
                <CheckCircle size={14} />
                Commit Quote to Ledger
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onTriggerPrint) {
                    onTriggerPrint(() => window.print());
                  } else {
                    window.print();
                  }
                }}
                className="bg-brand-100 text-brand-900 hover:bg-brand-200 font-bold py-3 px-6 rounded-2xl text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <FileText size={14} className="text-brand-gold" />
                Save & Print PDF
              </button>
            </div>
          </div>
        )}



      {/* SCRAP CREDIT LINKING MODAL */}
      {showScrapLinkModal && (
        <div className="fixed inset-0 bg-brand-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl border border-brand-100 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-4 border-b border-brand-100">
              <div>
                <h3 className="font-serif text-lg font-bold italic text-brand-900">Link Scrap Buyback Credit</h3>
                <p className="text-[10px] text-brand-400 font-mono uppercase tracking-wider">Select a client's scrap buyout to connect as a credit deduction</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowScrapLinkModal(false);
                  setScrapSearchQuery('');
                }}
                className="text-brand-400 hover:text-brand-700 p-1 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Search Input inside Modal */}
            <div className="mt-4 mb-3 relative">
              <input
                type="text"
                placeholder="Search by client name, phone or summary..."
                value={scrapSearchQuery}
                onChange={(e) => setScrapSearchQuery(e.target.value)}
                className="w-full bg-brand-50/50 border border-brand-200 pl-9 pr-4 py-2.5 rounded-xl text-xs font-bold focus:bg-white focus:ring-1 focus:ring-brand-gold outline-none"
              />
              <span className="absolute left-3 top-3.5 text-brand-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>

            {/* List of transactions */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-2 mt-2">
              {(() => {
                const txs = getScrapTransactionsList();
                const filtered = txs.filter(tx => {
                  const query = scrapSearchQuery.toLowerCase();
                  return (
                    (tx.name || '').toLowerCase().includes(query) ||
                    (tx.phone || '').toLowerCase().includes(query) ||
                    (tx.summary || '').toLowerCase().includes(query) ||
                    (tx.date || '').toLowerCase().includes(query)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-brand-400 text-xs font-medium">
                      No matching scrap transactions found in ledger.
                    </div>
                  );
                }

                return filtered.map(tx => {
                  const amt = parseFloat(tx.total) || 0;
                  return (
                    <div 
                      key={tx.id}
                      className="p-3 bg-brand-50/40 hover:bg-brand-50 border border-brand-100 rounded-xl transition-all flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-brand-900 truncate">{tx.name || 'Unnamed Client'}</span>
                          {tx.phone && <span className="text-[9px] text-brand-400 font-mono">{tx.phone}</span>}
                        </div>
                        <p className="text-[9px] text-brand-400 font-mono">{tx.date}</p>
                        <p className="text-[10px] text-brand-600 truncate italic">{tx.summary || 'No items listed'}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-bold text-xs text-brand-gold bg-brand-900 px-2 py-1 rounded">
                          ${amt.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleLinkScrapTransaction(tx)}
                          className="bg-brand-gold hover:bg-brand-500 text-brand-950 font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Link Credit
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}



      {/* CATEGORY SELECTOR MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-brand-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-brand-100 text-center relative">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-brand-400 hover:text-brand-700"
            >
              <XCircleIcon />
            </button>
            <h3 className="font-serif text-xl font-bold italic text-brand-900 mb-4">Select Jewelry Category</h3>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => handleAddNewItem('customRing')}
                className="bg-brand-50 hover:bg-brand-100 font-bold py-3 rounded-xl border border-brand-200 transition-colors text-xs text-brand-800 uppercase tracking-wider"
              >
                Engagement / Custom Ring
              </button>
              <button
                type="button"
                onClick={() => handleAddNewItem('weddingBand')}
                className="bg-brand-50 hover:bg-brand-100 font-bold py-3 rounded-xl border border-brand-200 transition-colors text-xs text-brand-800 uppercase tracking-wider"
              >
                Wedding Band
              </button>
              <button
                type="button"
                onClick={() => handleAddNewItem('mensBand')}
                className="bg-brand-50 hover:bg-brand-100 font-bold py-3 rounded-xl border border-brand-200 transition-colors text-xs text-brand-800 uppercase tracking-wider"
              >
                Men's Band
              </button>
              <button
                type="button"
                onClick={() => handleAddNewItem('pendant')}
                className="bg-brand-50 hover:bg-brand-100 font-bold py-3 rounded-xl border border-brand-200 transition-colors text-xs text-brand-800 uppercase tracking-wider"
              >
                Pendant / Necklace
              </button>
              <button
                type="button"
                onClick={() => handleAddNewItem('earrings')}
                className="bg-brand-50 hover:bg-brand-100 font-bold py-3 rounded-xl border border-brand-200 transition-colors text-xs text-brand-800 uppercase tracking-wider"
              >
                Earrings (Pair)
              </button>
              <button
                type="button"
                onClick={() => handleAddNewItem('tennisBracelet')}
                className="bg-brand-50 hover:bg-brand-100 font-bold py-3 rounded-xl border border-brand-200 transition-colors text-xs text-brand-800 uppercase tracking-wider"
              >
                Tennis Bracelet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAD INTERACTIVE BLUEPRINT WORKSTATION MODAL */}
      {activeCADStyle && (() => {
        const style = CAD_STYLES.find(s => s.id === activeCADStyle);
        if (!style) return null;
        return (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden relative flex flex-col my-8">
              {/* Header */}
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-500/10 p-1.5 rounded-lg border border-brand-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#f1c40f" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold italic text-brand-gold">{style.name} CAD Studio</h3>
                    <p className="text-[9px] text-slate-400 font-mono tracking-widest uppercase">Multi-Angle Orthographic Engineering Views</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCADStyle(null)}
                  className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all outline-none"
                >
                  <XCircleIcon />
                </button>
              </div>

              {/* Workstation Bento Grid */}
              <div className="p-6 bg-slate-950 flex-1 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Perspective View */}
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center relative group">
                    <span className="absolute top-3 left-4 text-[9px] font-mono font-bold text-brand-400 uppercase tracking-widest">PERSPECTIVE (3D CAMERA)</span>
                    <div className="w-full h-56 flex items-center justify-center p-2">
                      {renderCADView(style.id, 'Perspective', activeRing)}
                    </div>
                  </div>

                  {/* Top Down View */}
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center relative group">
                    <span className="absolute top-3 left-4 text-[9px] font-mono font-bold text-brand-400 uppercase tracking-widest">TOP VIEW (PLAN X-Y)</span>
                    <div className="w-full h-56 flex items-center justify-center p-2">
                      {renderCADView(style.id, 'Top', activeRing)}
                    </div>
                  </div>

                  {/* Front View */}
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center relative group">
                    <span className="absolute top-3 left-4 text-[9px] font-mono font-bold text-brand-400 uppercase tracking-widest">FRONT VIEW (ELEVATION X-Z)</span>
                    <div className="w-full h-56 flex items-center justify-center p-2">
                      {renderCADView(style.id, 'Front', activeRing)}
                    </div>
                  </div>

                  {/* Right Profile View */}
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center relative group">
                    <span className="absolute top-3 left-4 text-[9px] font-mono font-bold text-brand-400 uppercase tracking-widest">RIGHT VIEW (PROFILE Y-Z)</span>
                    <div className="w-full h-56 flex items-center justify-center p-2">
                      {renderCADView(style.id, 'Right', activeRing)}
                    </div>
                  </div>
                </div>

                {/* Technical Specifications Overlay info */}
                <div className="mt-4 bg-slate-900 border border-slate-800/80 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">Design Specifications & Multipliers</span>
                    <p className="text-xs text-slate-300">
                      This model incorporates micro-precision prongs and comfort-fit inner shank curves. Weight factor multiplier is <span className="font-bold text-brand-gold font-mono">{style.factor}x</span>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveRing('bandStyle', style.id);
                      setActiveCADStyle(null);
                    }}
                    className="bg-brand-gold text-slate-950 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#ebd047] transition-all shadow-md self-stretch sm:self-auto text-center cursor-pointer"
                  >
                    Select Design Style
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function XCircleIcon({ onClick }: { onClick?: (e: React.MouseEvent) => void }) {
  return (
    <svg
      onClick={onClick}
      className="w-3.5 h-3.5 cursor-pointer text-brand-400 hover:text-red-500 transition-colors"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
  );
}
