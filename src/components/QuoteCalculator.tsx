/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Camera, Compass, Type, Tag, HelpCircle, 
  Signature, CheckCircle, Calculator, Sparkles, AlertCircle, FileText,
  Gem, UserCheck, User
} from 'lucide-react';
import { 
  QuoteSession, JewelryItem, MeleeItem, FancyItem, ClientStoneItem, 
  AddonItem, DesignNote, AppSettings, CategoryType, MaterialType, MetalColorType, StoneSourceType
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
  onLaunchSketch: (type: 'sketch' | 'photo') => void;
  settings: AppSettings;
  spotPrices: { gold: number; silver: number; platinum: number };
  isWholesale: boolean;
}

export default function QuoteCalculator({
  session,
  onChangeSession,
  onSaveQuote,
  onLaunchSketch,
  settings,
  spotPrices,
  isWholesale
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

    const w = settings.wholesale;
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
        const fd = aF[f.sizeIdx] || { carat: 0 };
        const q = Number(f.qty) || 0;
        const rate = Number(w.fancyRates?.[f.shape] ?? 500);
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
  const [activeCADStyle, setActiveCADStyle] = useState<string | null>(null);
  const [simViewMode, setSimViewMode] = useState<'realistic' | 'blueprint'>('realistic');

  // Active ring being edited in the subtab
  const activeRing = session.rings.find(r => r.id === session.activeSubTab);

  // Auto-calculate band weight when relevant inputs change
  useEffect(() => {
    if (!activeRing) return;
    if (activeRing.category !== 'mensBand') return;
    
    const calculated = calculateBandWeight(activeRing);
    if (calculated !== activeRing.goldGrams) {
      updateActiveRing('goldGrams', calculated);
    }
  }, [
    activeRing?.category,
    activeRing?.mbSize,
    activeRing?.mbWidth,
    activeRing?.mbThickness,
    activeRing?.mbProfile,
    activeRing?.cRingSize,
    activeRing?.cBandWidth,
    activeRing?.cBandThickness,
    activeRing?.bandStyle,
    activeRing?.material,
    activeRing?.goldKarat
  ]);

  // Helper to update active ring attributes
  const updateActiveRing = <K extends keyof JewelryItem>(field: K, value: JewelryItem[K]) => {
    onChangeSession(prev => ({
      ...prev,
      rings: prev.rings.map(r => r.id === prev.activeSubTab ? { ...r, [field]: value } : r)
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

  // Multi-item lists mutations
  const addMelee = () => {
    if (!activeRing) return;
    const current = activeRing.melee || [];
    updateActiveRing('melee', [...current, { qty: '', carat: '', size: '1.5' }]);
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
        nm.carat = String(ROUND_MELEE[val] || '0.015');
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
    updateActiveRing('clientStones', [...current, { qty: '', carats: '', type: 'Melee' }]);
  };

  const removeClientStone = (idx: number) => {
    if (!activeRing) return;
    updateActiveRing('clientStones', activeRing.clientStones.filter((_, i) => i !== idx));
  };

  const updateClientStone = (idx: number, field: keyof ClientStoneItem, val: string) => {
    if (!activeRing) return;
    updateActiveRing('clientStones', activeRing.clientStones.map((cs, i) => i === idx ? { ...cs, [field]: val } : cs));
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
    if (session.rings.length <= 1) {
      const reset = getEmptyRing('customRing');
      onChangeSession(prev => ({
        ...prev,
        rings: [reset],
        activeSubTab: reset.id
      }));
    } else {
      onChangeSession(prev => {
        const remaining = prev.rings.filter(r => r.id !== id);
        return {
          ...prev,
          rings: remaining,
          activeSubTab: remaining[0].id
        };
      });
    }
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
      const cost = calculateRingCost(r, settings, spotPrices, isWholesale ? 'wholesale' : 'retail', session.overridePrices);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* 1. Client Intake Form */}
      {!isWholesale ? (
        <div className="bg-[#f8fafc] rounded-2xl border border-slate-200/60 p-5 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Client Intake</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">CLIENT NAME *</label>
              <input
                type="text"
                placeholder="Required for billing"
                className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold shadow-sm outline-none focus:border-slate-400"
                value={session.cName}
                onChange={(e) => onChangeSession(prev => ({ ...prev, cName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">PHONE</label>
              <input
                type="text"
                placeholder="604-555-5555"
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
                className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold shadow-sm outline-none focus:border-slate-400"
                value={session.cEmail}
                onChange={(e) => onChangeSession(prev => ({ ...prev, cEmail: e.target.value }))}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#f0fdf4] rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Wholesale Account Intake</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="text-[10px] font-bold text-emerald-700 mb-1 block">JOB # *</label>
              <input
                type="text"
                placeholder="e.g. Job #8859"
                className="w-full bg-white border border-emerald-200 p-3 rounded-xl text-xs font-bold shadow-sm outline-none focus:border-emerald-400"
                value={session.jobNum}
                onChange={(e) => onChangeSession(prev => ({ ...prev, jobNum: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-emerald-700 mb-1 block">ITEM DESCRIPTION</label>
              <input
                type="text"
                placeholder="e.g. 14K Solitaire Ring with 4 Claws"
                className="w-full bg-white border border-emerald-200 p-3 rounded-xl text-xs font-bold shadow-sm outline-none focus:border-emerald-400"
                value={session.jobDesc}
                onChange={(e) => onChangeSession(prev => ({ ...prev, jobDesc: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-emerald-700 mb-1 block">CLIENT NAME</label>
              <input
                type="text"
                placeholder="Store / Name"
                className="w-full bg-white border border-emerald-200 p-3 rounded-xl text-xs font-bold shadow-sm outline-none focus:border-emerald-400"
                value={session.cName}
                onChange={(e) => onChangeSession(prev => ({ ...prev, cName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-emerald-700 mb-1 block">PHONE</label>
              <input
                type="text"
                placeholder="604-555-5555"
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
        <div className="bg-[#0f172a] text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-[#1e293b] to-slate-900 opacity-50"></div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Left Side: Piece Breakdown */}
            <div className="space-y-3.5 border-r border-slate-700/40 pr-0 md:pr-6 text-left">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">PIECE BREAKDOWN</div>
              
              <div className="space-y-2 max-h-56 overflow-y-auto font-mono text-xs">
                {session.rings.map((r, ri) => {
                  if (!hasRingData(r)) return null;
                  const cost = calculateRingCost(r, settings, spotPrices, 'retail');
                  const discVal = parseFloat(r.discount) || 0;
                  const discDeduction = r.discountType === '%' ? cost * (discVal / 100) : discVal;
                  const finalPieceCost = Math.max(0, cost - discDeduction);

                  return (
                    <div key={r.id} className="flex justify-between items-center text-slate-300">
                      <span className="truncate font-bold text-slate-200">
                        Piece {ri + 1}: {r.category === 'customRing' ? 'Engagement' : r.category === 'weddingBand' ? 'Band' : r.category === 'mensBand' ? "Men's" : r.category === 'pendant' ? 'Pendant' : r.category === 'earrings' ? 'Earrings' : 'Tennis'}
                      </span>
                      <span className="font-bold text-[#f1c40f]">${finalPieceCost.toFixed(2)}</span>
                    </div>
                  );
                })}

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
        <div className="bg-[#0f2d24] text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
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
      <div className="flex overflow-x-auto hide-scrollbar whitespace-nowrap items-center gap-2 border-b border-slate-100 pb-3">
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
              {session.rings.length > 1 && (
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fadeIn">
            {/* COLUMN 1: Metal Attributes & Structural Spec */}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-brand-50/50 p-4 rounded-2xl border border-brand-100">
                  {/* Ring Size Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-brand-700 uppercase tracking-wider">Ring Size (US)</span>
                      <span className="text-brand-900 font-mono font-black bg-white px-1.5 py-0.5 rounded border border-brand-100">
                        {(parseFloat(activeRing.mbSize) || 9.0).toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="4.0"
                      max="15.0"
                      step="0.25"
                      value={parseFloat(activeRing.mbSize) || 9.0}
                      onChange={(e) => updateActiveRing('mbSize', e.target.value)}
                      className="w-full accent-brand-900 cursor-pointer h-1.5 bg-brand-200/60 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[7px] text-brand-400 font-black font-mono">
                      <span>Size 4.0 (Small)</span>
                      <span>9.0 (Average)</span>
                      <span>15.0 (Large)</span>
                    </div>
                  </div>

                  {/* Width Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-brand-700 uppercase tracking-wider">Band Width</span>
                      <span className="text-brand-900 font-mono font-black bg-white px-1.5 py-0.5 rounded border border-brand-100">
                        {(parseFloat(activeRing.mbWidth) || 6.0).toFixed(1)} mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min="2.0"
                      max="12.0"
                      step="0.1"
                      value={parseFloat(activeRing.mbWidth) || 6.0}
                      onChange={(e) => updateActiveRing('mbWidth', e.target.value)}
                      className="w-full accent-brand-900 cursor-pointer h-1.5 bg-brand-200/60 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[7px] text-brand-400 font-black font-mono">
                      <span>2.0mm (Sleek)</span>
                      <span>6.0mm (Classic)</span>
                      <span>12.0mm (Statement)</span>
                    </div>
                  </div>

                  {/* Thickness Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-brand-700 uppercase tracking-wider">Band Thickness</span>
                      <span className="text-brand-900 font-mono font-black bg-white px-1.5 py-0.5 rounded border border-brand-100">
                        {(parseFloat(activeRing.mbThickness) || 1.8).toFixed(1)} mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="3.5"
                      step="0.1"
                      value={parseFloat(activeRing.mbThickness) || 1.8}
                      onChange={(e) => updateActiveRing('mbThickness', e.target.value)}
                      className="w-full accent-brand-900 cursor-pointer h-1.5 bg-brand-200/60 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between text-[7px] text-brand-400 font-black font-mono">
                      <span>1.0mm (Ultra-thin)</span>
                      <span>1.8mm (Medium)</span>
                      <span>3.5mm (Heavy-duty)</span>
                    </div>
                  </div>

                  <div className="col-span-3 space-y-2 pt-2 border-t border-brand-100">
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
                            className={`p-2 pb-2.5 rounded-xl border transition-all flex flex-col items-center text-center justify-between min-h-[90px] w-full ${
                              isSelected
                                ? 'bg-brand-900 border-brand-900 text-white shadow-md'
                                : 'bg-white border-brand-100 text-brand-800 hover:border-brand-300'
                            }`}
                          >
                            <div className="w-full h-10 flex items-center justify-center my-1">
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
                            <div className="mt-1 w-full">
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
                      const widthVal = parseFloat(activeRing.mbWidth) || 6.0;
                      const thicknessVal = parseFloat(activeRing.mbThickness) || 1.8;
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
                                Live Profile Simulator (2D Cross-Section)
                              </h4>
                              <p className="text-[10px] text-brand-500 font-medium mt-0.5">Interactive scale-accurate physical prototyping model</p>
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

              {activeRing.category === 'tennisBracelet' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-brand-50/50 p-4 rounded-2xl border border-brand-100">
                  <div>
                    <label className="text-[9px] font-bold text-brand-500 mb-0.5 block">Length (inches)</label>
                    <input
                      type="number"
                      placeholder="7.0"
                      className="w-full bg-white border border-brand-200 p-2 rounded-xl text-xs font-bold"
                      value={activeRing.tbLength || ''}
                      onChange={(e) => updateActiveRing('tbLength', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-brand-500 mb-0.5 block">Stone Cut/Shape</label>
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
                      <label className="text-[9px] font-bold text-brand-500 mb-0.5 block">Size (mm)</label>
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
                      <label className="text-[9px] font-bold text-brand-500 mb-0.5 block">Size Dimensions</label>
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

                  {/* Manual Override Toggles */}
                  <div className="col-span-2 sm:col-span-4 border-t border-brand-100 pt-3 mt-1 grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[8px] font-bold text-brand-400 uppercase">Override Stones qty</label>
                      <input
                        type="number"
                        placeholder="Est: ..."
                        className="w-full bg-white border border-brand-200 p-2 rounded-xl text-xs font-bold"
                        value={activeRing.tbManualStones || ''}
                        onChange={(e) => updateActiveRing('tbManualStones', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-brand-400 uppercase">Override Metal Grams</label>
                      <input
                        type="number"
                        placeholder="Est: ..."
                        className="w-full bg-white border border-brand-200 p-2 rounded-xl text-xs font-bold"
                        value={activeRing.tbManualGrams || ''}
                        onChange={(e) => {
                          updateActiveRing('tbManualGrams', e.target.value);
                          updateActiveRing('goldGrams', e.target.value);
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-brand-400 uppercase">Override Total ctw</label>
                      <input
                        type="number"
                        placeholder="Est: ..."
                        className="w-full bg-white border border-brand-200 p-2 rounded-xl text-xs font-bold"
                        value={activeRing.tbManualCarats || ''}
                        onChange={(e) => updateActiveRing('tbManualCarats', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* COLUMN 2: Stone Sourcing, Addons & Reductions */}
            <div className="space-y-6 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
              {/* SECTION 2: Stone Sourcing */}
              <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-brand-50 pb-1">
                <h3 className="text-[10px] font-black text-brand-400 uppercase tracking-wider block">2. Stone Supply & Setting</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateActiveRing('stoneSource', 'our')}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all flex items-center gap-1 ${activeRing.stoneSource === 'our' ? 'bg-brand-900 text-brand-gold border-brand-900 shadow-sm' : 'bg-brand-50 text-brand-500 border-brand-200 hover:bg-brand-100'}`}
                  >
                    <Gem size={10} className="shrink-0 text-brand-gold" />
                    Our Stones
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActiveRing('stoneSource', 'customer')}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all flex items-center gap-1 ${activeRing.stoneSource === 'customer' ? 'bg-brand-900 text-brand-gold border-brand-900 shadow-sm' : 'bg-brand-50 text-brand-500 border-brand-200 hover:bg-brand-100'}`}
                  >
                    <UserCheck size={10} className="shrink-0 text-brand-gold" />
                    Client Stones
                  </button>
                </div>
              </div>

              {/* CENTER STONE(S) PARAMETERS */}
              {['customRing', 'pendant', 'earrings'].includes(activeRing.category) && activeRing.centerStone && (
                <div className="space-y-3 p-4 bg-brand-50/50 rounded-2xl border border-brand-100">
                  <p className="text-[9px] font-black text-brand-700 uppercase tracking-wider mb-1">Center Diamond Details</p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div>
                      <label className="text-[8px] font-bold text-brand-400 block mb-0.5">Carat Weight</label>
                      <input
                        type="number"
                        placeholder="1.00"
                        className="w-full bg-white border border-brand-200 p-2 rounded-lg text-xs font-bold"
                        value={activeRing.centerStone.carats}
                        onChange={(e) => updateCenterStone('carats', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-brand-400 block mb-0.5">Shape</label>
                      <select
                        className="w-full bg-white border border-brand-200 p-2 rounded-lg text-xs font-bold"
                        value={activeRing.centerStone.shape}
                        onChange={(e) => updateCenterStone('shape', e.target.value)}
                      >
                        {CENTER_SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-brand-400 block mb-0.5">Setting Style</label>
                      <select
                        className="w-full bg-white border border-brand-200 p-2 rounded-lg text-xs font-bold"
                        value={activeRing.centerStone.setting}
                        onChange={(e) => updateCenterStone('setting', e.target.value)}
                      >
                        {SETTING_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-brand-400 block mb-0.5">Stone Type</label>
                      <select
                        className="w-full bg-white border border-brand-200 p-2 rounded-lg text-xs font-bold"
                        value={activeRing.centerStone.type}
                        onChange={(e) => updateCenterStone('type', e.target.value)}
                      >
                        {Object.keys(settings.centerStoneRates).map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-brand-400 block mb-0.5">Origin</label>
                      <select
                        className="w-full bg-white border border-brand-200 p-2 rounded-lg text-xs font-bold"
                        value={activeRing.centerStone.origin}
                        onChange={(e) => updateCenterStone('origin', e.target.value)}
                      >
                        <option value="Lab">Lab-grown</option>
                        <option value="Natural">Natural</option>
                      </select>
                    </div>
                  </div>

                  {/* EARRING CENTER STONE 2 (IF PAIR) */}
                  {activeRing.category === 'earrings' && activeRing.centerStone2 && (
                    <div className="border-t border-brand-100 pt-3 mt-2 space-y-2">
                      <p className="text-[9px] font-black text-brand-700 uppercase tracking-wider">Earring Stone 2 Details (Symmetrical match)</p>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        <div>
                          <label className="text-[8px] font-bold text-brand-400 block mb-0.5">Carat Weight</label>
                          <input
                            type="number"
                            placeholder="1.00"
                            className="w-full bg-white border border-brand-200 p-2 rounded-lg text-xs font-bold"
                            value={activeRing.centerStone2.carats}
                            onChange={(e) => updateCenterStone2('carats', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-brand-400 block mb-0.5">Shape</label>
                          <select
                            className="w-full bg-white border border-brand-200 p-2 rounded-lg text-xs font-bold"
                            value={activeRing.centerStone2.shape}
                            onChange={(e) => updateCenterStone2('shape', e.target.value)}
                          >
                            {CENTER_SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-brand-400 block mb-0.5">Setting Style</label>
                          <select
                            className="w-full bg-white border border-brand-200 p-2 rounded-lg text-xs font-bold"
                            value={activeRing.centerStone2.setting}
                            onChange={(e) => updateCenterStone2('setting', e.target.value)}
                          >
                            {SETTING_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-brand-400 block mb-0.5">Stone Type</label>
                          <select
                            className="w-full bg-white border border-brand-200 p-2 rounded-lg text-xs font-bold"
                            value={activeRing.centerStone2.type}
                            onChange={(e) => updateCenterStone2('type', e.target.value)}
                          >
                            {Object.keys(settings.centerStoneRates).map(st => <option key={st} value={st}>{st}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-brand-400 block mb-0.5">Origin</label>
                          <select
                            className="w-full bg-white border border-brand-200 p-2 rounded-lg text-xs font-bold"
                            value={activeRing.centerStone2.origin}
                            onChange={(e) => updateCenterStone2('origin', e.target.value)}
                          >
                            <option value="Lab">Lab-grown</option>
                            <option value="Natural">Natural</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MELEE DIAMONDS EXPANDABLE ROWS */}
              {activeRing.stoneSource === 'our' && activeRing.category !== 'tennisBracelet' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-brand-50/50 p-2.5 rounded-xl border border-brand-100">
                    <span className="text-[9px] font-black text-brand-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Gem size={11} className="text-brand-500" /> Supplied Round Melee
                    </span>
                    <button
                      type="button"
                      onClick={addMelee}
                      className="text-[9px] font-black bg-white hover:bg-brand-50 text-brand-800 border border-brand-200 px-2.5 py-1 rounded shadow-sm flex items-center gap-0.5"
                    >
                      <Plus size={10} /> Add Melee Row
                    </button>
                  </div>
                  {activeRing.melee?.map((m, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-brand-50/20 p-2.5 rounded-xl border border-brand-100">
                      <div className="col-span-3">
                        <label className="text-[8px] text-brand-400 uppercase">Stones Qty</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-brand-200 p-1.5 rounded text-xs font-bold"
                          value={m.qty}
                          onChange={(e) => updateMelee(idx, 'qty', e.target.value)}
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="text-[8px] text-brand-400 uppercase">Size (mm)</label>
                        <select
                          className="w-full bg-white border border-brand-200 p-1.5 rounded text-xs font-bold"
                          value={m.size}
                          onChange={(e) => updateMelee(idx, 'size', e.target.value)}
                        >
                          {Object.keys(ROUND_MELEE).map(sz => (
                            <option key={sz} value={sz}>{sz}mm ({ROUND_MELEE[sz]}ct)</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-4">
                        <label className="text-[8px] text-brand-400 uppercase">Total Carats (ctw)</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-brand-200 p-1.5 rounded text-xs font-bold"
                          value={(Number(m.qty) * Number(m.carat)).toFixed(3)}
                          disabled
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeMelee(idx)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded"
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
                  <div className="flex justify-between items-center bg-brand-50/50 p-2.5 rounded-xl border border-brand-100">
                    <span className="text-[9px] font-black text-brand-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={11} className="text-brand-500 animate-pulse" /> Supplied Fancy Melee
                    </span>
                    <button
                      type="button"
                      onClick={addFancy}
                      className="text-[9px] font-black bg-white hover:bg-brand-50 text-brand-800 border border-brand-200 px-2.5 py-1 rounded shadow-sm flex items-center gap-0.5"
                    >
                      <Plus size={10} /> Add Fancy Row
                    </button>
                  </div>
                  {activeRing.fancy?.map((f, idx) => {
                    const sizes = FANCY_SHAPES[f.shape] || [];
                    const activeSize = sizes[f.sizeIdx] || { carat: 0 };
                    return (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-brand-50/20 p-2.5 rounded-xl border border-brand-100">
                        <div className="col-span-3">
                          <label className="text-[8px] text-brand-400 uppercase">Stones Qty</label>
                          <input
                            type="number"
                            className="w-full bg-white border border-brand-200 p-1.5 rounded text-xs font-bold"
                            value={f.qty}
                            onChange={(e) => updateFancy(idx, 'qty', e.target.value)}
                          />
                        </div>
                        <div className="col-span-4">
                          <label className="text-[8px] text-brand-400 uppercase">Cut/Shape</label>
                          <select
                            className="w-full bg-white border border-brand-200 p-1.5 rounded text-xs font-bold"
                            value={f.shape}
                            onChange={(e) => updateFancy(idx, 'shape', e.target.value)}
                          >
                            {Object.keys(FANCY_SHAPES).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="col-span-4">
                          <label className="text-[8px] text-brand-400 uppercase">Carat Size</label>
                          <select
                            className="w-full bg-white border border-brand-200 p-1.5 rounded text-xs font-bold"
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
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded"
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
                <div className="flex justify-between items-center bg-brand-50/50 p-2.5 rounded-xl border border-brand-100">
                  <span className="text-[9px] font-black text-brand-700 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck size={11} className="text-brand-500" /> Client-Owned Setting Fees
                  </span>
                  <button
                    type="button"
                    onClick={addClientStone}
                    className="text-[9px] font-black bg-white hover:bg-brand-50 text-brand-800 border border-brand-200 px-2.5 py-1 rounded shadow-sm flex items-center gap-0.5"
                  >
                    <Plus size={10} /> Add Client Setting Fee Row
                  </button>
                </div>
                {activeRing.clientStones?.map((c, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-brand-50/20 p-2.5 rounded-xl border border-brand-100">
                    <div className="col-span-3">
                      <label className="text-[8px] text-brand-400 uppercase">Stones Qty</label>
                      <input
                        type="number"
                        className="w-full bg-white border border-brand-200 p-1.5 rounded text-xs font-bold"
                        value={c.qty}
                        onChange={(e) => updateClientStone(idx, 'qty', e.target.value)}
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="text-[8px] text-brand-400 uppercase">Stone Type Category</label>
                      <select
                        className="w-full bg-white border border-brand-200 p-1.5 rounded text-xs font-bold"
                        value={c.type}
                        onChange={(e) => updateClientStone(idx, 'type', e.target.value as any)}
                      >
                        <option value="Center">Center Stone</option>
                        <option value="Fancy">Fancy Melee</option>
                        <option value="Melee">Round Melee</option>
                      </select>
                    </div>
                    <div className="col-span-4">
                      <label className="text-[8px] text-brand-400 uppercase">Total Carats (ctw)</label>
                      <input
                        type="number"
                        placeholder="Optional"
                        className="w-full bg-white border border-brand-200 p-1.5 rounded text-xs font-bold"
                        value={c.carats}
                        onChange={(e) => updateClientStone(idx, 'carats', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeClientStone(idx)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 3: Custom Add-ons & Engravings */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-brand-400 uppercase tracking-wider block border-b border-brand-50 pb-1">3. Custom Add-ons</h3>
              
              {/* Addons List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-brand-50/50 p-2.5 rounded-xl border border-brand-100">
                  <span className="text-[9px] font-black text-brand-700 uppercase tracking-wider">Custom Addon (CAD)</span>
                  <button
                    type="button"
                    onClick={addAddon}
                    className="text-[9px] font-black bg-white hover:bg-brand-50 text-brand-800 border border-brand-200 px-2.5 py-1 rounded shadow-sm flex items-center gap-0.5"
                  >
                    <Plus size={10} /> Add Fee Row
                  </button>
                </div>
                {activeRing.addons?.map((a, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-brand-50/20 p-2.5 rounded-xl border border-brand-100">
                    <div className="col-span-4">
                      <label className="text-[8px] text-brand-400 uppercase">Fee Amount ($)</label>
                      <input
                        type="number"
                        placeholder="100"
                        className="w-full bg-white border border-brand-200 p-1.5 rounded text-xs font-bold"
                        value={a.fee}
                        onChange={(e) => updateAddon(idx, 'fee', e.target.value)}
                      />
                    </div>
                    <div className="col-span-7">
                      <label className="text-[8px] text-brand-400 uppercase">Fee Description</label>
                      <input
                        type="text"
                        placeholder="french pave, 2 tone, appraisal"
                        className="w-full bg-white border border-brand-200 p-1.5 rounded text-xs font-bold"
                        value={a.desc}
                        onChange={(e) => updateAddon(idx, 'desc', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeAddon(idx)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded"
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
                    Apply Laser Engraving (+$50)
                  </span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-brand-gold bg-brand-100 border-brand-300 rounded focus:ring-brand-gold focus:ring-2 accent-brand-gold"
                    checked={activeRing.showEngraving}
                    onChange={(e) => updateActiveRing('showEngraving', e.target.checked)}
                  />
                </div>
                {activeRing.showEngraving && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 animate-fadeIn">
                    <input
                      type="text"
                      placeholder="Enter engraving inscription..."
                      className="w-full bg-white border border-brand-200 p-2 rounded-xl text-xs font-medium"
                      value={activeRing.engravingText}
                      onChange={(e) => updateActiveRing('engravingText', e.target.value)}
                    />
                    <select
                      className="w-full bg-white border border-brand-200 p-2 rounded-xl text-xs font-bold"
                      value={activeRing.engravingFont}
                      onChange={(e) => updateActiveRing('engravingFont', e.target.value)}
                    >
                      <option value="'Times New Roman', Times, serif">Serif Script</option>
                      <option value="'Great Vibes', cursive">Calligraphy Script</option>
                      <option value="'Dancing Script', cursive">Elegant Hand</option>
                    </select>
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

            {/* COLUMN 3: Pricing Summary Rail */}
            <div className="space-y-6">
              {/* Piece specific thumbnail sketches & controls */}
              {activeRing && (
                <div className="bg-white p-3 rounded-2xl border border-brand-100 shadow-sm space-y-3">
                  <h3 className="text-[10px] font-black text-brand-800 uppercase tracking-widest border-b border-brand-100 pb-2 flex items-center gap-1.5 justify-center">
                    <Camera size={12} className="text-brand-gold" />
                    Sketches & Reference Photo
                  </h3>
                  
                  <div className="flex justify-center gap-2">
                    {/* Sketch canvas click trigger */}
                    <button
                      type="button"
                      onClick={() => onLaunchSketch('sketch')}
                      className="group relative border border-brand-200 hover:border-brand-400 bg-brand-50/50 hover:bg-brand-50 rounded-xl p-1.5 transition-all flex flex-col items-center justify-center w-20 h-20 shadow-sm cursor-pointer overflow-hidden text-center"
                    >
                      {activeRing.referenceSketch ? (
                        <img src={activeRing.referenceSketch} alt="Sketch" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <div className="py-1 space-y-1">
                          <Sparkles size={14} className="text-brand-gold mx-auto group-hover:scale-110 transition-transform" />
                          <span className="text-[8px] font-bold text-brand-700 block leading-tight">Interactive Sketch</span>
                        </div>
                      )}
                    </button>

                    {/* photo uploader thumbnail trigger */}
                    <button
                      type="button"
                      onClick={() => onLaunchSketch('photo')}
                      className="group relative border border-brand-200 hover:border-brand-400 bg-brand-50/50 hover:bg-brand-50 rounded-xl p-1.5 transition-all flex flex-col items-center justify-center w-20 h-20 shadow-sm cursor-pointer overflow-hidden text-center"
                    >
                      {activeRing.referencePhoto ? (
                        <img src={activeRing.referencePhoto} alt="Photo reference" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <div className="py-1 space-y-1">
                          <Camera size={14} className="text-brand-gold mx-auto group-hover:scale-110 transition-transform" />
                          <span className="text-[8px] font-bold text-brand-700 block leading-tight">Photo Backdrop</span>
                        </div>
                      )}
                    </button>
                  </div>
                  <p className="text-[8px] text-brand-400 italic text-center">Click thumbnails to open Sketchpad Suite</p>
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

                {/* Save buttons */}
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
          </div>
        )}

        {/* SUMMARY & TAX CONFIGURATION TAB */}
        {session.activeSubTab === 'summary' && (
          <div className="space-y-6 animate-fadeIn print:bg-white print:p-0">
            {/* Beautiful Printable Invoice View */}
            <div className="bg-white p-8 rounded-[2rem] border border-brand-200 shadow-xl space-y-6 print:p-0 print:border-none print:shadow-none print:rounded-none">
              {/* Invoice Header */}
              <div className="flex justify-between items-start border-b border-brand-200 pb-6">
                <div>
                  <h1 className="font-serif italic font-black text-3xl text-brand-900 tracking-tight">Gold & Rose</h1>
                  <p className="text-[10px] text-brand-500 font-mono uppercase tracking-widest mt-1">Jewellery Corporation</p>
                  <p className="text-xs text-brand-600 mt-2">Suite 120 - 4590 Kingsway, Burnaby, BC</p>
                  <p className="text-xs text-brand-600">info@goldandrose.com | 604-555-0192</p>
                </div>
                <div className="text-right">
                  <span className="bg-brand-900 text-brand-gold px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                    {isWholesale ? 'Wholesale Agreement' : 'Custom Retail Estimate'}
                  </span>
                  <p className="text-xs text-brand-500 font-mono mt-3">Date: {new Date().toLocaleDateString()}</p>
                  {session.jobNum && <p className="text-xs font-bold text-brand-800 mt-1">Job #: {session.jobNum}</p>}
                </div>
              </div>

              {/* Client Credentials & Brief Summary Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-brand-50 p-5 rounded-2xl border border-brand-200">
                <div>
                  <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2">Customer Details</h3>
                  <p className="text-sm font-bold text-brand-950">{session.cName || 'Unnamed Customer'}</p>
                  {session.cPhone && <p className="text-xs text-brand-600 mt-1">Phone: {session.cPhone}</p>}
                  {session.cEmail && <p className="text-xs text-brand-600">Email: {session.cEmail}</p>}
                </div>
                {session.jobDesc && (
                  <div>
                    <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2">Design Description</h3>
                    <p className="text-xs text-brand-700 leading-relaxed italic">"{session.jobDesc}"</p>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-widest pl-1">Jewelry Specifications Breakdown</h3>
                <div className="border border-brand-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-brand-900 text-brand-gold border-b border-brand-800 uppercase text-[9px] tracking-wider font-black">
                        <th className="p-3 pl-4">Piece</th>
                        <th className="p-3">Metal / Material</th>
                        <th className="p-3">Gems & Stones</th>
                        <th className="p-3">Special Addons / Notes</th>
                        <th className="p-3 pr-4 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-100">
                      {session.rings.filter(r => hasRingData(r)).map((r, ri) => {
                        const cost = calculateRingCost(r, settings, spotPrices, isWholesale ? 'wholesale' : 'retail', session.overridePrices);
                        const discVal = parseFloat(r.discount) || 0;
                        const discDeduction = r.discountType === '%' ? cost * (discVal / 100) : discVal;
                        const finalPieceCost = Math.max(0, cost - discDeduction);

                        return (
                          <tr key={r.id} className="hover:bg-brand-50/50 transition-colors">
                            <td className="p-3 pl-4 font-bold text-brand-900">
                              #{ri + 1} {r.category === 'customRing' ? 'Engagement' : r.category === 'weddingBand' ? 'Band' : r.category === 'mensBand' ? "Men's" : r.category === 'pendant' ? 'Pendant' : r.category === 'earrings' ? 'Earrings' : 'Tennis'}
                            </td>
                            <td className="p-3">
                              <span className="font-semibold block">{r.goldKarat ? `${r.goldKarat}K` : ''} {r.metalColor} {r.material}</span>
                              <span className="text-[10px] text-brand-500 font-mono">{r.goldGrams || '0.0'}g</span>
                            </td>
                            <td className="p-3 space-y-1">
                              {r.centerStone?.carats && (
                                <span className="block text-[11px]">
                                  Center: {r.centerStone.carats}ct {r.centerStone.shape} {r.centerStone.type} ({r.centerStone.origin})
                                </span>
                              )}
                              {r.centerStone2?.carats && (
                                <span className="block text-[11px]">
                                  Stone 2: {r.centerStone2.carats}ct {r.centerStone2.shape} {r.centerStone2.type} ({r.centerStone2.origin})
                                </span>
                              )}
                              {r.melee.some(m => m.qty) && (
                                <span className="block text-[10px] text-brand-600 font-mono">
                                  Melee: {r.melee.reduce((acc, m) => acc + (parseInt(m.qty) || 0), 0)} st ({r.melee.reduce((acc, m) => acc + ((parseInt(m.qty) || 0) * (parseFloat(m.carat) || 0)), 0).toFixed(2)}ctw)
                                </span>
                              )}
                              {r.fancy.some(f => f.qty) && (
                                <span className="block text-[10px] text-brand-600 font-mono">
                                  Fancy: {r.fancy.reduce((acc, f) => acc + (parseInt(f.qty) || 0), 0)} st
                                </span>
                              )}
                            </td>
                            <td className="p-3 space-y-1">
                              {r.engravingText && <span className="block text-[10px] italic">"Engraved: {r.engravingText}"</span>}
                              {r.designNotes.map((n, ni) => <span key={ni} className="block text-[10px] text-brand-500 leading-tight">• {n.text}</span>)}
                            </td>
                            <td className="p-3 pr-4 text-right font-mono font-bold text-brand-950">
                              ${finalPieceCost.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dynamic Mockups Thumbnail Anchors side-by-side inside the Invoice */}
              {session.rings.some(r => r.referenceSketch || r.referencePhoto) && (
                <div className="border-t border-brand-100 pt-6 space-y-4">
                  <h4 className="text-[10px] font-black text-brand-800 uppercase tracking-widest text-center">Reference Sketches & Photos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {session.rings.map((r, ri) => {
                      if (!r.referenceSketch && !r.referencePhoto) return null;
                      return (
                        <div key={r.id} className="border border-brand-100 bg-brand-50/20 rounded-2xl p-3 space-y-3">
                          <p className="text-[10px] font-black uppercase text-brand-600 tracking-wider">
                            Piece {ri + 1}: {r.category === 'customRing' ? 'Custom Ring' : r.category === 'weddingBand' ? 'Band' : r.category === 'mensBand' ? "Men's Band" : r.category === 'pendant' ? 'Pendant' : r.category === 'earrings' ? 'Earrings' : 'Tennis'}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {r.referenceSketch && (
                              <div className="border border-brand-200 rounded-xl p-1.5 bg-white flex flex-col items-center">
                                <span className="text-[8px] font-black uppercase text-brand-400 tracking-wider mb-1">Sketch</span>
                                <img src={r.referenceSketch} alt={`Piece ${ri+1} Sketch`} className="h-28 w-full object-contain rounded" />
                              </div>
                            )}
                            {r.referencePhoto && (
                              <div className="border border-brand-200 rounded-xl p-1.5 bg-white flex flex-col items-center">
                                <span className="text-[8px] font-black uppercase text-brand-400 tracking-wider mb-1">Photo Reference</span>
                                <img src={r.referencePhoto} alt={`Piece ${ri+1} Photo`} className="h-28 w-full object-contain rounded" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pricing Math calculations details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-brand-200 pt-6">
                <div className="text-xs text-brand-600 leading-relaxed font-mono">
                  <p className="font-sans text-brand-700 font-bold uppercase text-[10px] tracking-wider mb-2">Transaction Ledger Notes</p>
                  <p className="text-brand-500 leading-relaxed italic">Estimates are based on dynamic spot valuations in CAD.</p>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-brand-100">
                    <span className="text-xs font-bold text-brand-700">Charge BC Sales Tax (12%)</span>
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-brand-gold bg-brand-100 border-brand-300 rounded focus:ring-brand-gold focus:ring-2 accent-brand-gold"
                      checked={session.applyTax}
                      onChange={(e) => onChangeSession(prev => ({ ...prev, applyTax: e.target.checked }))}
                    />
                  </div>
                </div>
                <div className="space-y-2 text-xs font-mono text-brand-700">
                  <div className="flex justify-between"><span>Gross Total Cost:</span><span>${totals.grossTotal.toFixed(2)}</span></div>
                  {totals.totalDiscount > 0 && <div className="flex justify-between text-red-600"><span>Client Deduction Reductions:</span><span>-${totals.totalDiscount.toFixed(2)}</span></div>}
                  {Number(session.scrapCredit) > 0 && <div className="flex justify-between text-green-600"><span>Connected Scrap Payout Credit:</span><span>-${Number(session.scrapCredit).toFixed(2)}</span></div>}
                  <div className="border-t border-brand-200 my-1"></div>
                  <div className="flex justify-between"><span>Subtotal Value:</span><span>${totals.subtotal.toFixed(2)}</span></div>
                  {session.applyTax && <div className="flex justify-between"><span>BC Taxes & GST (12%):</span><span>+${totals.tax.toFixed(2)}</span></div>}
                  <div className="border-t-2 border-brand-900 my-1"></div>
                  <div className="flex justify-between font-bold text-sm text-brand-950 font-sans">
                    <span>FINAL BALANCE DUE:</span>
                    <span className="text-lg font-black text-brand-900">${totals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Authorisation Sign-off block inside PDF */}
              <div className="border-t border-brand-200 pt-6">
                <h4 className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2">Agreement Authorization Signature</h4>
                <div className="flex flex-col sm:flex-row justify-between items-center bg-brand-50/50 p-4 rounded-2xl border border-brand-200 gap-4">
                  <p className="text-[11px] text-brand-600 italic leading-relaxed max-w-md">
                    "I hereby authorize Gold & Rose Jewellery Corp to proceed with CAD engineering models and wax prints for the custom styles breakdown above."
                  </p>
                  {session.signatureImg ? (
                    <div className="bg-white border rounded-xl p-1.5 shadow-sm">
                      <img src={session.signatureImg} alt="Client Authorization Signature" className="h-12 w-44 object-contain" />
                    </div>
                  ) : (
                    <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider bg-red-50 border border-red-200 px-3 py-2 rounded-xl">Pending Client Signature Below</span>
                  )}
                </div>
              </div>
            </div>

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
                onClick={handleLinkLatestScrap}
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
                onClick={() => window.print()}
                className="bg-brand-100 text-brand-900 hover:bg-brand-200 font-bold py-3 px-6 rounded-2xl text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <FileText size={14} className="text-brand-gold" />
                Save & Print PDF
              </button>
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
