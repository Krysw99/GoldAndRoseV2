/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { 
  Pen, Highlighter, Eraser, Move, 
  RotateCw, RefreshCw, X, Check, Camera, Sparkles, HelpCircle,
  Undo2, Redo2, Ruler, Grid3X3, Minus, Maximize2
} from 'lucide-react';
import { CENTER_SHAPES } from '../constants';
import { compressImage } from '../utils';

// --- Visual Jewelry Cut Stamp Icons Helper ---
const StampIcon = ({ shape, className = "w-5 h-5" }: { shape: string; className?: string }) => {
  const strokeColor = "currentColor";
  
  if (shape === 'Ring Rail') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="12" cy="12" r="7" stroke={strokeColor} strokeWidth="1" strokeDasharray="2 1" />
      </svg>
    );
  }
  
  if (shape === 'Round') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="12" cy="12" r="5" stroke={strokeColor} strokeWidth="1" />
        <path d="M12 3 L12 21 M3 12 L21 12 M5.6 5.6 L18.4 18.4 M5.6 18.4 L18.4 5.6" stroke={strokeColor} strokeWidth="1" opacity="0.6" />
      </svg>
    );
  }
  
  if (shape === 'Princess') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="1" stroke={strokeColor} strokeWidth="1.5" />
        <rect x="7" y="7" width="10" height="10" stroke={strokeColor} strokeWidth="1" />
        <path d="M3 3 L21 21 M21 3 L3 21" stroke={strokeColor} strokeWidth="1" opacity="0.6" />
      </svg>
    );
  }
  
  if (shape === 'Oval') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="12" cy="12" rx="6" ry="9" stroke={strokeColor} strokeWidth="1.5" />
        <ellipse cx="12" cy="12" rx="3" ry="5.5" stroke={strokeColor} strokeWidth="1" />
        <path d="M12 3 L12 21 M6 12 L18 12 M7.8 5.6 L16.2 18.4 M7.8 18.4 L16.2 5.6" stroke={strokeColor} strokeWidth="1" opacity="0.5" />
      </svg>
    );
  }
  
  if (shape === 'Pear') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3 C16.5 9, 18 15, 12 21 C6 15, 7.5 9, 12 3 Z" stroke={strokeColor} strokeWidth="1.5" />
        <path d="M12 7 C14.5 11, 15.5 15, 12 19 C8.5 15, 9.5 11, 12 7 Z" stroke={strokeColor} strokeWidth="1" />
        <path d="M12 3 L12 21 M12 12 L6.5 14 M12 12 L17.5 14 M12 12 L9 18.5 M12 12 L15 18.5" stroke={strokeColor} strokeWidth="1" opacity="0.5" />
      </svg>
    );
  }
  
  if (shape === 'Emerald') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 3 H17 L21 7 V17 L17 21 H7 L3 17 V7 Z" stroke={strokeColor} strokeWidth="1.5" />
        <path d="M9.5 6 H14.5 L17 8.5 V15.5 L14.5 18 H9.5 L7 15.5 V8.5 Z" stroke={strokeColor} strokeWidth="1" />
        <path d="M3 7 L7 9.5 M21 7 L17 8.5 M3 17 L7 15.5 M21 17 L17 15.5" stroke={strokeColor} strokeWidth="1" opacity="0.6" />
      </svg>
    );
  }
  
  if (shape === 'Marquise') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2 C17 8, 17 16, 12 22 C7 16, 7 8, 12 2 Z" stroke={strokeColor} strokeWidth="1.5" />
        <path d="M12 6 C15 10, 15 14, 12 18 C9 14, 9 10, 12 6 Z" stroke={strokeColor} strokeWidth="1" />
        <path d="M12 2 L12 22 M12 12 L7 12 M12 12 L17 12" stroke={strokeColor} strokeWidth="1" opacity="0.5" />
      </svg>
    );
  }
  
  if (shape === 'Cushion') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 3 H19 C21 5, 21 19, 19 21 H5 C3 19, 3 5, 5 3 Z" stroke={strokeColor} strokeWidth="1.5" />
        <path d="M8 6.5 H16 C17.3 7.8, 17.3 16.2, 16 17.5 H8 C6.7 16.2, 6.7 7.8, 8 6.5 Z" stroke={strokeColor} strokeWidth="1" />
        <path d="M3 5 L8 6.5 M21 5 L16 6.5 M3 19 L8 17.5 M21 19 L16 17.5" stroke={strokeColor} strokeWidth="1" opacity="0.5" />
      </svg>
    );
  }
  
  if (shape === 'Radiant') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 3 H17 L21 7 V17 L17 21 H7 L3 17 V7 Z" stroke={strokeColor} strokeWidth="1.5" />
        <path d="M3 3 L21 21 M21 3 L3 21" stroke={strokeColor} strokeWidth="1" opacity="0.4" />
      </svg>
    );
  }
  
  if (shape.endsWith('Side')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Table top */}
        <path d="M7 6 H17" stroke={strokeColor} strokeWidth="1.5" />
        {/* Crown angled facets */}
        <path d="M7 6 L3 11 M17 6 L21 11" stroke={strokeColor} strokeWidth="1.5" />
        {/* Girdle horizontal */}
        <path d="M2 11 H22" stroke={strokeColor} strokeWidth="1.5" />
        <path d="M2 13 H22" stroke={strokeColor} strokeWidth="1" opacity="0.7" />
        {/* Pavilion pointed bottom */}
        <path d="M2 13 L12 21 L22 13" stroke={strokeColor} strokeWidth="1.5" />
        {/* Pavilion facets */}
        <path d="M8 13 L12 21 L16 13" stroke={strokeColor} strokeWidth="1" opacity="0.6" />
        {/* Crown facet lines */}
        <path d="M10 6 L8 11 M14 6 L16 11" stroke={strokeColor} strokeWidth="1" opacity="0.6" />
      </svg>
    );
  }
  
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke={strokeColor} strokeWidth="1.5" />
    </svg>
  );
};

// --- Jewelry Overlay Stencil Drawer Helpers ---
const drawSolitaireStencil = (ctx: CanvasRenderingContext2D, size: number) => {
  const rStone = size * 0.35;
  const rProng = size * 0.04;
  const prongDist = rStone - rProng * 0.5;

  ctx.beginPath();
  // Band (extends left and right)
  ctx.moveTo(-size * 0.7, 0);
  ctx.lineTo(size * 0.7, 0);
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Band walls / thickness
  ctx.beginPath();
  ctx.moveTo(-size * 0.7, -4);
  ctx.lineTo(size * 0.7, -4);
  ctx.moveTo(-size * 0.7, 4);
  ctx.lineTo(size * 0.7, 4);
  ctx.strokeStyle = '#aaaaaa';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Center stone circle
  ctx.beginPath();
  ctx.arc(0, 0, rStone, 0, 2 * Math.PI);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Facet lines for round diamond look
  ctx.beginPath();
  ctx.arc(0, 0, rStone * 0.55, 0, 2 * Math.PI);
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const x1 = Math.cos(angle) * (rStone * 0.55);
    const y1 = Math.sin(angle) * (rStone * 0.55);
    const x2 = Math.cos(angle) * rStone;
    const y2 = Math.sin(angle) * rStone;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.strokeStyle = '#e5c158';
  ctx.lineWidth = 0.75;
  ctx.stroke();

  // Draw 4 prongs
  const prongAngles = [Math.PI/4, 3*Math.PI/4, 5*Math.PI/4, 7*Math.PI/4];
  prongAngles.forEach(angle => {
    const px = Math.cos(angle) * prongDist;
    const py = Math.sin(angle) * prongDist;
    ctx.beginPath();
    ctx.arc(px, py, rProng, 0, 2 * Math.PI);
    ctx.fillStyle = '#94a3b8';
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Faint dashed crosshairs
  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  ctx.moveTo(-size * 0.8, 0);
  ctx.lineTo(size * 0.8, 0);
  ctx.moveTo(0, -size * 0.8);
  ctx.lineTo(0, size * 0.8);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.setLineDash([]);
};

const drawCathedralStencil = (ctx: CanvasRenderingContext2D, size: number) => {
  const rRing = size * 0.35;
  const bandThickness = size * 0.05;

  ctx.beginPath();
  ctx.arc(0, rRing * 0.5, rRing, 0, 2 * Math.PI);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, rRing * 0.5, rRing + bandThickness, 0, 2 * Math.PI);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const archTopY = -rRing * 0.7;
  const archTopWidth = size * 0.15;

  ctx.beginPath();
  ctx.moveTo(-rRing - bandThickness, rRing * 0.5);
  ctx.quadraticCurveTo(-rRing, -rRing * 0.3, -archTopWidth, archTopY);
  ctx.lineTo(-archTopWidth + 4, archTopY);
  ctx.quadraticCurveTo(-rRing + bandThickness, -rRing * 0.1, -rRing, rRing * 0.5);

  ctx.moveTo(rRing + bandThickness, rRing * 0.5);
  ctx.quadraticCurveTo(rRing, -rRing * 0.3, archTopWidth, archTopY);
  ctx.lineTo(archTopWidth - 4, archTopY);
  ctx.quadraticCurveTo(rRing - bandThickness, -rRing * 0.1, rRing, rRing * 0.5);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const stoneHeight = size * 0.22;
  const stoneWidth = size * 0.3;
  const headTopY = archTopY - stoneHeight;

  ctx.beginPath();
  ctx.moveTo(-stoneWidth * 0.45, headTopY);
  ctx.lineTo(-5, archTopY);
  ctx.lineTo(5, archTopY);
  ctx.lineTo(stoneWidth * 0.45, headTopY);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-stoneWidth * 0.4, headTopY + stoneHeight * 0.4);
  ctx.lineTo(stoneWidth * 0.4, headTopY + stoneHeight * 0.4);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const stoneYTable = headTopY;
  const stoneYGirdle = headTopY + stoneHeight * 0.4;
  const stoneYCulet = headTopY + stoneHeight;

  ctx.beginPath();
  ctx.moveTo(-stoneWidth * 0.3, stoneYTable);
  ctx.lineTo(stoneWidth * 0.3, stoneYTable);
  ctx.lineTo(stoneWidth * 0.5, stoneYGirdle);
  ctx.lineTo(-stoneWidth * 0.5, stoneYGirdle);
  ctx.closePath();
  ctx.fillStyle = 'rgba(212, 175, 55, 0.1)';
  ctx.fill();
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-stoneWidth * 0.5, stoneYGirdle);
  ctx.lineTo(0, stoneYCulet);
  ctx.lineTo(stoneWidth * 0.5, stoneYGirdle);
  ctx.closePath();
  ctx.fillStyle = 'rgba(212, 175, 55, 0.1)';
  ctx.fill();
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 1;
  ctx.stroke();
};

const drawHaloStencil = (ctx: CanvasRenderingContext2D, size: number) => {
  const rCenterStone = size * 0.22;
  const rHaloOuter = size * 0.38;
  const rHaloInner = size * 0.26;

  ctx.beginPath();
  ctx.moveTo(-size * 0.7, 0);
  ctx.lineTo(-rHaloOuter, 0);
  ctx.moveTo(rHaloOuter, 0);
  ctx.lineTo(size * 0.7, 0);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  const drawCushion = (cx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    const w = r * 0.95, h = r, c = r * 0.3;
    cx.moveTo(x - w + c, y - h);
    cx.quadraticCurveTo(x + w, y - h, x + w, y - h + c);
    cx.quadraticCurveTo(x + w, y + h, x + w - c, y + h);
    cx.quadraticCurveTo(x - w, y + h, x - w, y + h - c);
    cx.quadraticCurveTo(x - w, y - h, x - w + c, y - h);
  };

  ctx.beginPath();
  drawCushion(ctx, 0, 0, rCenterStone);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  drawCushion(ctx, 0, 0, rCenterStone * 0.6);
  ctx.strokeStyle = '#e5c158';
  ctx.lineWidth = 0.75;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, rHaloOuter, 0, 2 * Math.PI);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, rHaloInner, 0, 2 * Math.PI);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  const numMelee = 14;
  const meleeRadius = (rHaloOuter - rHaloInner) * 0.45;
  const meleeDist = (rHaloOuter + rHaloInner) / 2;

  for (let i = 0; i < numMelee; i++) {
    const angle = (i * 2 * Math.PI) / numMelee;
    const mx = Math.cos(angle) * meleeDist;
    const my = Math.sin(angle) * meleeDist;

    ctx.beginPath();
    ctx.arc(mx, my, meleeRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 0.75;
    ctx.stroke();

    const prongAngle = angle + (Math.PI / numMelee);
    const px = Math.cos(prongAngle) * rHaloOuter;
    const py = Math.sin(prongAngle) * rHaloOuter;
    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#64748b';
    ctx.fill();
  }
};

const drawThreeStoneStencil = (ctx: CanvasRenderingContext2D, size: number) => {
  const rCenter = size * 0.24;
  const rSide = size * 0.16;
  const sideOffset = rCenter + rSide * 0.85;

  ctx.beginPath();
  ctx.moveTo(-size * 0.7, 0);
  ctx.lineTo(-sideOffset - rSide, 0);
  ctx.moveTo(sideOffset + rSide, 0);
  ctx.lineTo(size * 0.7, 0);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, rCenter, 0, 2 * Math.PI);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, rCenter * 0.55, 0, 2 * Math.PI);
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    ctx.moveTo(Math.cos(angle) * (rCenter * 0.55), Math.sin(angle) * (rCenter * 0.55));
    ctx.lineTo(Math.cos(angle) * rCenter, Math.sin(angle) * rCenter);
  }
  ctx.strokeStyle = '#e5c158';
  ctx.lineWidth = 0.75;
  ctx.stroke();

  const lx = -sideOffset;
  ctx.beginPath();
  ctx.arc(lx, 0, rSide, 0, 2 * Math.PI);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 1.25;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(lx, 0, rSide * 0.55, 0, 2 * Math.PI);
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    ctx.moveTo(lx + Math.cos(angle) * (rSide * 0.55), Math.sin(angle) * (rSide * 0.55));
    ctx.lineTo(lx + Math.cos(angle) * rSide, Math.sin(angle) * rSide);
  }
  ctx.strokeStyle = '#e5c158';
  ctx.lineWidth = 0.75;
  ctx.stroke();

  const rx = sideOffset;
  ctx.beginPath();
  ctx.arc(rx, 0, rSide, 0, 2 * Math.PI);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 1.25;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(rx, 0, rSide * 0.55, 0, 2 * Math.PI);
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    ctx.moveTo(rx + Math.cos(angle) * (rSide * 0.55), Math.sin(angle) * (rSide * 0.55));
    ctx.lineTo(rx + Math.cos(angle) * rSide, Math.sin(angle) * rSide);
  }
  ctx.strokeStyle = '#e5c158';
  ctx.lineWidth = 0.75;
  ctx.stroke();

  const prongDistC = rCenter - 2;
  const centerProngAngles = [Math.PI/4, 3*Math.PI/4, 5*Math.PI/4, 7*Math.PI/4];
  centerProngAngles.forEach(angle => {
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * prongDistC, Math.sin(angle) * prongDistC, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#64748b';
    ctx.fill();
  });

  const leftProngAngles = [Math.PI/3, 2*Math.PI/3, 4*Math.PI/3, 5*Math.PI/3];
  leftProngAngles.forEach(angle => {
    ctx.beginPath();
    ctx.arc(lx + Math.cos(angle) * rSide, Math.sin(angle) * rSide, 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#94a3b8';
    ctx.fill();
  });

  const rightProngAngles = [Math.PI/6, 5*Math.PI/6, 7*Math.PI/6, 11*Math.PI/6];
  rightProngAngles.forEach(angle => {
    ctx.beginPath();
    ctx.arc(rx + Math.cos(angle) * rSide, Math.sin(angle) * rSide, 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#94a3b8';
    ctx.fill();
  });
};

const drawPaveBandStencil = (ctx: CanvasRenderingContext2D, size: number) => {
  const bandWidth = size * 0.3;
  const bandHeight = size * 1.2;

  const leftX = -bandWidth / 2;
  const rightX = bandWidth / 2;

  ctx.beginPath();
  ctx.moveTo(leftX, -bandHeight / 2);
  ctx.lineTo(leftX, bandHeight / 2);
  ctx.moveTo(rightX, -bandHeight / 2);
  ctx.lineTo(rightX, bandHeight / 2);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.setLineDash([2, 4]);
  ctx.moveTo(leftX, 0);
  ctx.lineTo(rightX, 0);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.setLineDash([]);

  const numStones = 7;
  const stoneRadius = bandWidth * 0.42;
  const spacing = bandHeight / (numStones + 1);

  for (let i = 0; i < numStones; i++) {
    const sy = -bandHeight / 2 + (i + 1) * spacing;

    ctx.beginPath();
    ctx.arc(0, sy, stoneRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#f1f5f9';
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, sy, stoneRadius * 0.5, 0, 2 * Math.PI);
    ctx.moveTo(0, sy - stoneRadius); ctx.lineTo(0, sy + stoneRadius);
    ctx.moveTo(-stoneRadius, sy); ctx.lineTo(stoneRadius, sy);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    const beadOffset = stoneRadius * 0.9;
    const beads = [
      { bx: -beadOffset, by: sy - beadOffset },
      { bx: beadOffset, by: sy - beadOffset },
      { bx: -beadOffset, by: sy + beadOffset },
      { bx: beadOffset, by: sy + beadOffset }
    ];
    beads.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.bx, b.by, 1.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#94a3b8';
      ctx.fill();
    });
  }
};

const drawStencilMaster = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  type: string,
  size: number,
  opacity: number,
  rotateDeg: number,
  offsetX: number,
  offsetY: number
) => {
  ctx.clearRect(0, 0, width, height);
  if (!type || type === 'none') return;

  ctx.save();
  ctx.globalAlpha = opacity;
  
  const cx = width / 2 + offsetX;
  const cy = height / 2 + offsetY;

  ctx.translate(cx, cy);
  ctx.rotate((rotateDeg * Math.PI) / 180);

  if (type === 'solitaire') {
    drawSolitaireStencil(ctx, size);
  } else if (type === 'cathedral') {
    drawCathedralStencil(ctx, size);
  } else if (type === 'halo') {
    drawHaloStencil(ctx, size);
  } else if (type === 'threestone') {
    drawThreeStoneStencil(ctx, size);
  } else if (type === 'pave') {
    drawPaveBandStencil(ctx, size);
  }

  ctx.restore();
};

interface SketchpadProps {
  initialImage: string | null; // sketch or reference photo
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  title: string;
}

interface ImageState {
  x: number;
  y: number;
  scale: number;
  rot: number;
  width: number;
  height: number;
}

export default function Sketchpad({ initialImage, onSave, onCancel, title }: SketchpadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stencilCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRectRef = useRef<DOMRect | null>(null);

  // Drawing tool state
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser' | 'transform' | 'stamp' | 'ruler' | 'line'>('pen');
  const [color, setColor] = useState('#1e293b'); // Slate dark
  const [thickness, setThickness] = useState(3.0);
  const [stampShape, setStampShape] = useState<string>('');

  // Straight line drawing states
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  const [lineEnd, setLineEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDrawingLine, setIsDrawingLine] = useState(false);

  // Symmetry, Grid, Ruler & Undo/Redo states
  const [symmetryMode, setSymmetryMode] = useState<'none' | 'vertical' | 'horizontal' | 'quad'>('none');
  const [isGridEnabled, setIsGridEnabled] = useState<boolean>(false);
  const [gridCellSize, setGridCellSize] = useState<number>(30); // 30px = 2mm
  const [includeGridAndRulersInExport, setIncludeGridAndRulersInExport] = useState<boolean>(false);

  // Undo/Redo state history stacks
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Ruler tape state
  const [rulerStart, setRulerStart] = useState<{ x: number; y: number } | null>(null);
  const [rulerEnd, setRulerEnd] = useState<{ x: number; y: number } | null>(null);
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false);
  const [rulerMeasurements, setRulerMeasurements] = useState<Array<{ start: { x: number; y: number }; end: { x: number; y: number } }>>([]);

  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Stencil states
  const [stencilType, setStencilType] = useState<string>('none');
  const [stencilSize, setStencilSize] = useState<number>(200);
  const [stencilOpacity, setStencilOpacity] = useState<number>(0.4);
  const [stencilRotate, setStencilRotate] = useState<number>(0);
  const [stencilOffsetX, setStencilOffsetX] = useState<number>(0);
  const [stencilOffsetY, setStencilOffsetY] = useState<number>(0);
  const [stencilIncludeInExport, setStencilIncludeInExport] = useState<boolean>(true);

  // Background image state
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [bgSrc, setBgSrc] = useState<string | null>(null);
  const [imgState, setImgState] = useState<ImageState>({
    x: 0,
    y: 0,
    scale: 1,
    rot: 0,
    width: 0,
    height: 0
  });

  // Interactivity tracking
  const [isDrawing, setIsDrawing] = useState(false);
  const [transformMode, setTransformMode] = useState<'drag' | 'scale' | 'rotate' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialImgState, setInitialImgState] = useState<ImageState | null>(null);
  const [transformCenter, setTransformCenter] = useState({ x: 0, y: 0 });
  const [transformStartDist, setTransformStartDist] = useState(1);
  const [transformStartAngle, setTransformStartAngle] = useState(0);

  // Saved canvas data for interactive stamp previewing
  const [savedCanvasData, setSavedCanvasData] = useState<ImageData | null>(null);

  // Active interactive stamp state
  const [activeStamp, setActiveStamp] = useState<{
    shape: string;
    x: number;
    y: number;
    size: number;
    angle: number;
    color: string;
    thickness: number;
  } | null>(null);

  // Active stamp transformation mode ('drag' | 'scale' | 'rotate')
  const [stampTransformMode, setStampTransformMode] = useState<'drag' | 'scale' | 'rotate' | null>(null);
  const [stampDragStart, setStampDragStart] = useState({ x: 0, y: 0 });
  const [initialStampTransformState, setInitialStampTransformState] = useState<{
    x: number;
    y: number;
    size: number;
    angle: number;
  } | null>(null);
  const [stampTransformStartDist, setStampTransformStartDist] = useState(1);
  const [stampTransformStartAngle, setStampTransformStartAngle] = useState(0);

  // Instant Stamp parameters
  const [stampSize, setStampSize] = useState<number>(45);
  const [stampAngle, setStampAngle] = useState<number>(0);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);

  // Pinch-to-zoom & pan states for tablet/mobile sketchpad navigation
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);

  // References for tracking multi-touch / pinch gestures
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);
  const initialPinchMidpointRef = useRef<{ x: number; y: number } | null>(null);
  const initialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const wasGesturingRef = useRef<boolean>(false);

  // Click & hold / Drag-to-resize stamp states
  const [isStamping, setIsStamping] = useState<boolean>(false);
  const stampStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const initialStampSizeRef = useRef<number>(45);
  const dragThresholdMetRef = useRef<boolean>(false);

  // Tool UI indicators
  const jewelryColors = [
    { name: 'Slate Gray', val: '#1e293b', bgClass: 'bg-slate-800' },
    { name: 'Yellow Gold', val: '#E5C453', bgClass: 'bg-yellow-500' },
    { name: 'Rose Gold', val: '#E0A899', bgClass: 'bg-rose-300' },
    { name: 'Platinum / White Gold', val: '#D1D5DB', bgClass: 'bg-gray-300' },
    { name: 'Onyx Black', val: '#0f172a', bgClass: 'bg-black' },
    { name: 'Diamond Blue', val: '#38BDF8', bgClass: 'bg-sky-400' },
    { name: 'Ruby Red', val: '#DC2626', bgClass: 'bg-red-600' },
    { name: 'Emerald Green', val: '#059669', bgClass: 'bg-emerald-600' },
    { name: 'Sapphire Blue', val: '#2563EB', bgClass: 'bg-blue-600' }
  ];

  const thicknessOptions = [
    { label: 'Fine', val: 1.5 },
    { label: 'Medium', val: 3.5 },
    { label: 'Bold', val: 6.5 }
  ];

  // Load initial background image if any
  useEffect(() => {
    if (initialImage) {
      setBgSrc(initialImage);
      const img = new Image();
      img.onload = () => {
        setBgImage(img);
        
        // Auto-scale background image to fit nicely inside the canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const s = Math.min(1, (canvas.width / img.width) * 0.75, (canvas.height / img.height) * 0.75);
          setImgState({
            x: (canvas.width - img.width * s) / 2,
            y: (canvas.height - img.height * s) / 2,
            scale: s,
            rot: 0,
            width: img.width,
            height: img.height
          });
        }
      };
      img.src = initialImage;
    }
  }, [initialImage]);

  // Handle resizing of drawing canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const stencilCanvas = stencilCanvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      
      // If the container is currently hidden (e.g., display: none during printing, or in an inactive tab)
      // do not resize the canvas as rect.width/rect.height will be 0 and erase the sketch or waste CPU cycles.
      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      // Skip resizing if dimensions haven't actually changed to avoid clearing/redrawing unnecessarily
      if (canvas.width === rect.width && canvas.height === rect.height) {
        return;
      }

      // Keep existing drawing content on resize if possible
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      canvas.width = rect.width;
      canvas.height = rect.height;

      if (stencilCanvas) {
        stencilCanvas.width = rect.width;
        stencilCanvas.height = rect.height;
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Restore contents
        ctx.drawImage(tempCanvas, 0, 0);

        // Populate initial canvas state in history if empty
        setHistory(prev => {
          if (prev.length === 0) {
            setHistoryIndex(0);
            return [canvas.toDataURL()];
          }
          return prev;
        });
      }
    };

    // Initial resize
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redraw Overlay Canvas (Stencil, Grid, Symmetry, Rulers)
  useEffect(() => {
    const canvas = stencilCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Millimeter Grid if enabled
    if (isGridEnabled) {
      ctx.save();
      const pxPerCell = gridCellSize; // 30px = 2mm
      const w = canvas.width;
      const h = canvas.height;

      // Vertical lines
      for (let x = 0; x < w; x += pxPerCell) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        if (Math.round(x / pxPerCell) % 5 === 0) {
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.28)'; // Darker gold for 10mm major lines
          ctx.lineWidth = 1.0;
        } else {
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.12)'; // Soft gold for 2mm minor lines
          ctx.lineWidth = 0.5;
        }
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y < h; y += pxPerCell) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        if (Math.round(y / pxPerCell) % 5 === 0) {
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.28)';
          ctx.lineWidth = 1.0;
        } else {
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.12)';
          ctx.lineWidth = 0.5;
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Draw Stencil Overlay
    if (stencilType !== 'none') {
      drawStencilMaster(
        ctx,
        canvas.width,
        canvas.height,
        stencilType,
        stencilSize,
        stencilOpacity,
        stencilRotate,
        stencilOffsetX,
        stencilOffsetY
      );
    }

    // 3. Draw Symmetry Guideline Axis
    if (symmetryMode !== 'none') {
      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'; // Red dashed guidelines
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      if (symmetryMode === 'vertical' || symmetryMode === 'quad') {
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, canvas.height);
        ctx.stroke();
      }
      if (symmetryMode === 'horizontal' || symmetryMode === 'quad') {
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(canvas.width, cy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Draw Ruler Measurements (placed + live active ruler)
    const allRulers = [...rulerMeasurements];
    if (isMeasuring && rulerStart && rulerEnd) {
      allRulers.push({ start: rulerStart, end: rulerEnd });
    }

    allRulers.forEach((r) => {
      ctx.save();
      const dx = r.end.x - r.start.x;
      const dy = r.end.y - r.start.y;
      const distPx = Math.sqrt(dx * dx + dy * dy);
      const distMm = distPx / 15; // 15px = 1mm

      // Draw golden ruler line
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r.start.x, r.start.y);
      ctx.lineTo(r.end.x, r.end.y);
      ctx.stroke();

      // Draw end ticks / calipers
      const angle = Math.atan2(dy, dx);
      const tickLen = 6;
      ctx.beginPath();
      ctx.moveTo(r.start.x - Math.sin(angle) * tickLen, r.start.y + Math.cos(angle) * tickLen);
      ctx.lineTo(r.start.x + Math.sin(angle) * tickLen, r.start.y - Math.cos(angle) * tickLen);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(r.end.x - Math.sin(angle) * tickLen, r.end.y + Math.cos(angle) * tickLen);
      ctx.lineTo(r.end.x + Math.sin(angle) * tickLen, r.end.y - Math.cos(angle) * tickLen);
      ctx.stroke();

      // Text background pill
      const mx = (r.start.x + r.end.x) / 2;
      const my = (r.start.y + r.end.y) / 2;
      const label = `${distMm.toFixed(1)} mm`;

      ctx.font = 'bold 9px monospace';
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'; // Slate-900 transparent pill
      ctx.beginPath();
      ctx.roundRect(mx - textWidth / 2 - 4, my - 7, textWidth + 8, 14, 4);
      ctx.fill();

      // Draw label text
      ctx.fillStyle = '#c2a265'; // Brand gold text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, mx, my);

      ctx.restore();
    });

  }, [
    stencilType, stencilSize, stencilOpacity, stencilRotate, stencilOffsetX, stencilOffsetY,
    isGridEnabled, gridCellSize, symmetryMode, rulerMeasurements, isMeasuring, rulerStart, rulerEnd
  ]);

  // Update canvas context styles based on active tool
  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = thickness * 6;
      ctx.globalAlpha = 1.0;
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness * 4;
      ctx.globalAlpha = 0.25;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.globalAlpha = 1.0;
    }

    return ctx;
  };

  // Shape drawing subroutines
  const drawDiamondShape = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, shape: string, angle: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();

    const drawPoly = (points: [number, number][]) => {
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.closePath();
    };

    if (shape === 'Round') {
      ctx.arc(0, 0, r, 0, 2 * Math.PI);
      ctx.moveTo(r * 0.6, 0);
      ctx.arc(0, 0, r * 0.6, 0, 2 * Math.PI);
    } else if (shape === 'Princess') {
      drawPoly([[-r, -r], [r, -r], [r, r], [-r, r]]);
      drawPoly([[-r * 0.6, -r * 0.6], [r * 0.6, -r * 0.6], [r * 0.6, r * 0.6], [-r * 0.6, r * 0.6]]);
      ctx.moveTo(-r, -r); ctx.lineTo(-r * 0.6, -r * 0.6);
      ctx.moveTo(r, -r); ctx.lineTo(r * 0.6, -r * 0.6);
      ctx.moveTo(r, r); ctx.lineTo(r * 0.6, r * 0.6);
      ctx.moveTo(-r, r); ctx.lineTo(-r * 0.6, r * 0.6);
    } else if (shape === 'Oval') {
      ctx.ellipse(0, 0, r * 0.7, r, 0, 0, 2 * Math.PI);
      ctx.moveTo(r * 0.7 * 0.5, 0);
      ctx.ellipse(0, 0, r * 0.7 * 0.5, r * 0.6, 0, 0, 2 * Math.PI);
    } else if (shape === 'Emerald') {
      const w = r * 0.7, h = r, c = r * 0.25;
      drawPoly([[-w + c, -h], [w - c, -h], [w, -h + c], [w, h - c], [w - c, h], [-w + c, h], [-w, h - c], [-w, -h + c]]);
      const iw = w * 0.6, ih = h * 0.6, ic = c * 0.6;
      drawPoly([[-iw + ic, -ih], [iw - ic, -ih], [iw, -ih + ic], [iw, ih - ic], [iw - ic, ih], [-iw + ic, ih], [-iw, ih - ic], [-iw, -ih + ic]]);
    } else if (shape === 'Pear') {
      const dP = (s: number) => {
        ctx.moveTo(0, -r * s);
        ctx.bezierCurveTo(r * 0.8 * s, -r * 0.2 * s, r * 0.8 * s, r * 0.8 * s, 0, r * s);
        ctx.bezierCurveTo(-r * 0.8 * s, r * 0.8 * s, -r * 0.8 * s, -r * 0.2 * s, 0, -r * s);
      };
      dP(1); dP(0.5);
    } else if (shape === 'Marquise') {
      const dM = (s: number) => {
        ctx.moveTo(0, -r * s);
        ctx.bezierCurveTo(r * 0.9 * s, -r * 0.2 * s, r * 0.9 * s, r * 0.2 * s, 0, r * s);
        ctx.bezierCurveTo(-r * 0.9 * s, r * 0.2 * s, -r * 0.9 * s, -r * 0.2 * s, 0, -r * s);
      };
      dM(1); dM(0.5);
    } else if (shape === 'Cushion') {
      const dC = (s: number) => {
        const w = r * 0.85 * s, h = r * s, c = r * 0.3 * s;
        ctx.moveTo(-w + c, -h);
        ctx.quadraticCurveTo(w, -h, w, -h + c);
        ctx.quadraticCurveTo(w, h, w - c, h);
        ctx.quadraticCurveTo(-w, h, -w, h - c);
        ctx.quadraticCurveTo(-w, -h, -w + c, -h);
      };
      dC(1); dC(0.6);
    } else if (shape === 'Radiant') {
      // Radiant shape is cut-corner rectangle
      const w = r * 0.75, h = r, c = r * 0.2;
      drawPoly([[-w + c, -h], [w - c, -h], [w, -h + c], [w, h - c], [w - c, h], [-w + c, h], [-w, h - c], [-w, -h + c]]);
      // Internal facet cuts
      ctx.moveTo(-w+c, -h); ctx.lineTo(w-c, h);
      ctx.moveTo(w-c, -h); ctx.lineTo(-w+c, h);
    } else if (shape === 'Round Side') {
      // Table
      ctx.moveTo(-r * 0.55, -r * 0.6);
      ctx.lineTo(r * 0.55, -r * 0.6);
      // Girdle top line
      ctx.moveTo(-r, -r * 0.1);
      ctx.lineTo(r, -r * 0.1);
      // Girdle bottom line
      ctx.moveTo(-r, r * 0.05);
      ctx.lineTo(r, r * 0.05);
      // Girdle sides
      ctx.moveTo(-r, -r * 0.1); ctx.lineTo(-r, r * 0.05);
      ctx.moveTo(r, -r * 0.1); ctx.lineTo(r, r * 0.05);
      // Slanted crown facets
      ctx.moveTo(-r * 0.55, -r * 0.6); ctx.lineTo(-r, -r * 0.1);
      ctx.moveTo(r * 0.55, -r * 0.6); ctx.lineTo(r, -r * 0.1);
      // Crown star facets
      ctx.moveTo(-r * 0.2, -r * 0.6); ctx.lineTo(-r * 0.4, -r * 0.1);
      ctx.moveTo(r * 0.2, -r * 0.6); ctx.lineTo(r * 0.4, -r * 0.1);
      // Slanted pavilion facets
      ctx.moveTo(-r, r * 0.05); ctx.lineTo(0, r * 0.9);
      ctx.moveTo(r, r * 0.05); ctx.lineTo(0, r * 0.9);
      // Pavilion main facets
      ctx.moveTo(-r * 0.4, r * 0.05); ctx.lineTo(0, r * 0.9);
      ctx.moveTo(r * 0.4, r * 0.05); ctx.lineTo(0, r * 0.9);
    } else if (shape === 'Princess Side') {
      // Princess side view
      // Table
      ctx.moveTo(-r * 0.7, -r * 0.6);
      ctx.lineTo(r * 0.7, -r * 0.6);
      // Girdle top line
      ctx.moveTo(-r, -r * 0.15);
      ctx.lineTo(r, -r * 0.15);
      // Girdle bottom line
      ctx.moveTo(-r, r * 0.05);
      ctx.lineTo(r, r * 0.05);
      // Girdle sides
      ctx.moveTo(-r, -r * 0.15); ctx.lineTo(-r, r * 0.05);
      ctx.moveTo(r, -r * 0.15); ctx.lineTo(r, r * 0.05);
      // Slanted crown facets
      ctx.moveTo(-r * 0.7, -r * 0.6); ctx.lineTo(-r, -r * 0.15);
      ctx.moveTo(r * 0.7, -r * 0.6); ctx.lineTo(r, -r * 0.15);
      // Crown internal facets
      ctx.moveTo(-r * 0.35, -r * 0.6); ctx.lineTo(-r * 0.5, -r * 0.15);
      ctx.moveTo(r * 0.35, -r * 0.6); ctx.lineTo(r * 0.5, -r * 0.15);
      // Slanted pavilion facets
      ctx.moveTo(-r, r * 0.05); ctx.lineTo(0, r * 0.95);
      ctx.moveTo(r, r * 0.05); ctx.lineTo(0, r * 0.95);
      // Pavilion chevron horizontal lines
      ctx.moveTo(-r * 0.66, r * 0.35); ctx.lineTo(r * 0.66, r * 0.35);
      ctx.moveTo(-r * 0.33, r * 0.65); ctx.lineTo(r * 0.33, r * 0.65);
      // Pavilion chevron facet cuts
      ctx.moveTo(-r * 0.5, r * 0.05); ctx.lineTo(0, r * 0.95);
      ctx.moveTo(r * 0.5, r * 0.05); ctx.lineTo(0, r * 0.95);
    } else if (shape === 'Emerald Side') {
      // Step-cut Emerald side view
      // Table
      ctx.moveTo(-r * 0.6, -r * 0.6);
      ctx.lineTo(r * 0.6, -r * 0.6);
      // Crown step horizontal line
      ctx.moveTo(-r * 0.8, -r * 0.35);
      ctx.lineTo(r * 0.8, -r * 0.35);
      // Girdle top line
      ctx.moveTo(-r, -r * 0.1);
      ctx.lineTo(r, -r * 0.1);
      // Girdle bottom line
      ctx.moveTo(-r, r * 0.05);
      ctx.lineTo(r, r * 0.05);
      // Girdle sides
      ctx.moveTo(-r, -r * 0.1); ctx.lineTo(-r, r * 0.05);
      ctx.moveTo(r, -r * 0.1); ctx.lineTo(r, r * 0.05);
      // Connect crown steps
      ctx.moveTo(-r * 0.6, -r * 0.6); ctx.lineTo(-r * 0.8, -r * 0.35);
      ctx.lineTo(-r, -r * 0.1);
      ctx.moveTo(r * 0.6, -r * 0.6); ctx.lineTo(r * 0.8, -r * 0.35);
      ctx.lineTo(r, -r * 0.1);
      // Pavilion step 1 horizontal
      ctx.moveTo(-r * 0.7, r * 0.4); ctx.lineTo(r * 0.7, r * 0.4);
      // Pavilion step 2 horizontal
      ctx.moveTo(-r * 0.35, r * 0.7); ctx.lineTo(r * 0.35, r * 0.7);
      // Keel (flat bottom)
      ctx.moveTo(-r * 0.15, r * 0.9); ctx.lineTo(r * 0.15, r * 0.9);
      // Connect pavilion steps
      ctx.moveTo(-r, r * 0.05); ctx.lineTo(-r * 0.7, r * 0.4);
      ctx.lineTo(-r * 0.35, r * 0.7); ctx.lineTo(-r * 0.15, r * 0.9);
      ctx.moveTo(r, r * 0.05); ctx.lineTo(r * 0.7, r * 0.4);
      ctx.lineTo(r * 0.35, r * 0.7); ctx.lineTo(r * 0.15, r * 0.9);
    } else if (shape === 'Pear Side') {
      // Pear Side (Elongated horizontally for jewelers side view)
      // Table (asymmetric left-shifted)
      ctx.moveTo(-r * 0.45, -r * 0.6);
      ctx.lineTo(r * 0.7, -r * 0.6);
      // Girdle top line (elongated to right)
      ctx.moveTo(-r * 1.25, -r * 0.1);
      ctx.lineTo(r * 2.3, -r * 0.1);
      // Girdle bottom line (elongated to right)
      ctx.moveTo(-r * 1.25, r * 0.05);
      ctx.lineTo(r * 2.3, r * 0.05);
      // Girdle sides
      ctx.moveTo(-r * 1.25, -r * 0.1); ctx.lineTo(-r * 1.25, r * 0.05);
      ctx.moveTo(r * 2.3, -r * 0.1); ctx.lineTo(r * 2.3, r * 0.05);
      // Crown connections
      ctx.moveTo(-r * 0.45, -r * 0.6); ctx.lineTo(-r * 1.25, -r * 0.1);
      ctx.moveTo(r * 0.7, -r * 0.6); ctx.lineTo(r * 2.3, -r * 0.1);
      ctx.moveTo(-r * 0.1, -r * 0.6); ctx.lineTo(-r * 0.65, -r * 0.1);
      ctx.moveTo(r * 0.25, -r * 0.6); ctx.lineTo(r * 1.1, -r * 0.1);
      // Pavilion to culet (asymmetric culet at x = -r * 0.1)
      ctx.moveTo(-r * 1.25, r * 0.05); ctx.lineTo(-r * 0.1, r * 0.9);
      ctx.moveTo(r * 2.3, r * 0.05); ctx.lineTo(-r * 0.1, r * 0.9);
      ctx.moveTo(-r * 0.7, r * 0.05); ctx.lineTo(-r * 0.1, r * 0.9);
      ctx.moveTo(r * 1.15, r * 0.05); ctx.lineTo(-r * 0.1, r * 0.9);
    } else if (shape === 'Marquise Side') {
      // Marquise Side (Elongated horizontally for elegant Marquise navette profile)
      // Table
      ctx.moveTo(-r * 0.75, -r * 0.6);
      ctx.lineTo(r * 0.75, -r * 0.6);
      // Girdle top line (pointed both sides, significantly elongated)
      ctx.moveTo(-r * 2.45, -r * 0.1);
      ctx.lineTo(r * 2.45, -r * 0.1);
      // Girdle bottom line (pointed both sides)
      ctx.moveTo(-r * 2.45, r * 0.05);
      ctx.lineTo(r * 2.45, r * 0.05);
      // Girdle sides (pointed tips)
      ctx.moveTo(-r * 2.45, -r * 0.1); ctx.lineTo(-r * 2.45, r * 0.05);
      ctx.moveTo(r * 2.45, -r * 0.1); ctx.lineTo(r * 2.45, r * 0.05);
      // Crown connections
      ctx.moveTo(-r * 0.75, -r * 0.6); ctx.lineTo(-r * 2.45, -r * 0.1);
      ctx.moveTo(r * 0.75, -r * 0.6); ctx.lineTo(r * 2.45, -r * 0.1);
      ctx.moveTo(-r * 0.35, -r * 0.6); ctx.lineTo(-r * 1.25, -r * 0.1);
      ctx.moveTo(r * 0.35, -r * 0.6); ctx.lineTo(r * 1.25, -r * 0.1);
      // Pavilion to centered culet
      ctx.moveTo(-r * 2.45, r * 0.05); ctx.lineTo(0, r * 0.9);
      ctx.moveTo(r * 2.45, r * 0.05); ctx.lineTo(0, r * 0.9);
      ctx.moveTo(-r * 1.25, r * 0.05); ctx.lineTo(0, r * 0.9);
      ctx.moveTo(r * 1.25, r * 0.05); ctx.lineTo(0, r * 0.9);
    } else if (shape === 'Ring Rail') {
      // Circular ring rail guide single circle
      ctx.arc(0, 0, r, 0, 2 * Math.PI);
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, thickness / 2);
    ctx.stroke();
    ctx.restore();
  };

  // Capture the current canvas state as a clean backdrop image
  const captureCanvasState = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        setSavedCanvasData(ctx.getImageData(0, 0, canvas.width, canvas.height));
      }
    }
  };

  // Ensure we always have savedCanvasData when the canvas is ready or when tool is selected
  useEffect(() => {
    if (tool === 'stamp' && !savedCanvasData) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        setSavedCanvasData(ctx.getImageData(0, 0, canvas.width, canvas.height));
      }
    }
  }, [tool, savedCanvasData]);

  // Symmetrical segment drawing helper
  const drawSegment = (x1: number, y1: number, x2: number, y2: number, ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // 1. Main stroke segment
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // 2. Symmetric mirror strokes
    if (symmetryMode === 'vertical') {
      ctx.beginPath();
      ctx.moveTo(width - x1, y1);
      ctx.lineTo(width - x2, y2);
      ctx.stroke();
    } else if (symmetryMode === 'horizontal') {
      ctx.beginPath();
      ctx.moveTo(x1, height - y1);
      ctx.lineTo(x2, height - y2);
      ctx.stroke();
    } else if (symmetryMode === 'quad') {
      // vertical mirror
      ctx.beginPath();
      ctx.moveTo(width - x1, y1);
      ctx.lineTo(width - x2, y2);
      ctx.stroke();

      // horizontal mirror
      ctx.beginPath();
      ctx.moveTo(x1, height - y1);
      ctx.lineTo(x2, height - y2);
      ctx.stroke();

      // diagonal (both) mirror
      ctx.beginPath();
      ctx.moveTo(width - x1, height - y1);
      ctx.lineTo(width - x2, height - y2);
      ctx.stroke();
    }
  };

  // Flatten / Bake the active interactive stamp permanently onto the drawing canvas
  const flattenActiveStamp = (stampToFlatten = activeStamp) => {
    if (!stampToFlatten) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      if (savedCanvasData) {
        ctx.putImageData(savedCanvasData, 0, 0);
      }

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stampToFlatten.color;
      ctx.lineWidth = stampToFlatten.thickness;
      ctx.globalAlpha = 1.0;

      const drawStampWithSymmetry = (cx: number, cy: number) => {
        drawDiamondShape(ctx, cx, cy, stampToFlatten.size, stampToFlatten.shape, stampToFlatten.angle);
        
        if (symmetryMode === 'vertical') {
          drawDiamondShape(ctx, canvas.width - cx, cy, stampToFlatten.size, stampToFlatten.shape, stampToFlatten.angle);
        } else if (symmetryMode === 'horizontal') {
          drawDiamondShape(ctx, cx, canvas.height - cy, stampToFlatten.size, stampToFlatten.shape, stampToFlatten.angle);
        } else if (symmetryMode === 'quad') {
          drawDiamondShape(ctx, canvas.width - cx, cy, stampToFlatten.size, stampToFlatten.shape, stampToFlatten.angle);
          drawDiamondShape(ctx, cx, canvas.height - cy, stampToFlatten.size, stampToFlatten.shape, stampToFlatten.angle);
          drawDiamondShape(ctx, canvas.width - cx, canvas.height - cy, stampToFlatten.size, stampToFlatten.shape, stampToFlatten.angle);
        }
      };

      drawStampWithSymmetry(stampToFlatten.x, stampToFlatten.y);
      ctx.restore();

      const cleanState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setSavedCanvasData(cleanState);
      pushToHistory(canvas.toDataURL());
    }
    setActiveStamp(null);
  };

  // Push Canvas to Undo/Redo history stack
  const pushToHistory = (customDataUrl?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = customDataUrl || canvas.toDataURL();
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, url];
    });
    setHistoryIndex(prev => prev + 1);
  };

  const handleUndo = () => {
    if (activeStamp) {
      setActiveStamp(null);
      return;
    }
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      const dataUrl = history[prevIndex];
      loadCanvasFromDataUrl(dataUrl);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSavedCanvasData(ctx.getImageData(0, 0, canvas.width, canvas.height));
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const dataUrl = history[nextIndex];
      loadCanvasFromDataUrl(dataUrl);
    }
  };

  const loadCanvasFromDataUrl = (dataUrl: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setSavedCanvasData(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.src = dataUrl;
  };

  // Helper to map screen coordinates to the actual internal coordinate system of the drawing canvas
  const getCanvasCoords = (clientX: number, clientY: number, forceFreshRect = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    if (forceFreshRect || !canvasRectRef.current) {
      canvasRectRef.current = canvas.getBoundingClientRect();
    }
    const rect = canvasRectRef.current;
    const x = rect.width > 0 ? (clientX - rect.left) * (canvas.width / rect.width) : clientX - rect.left;
    const y = rect.height > 0 ? (clientY - rect.top) * (canvas.height / rect.height) : clientY - rect.top;
    return { x, y };
  };

  // Drawing event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'transform') return;

    // Track active pointer for multi-touch pinch-to-zoom
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle multi-touch gesture start
    if (activePointersRef.current.size >= 2) {
      // Abort any active drawing/stamping/measuring state cleanly
      if (tool === 'stamp' && isStamping && savedCanvasData) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.putImageData(savedCanvasData, 0, 0);
      }
      if (tool === 'line' && isDrawingLine && savedCanvasData) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.putImageData(savedCanvasData, 0, 0);
      }
      setIsDrawing(false);
      setIsStamping(false);
      setIsMeasuring(false);
      setIsDrawingLine(false);

      const pointers = Array.from(activePointersRef.current.values()) as { x: number; y: number }[];
      const p1 = pointers[0];
      const p2 = pointers[1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      initialPinchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
      initialZoomRef.current = zoom;

      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const midX = (p1.x + p2.x) / 2 - rect.left;
        const midY = (p1.y + p2.y) / 2 - rect.top;
        initialPinchMidpointRef.current = { x: midX, y: midY };
      }
      initialPanRef.current = { x: panX, y: panY };
      wasGesturingRef.current = true;
      return;
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY, true);

    const ctx = getCanvasContext();
    if (!ctx) return;

    if (tool === 'stamp' && stampShape) {
      if (activeStamp) {
        flattenActiveStamp();
      }
      canvas.setPointerCapture(e.pointerId);
      stampStartPosRef.current = { x, y };
      initialStampSizeRef.current = stampSize;
      dragThresholdMetRef.current = false;
      setIsStamping(true);
      setStampAngle(0); // Reset rotation angle at start of stamp interaction
      setPointerPos({ x, y });
    } else if (tool === 'ruler') {
      canvas.setPointerCapture(e.pointerId);
      setRulerStart({ x, y });
      setRulerEnd({ x, y });
      setIsMeasuring(true);
    } else if (tool === 'line') {
      canvas.setPointerCapture(e.pointerId);
      const startPos = { x, y };
      setLineStart(startPos);
      setLineEnd(startPos);
      captureCanvasState();
      setIsDrawingLine(true);
    } else {
      setIsDrawing(true);
      canvas.setPointerCapture(e.pointerId);
      lastPosRef.current = { x, y };
      drawSegment(x, y, x, y, ctx, canvas.width, canvas.height);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Track pointer movement
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle active pinch-to-zoom multi-touch gesture
    if (activePointersRef.current.size >= 2) {
      const pointers = Array.from(activePointersRef.current.values()) as { x: number; y: number }[];
      const p1 = pointers[0];
      const p2 = pointers[1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const currentDist = Math.sqrt(dx * dx + dy * dy);

      if (initialPinchDistanceRef.current && initialPinchMidpointRef.current) {
        const scaleFactor = currentDist / initialPinchDistanceRef.current;
        const newZoom = Math.max(0.5, Math.min(6, initialZoomRef.current * scaleFactor));

        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const currentMidX = (p1.x + p2.x) / 2 - rect.left;
          const currentMidY = (p1.y + p2.y) / 2 - rect.top;

          const deltaX = currentMidX - initialPinchMidpointRef.current.x;
          const deltaY = currentMidY - initialPinchMidpointRef.current.y;

          const midX = initialPinchMidpointRef.current.x;
          const midY = initialPinchMidpointRef.current.y;

          const nextPanX = midX - (midX - initialPanRef.current.x) * (newZoom / initialZoomRef.current) + deltaX;
          const nextPanY = midY - (midY - initialPanRef.current.y) * (newZoom / initialZoomRef.current) + deltaY;

          setZoom(newZoom);
          setPanX(nextPanX);
          setPanY(nextPanY);
        }
      }
      wasGesturingRef.current = true;
      return;
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    if (tool === 'stamp' && stampShape) {
      setPointerPos({ x, y });
      if (isStamping && stampStartPosRef.current) {
        const dx = x - stampStartPosRef.current.x;
        const dy = y - stampStartPosRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= 5) {
          dragThresholdMetRef.current = true;
          setStampSize(Math.max(5, Math.round(dist)));
          
          // Rotate based on drag direction vector relative to the center
          const angle = Math.atan2(dy, dx);
          setStampAngle(angle);
        }
      }
      return;
    }

    if (tool === 'ruler') {
      if (isMeasuring) {
        setRulerEnd({ x, y });
      }
      return;
    }

    if (tool === 'line') {
      if (isDrawingLine) {
        setLineEnd({ x, y });
      }
      return;
    }

    if (!isDrawing) return;

    const ctx = getCanvasContext();
    if (!ctx) return;

    // Use high-precision coalesced pointer events for S Pen smoothness if available
    let coalesced = (e.nativeEvent && typeof e.nativeEvent.getCoalescedEvents === 'function')
      ? e.nativeEvent.getCoalescedEvents()
      : (typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : []);
    
    if (!coalesced || coalesced.length === 0) {
      coalesced = [e];
    }

    for (const ev of coalesced) {
      const coords = getCanvasCoords(ev.clientX, ev.clientY);
      if (lastPosRef.current) {
        drawSegment(lastPosRef.current.x, lastPosRef.current.y, coords.x, coords.y, ctx, canvas.width, canvas.height);
      }
      lastPosRef.current = { x: coords.x, y: coords.y };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }

    activePointersRef.current.delete(e.pointerId);

    const hadGesture = wasGesturingRef.current;
    if (activePointersRef.current.size === 0) {
      wasGesturingRef.current = false;
    }

    if (activePointersRef.current.size < 2) {
      initialPinchDistanceRef.current = null;
      initialPinchMidpointRef.current = null;
    }

    if (hadGesture) {
      // Suppress any normal drawing, stamping, or measuring triggers on pointer up
      setIsDrawing(false);
      setIsStamping(false);
      setIsMeasuring(false);
      setIsDrawingLine(false);
      return;
    }

    if (tool === 'stamp' && stampShape && isStamping) {
      const centerPos = stampStartPosRef.current || getCanvasCoords(e.clientX, e.clientY);
      const finalSize = dragThresholdMetRef.current ? stampSize : initialStampSizeRef.current;
      const finalAngle = dragThresholdMetRef.current ? stampAngle : 0;

      setActiveStamp({
        shape: stampShape,
        x: centerPos.x,
        y: centerPos.y,
        size: finalSize,
        angle: finalAngle,
        color: color,
        thickness: thickness
      });

      setIsStamping(false);
      stampStartPosRef.current = null;

      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      setPointerPos({ x, y });
      return;
    }

    if (tool === 'ruler') {
      if (isMeasuring && rulerStart && rulerEnd) {
        const dx = rulerEnd.x - rulerStart.x;
        const dy = rulerEnd.y - rulerStart.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          setRulerMeasurements(prev => [...prev, { start: rulerStart, end: rulerEnd }]);
        }
      }
      setIsMeasuring(false);
      setRulerStart(null);
      setRulerEnd(null);
      return;
    }

    if (tool === 'line') {
      if (isDrawingLine && lineStart && lineEnd) {
        const ctx = getCanvasContext();
        if (ctx && canvas) {
          if (savedCanvasData) {
            ctx.putImageData(savedCanvasData, 0, 0);
          }

          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = color;
          ctx.lineWidth = thickness;
          ctx.globalAlpha = 1.0;

          drawSegment(lineStart.x, lineStart.y, lineEnd.x, lineEnd.y, ctx, canvas.width, canvas.height);
          ctx.restore();

          const cleanState = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setSavedCanvasData(cleanState);
          pushToHistory(canvas.toDataURL());
        }
      }
      setIsDrawingLine(false);
      setLineStart(null);
      setLineEnd(null);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);
    lastPosRef.current = null;

    const ctx = getCanvasContext();
    if (ctx && canvas) {
      const cleanState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setSavedCanvasData(cleanState);
      pushToHistory(canvas.toDataURL());
    }
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      initialPinchDistanceRef.current = null;
      initialPinchMidpointRef.current = null;
    }
    if (activePointersRef.current.size === 0) {
      wasGesturingRef.current = false;
    }

    if (isStamping) return; // Prevent clearing preview state while scaling in mid-drag
    if (tool === 'stamp' && savedCanvasData) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.putImageData(savedCanvasData, 0, 0);
      }
    }
    setPointerPos(null);
  };

  // Render live stamp preview under the pointer OR active stamp adjustments
  useEffect(() => {
    if (tool === 'stamp' && stampShape && savedCanvasData) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        // Restore the clean canvas state first
        ctx.putImageData(savedCanvasData, 0, 0);

        const drawStampWithSymmetry = (
          cx: number,
          cy: number,
          size: number,
          shape: string,
          angle: number,
          alpha: number
        ) => {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = color;
          ctx.lineWidth = thickness;
          ctx.globalAlpha = alpha;

          drawDiamondShape(ctx, cx, cy, size, shape, angle);
          
          if (symmetryMode === 'vertical') {
            drawDiamondShape(ctx, canvas.width - cx, cy, size, shape, angle);
          } else if (symmetryMode === 'horizontal') {
            drawDiamondShape(ctx, cx, canvas.height - cy, size, shape, angle);
          } else if (symmetryMode === 'quad') {
            drawDiamondShape(ctx, canvas.width - cx, cy, size, shape, angle);
            drawDiamondShape(ctx, cx, canvas.height - cy, size, shape, angle);
            drawDiamondShape(ctx, canvas.width - cx, canvas.height - cy, size, shape, angle);
          }
          ctx.restore();
        };

        if (isStamping && stampStartPosRef.current && pointerPos) {
          // 1. Actively dragging/placing a new stamp
          ctx.save();
          ctx.strokeStyle = '#c2a265'; // brand gold
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(stampStartPosRef.current.x, stampStartPosRef.current.y);
          ctx.lineTo(pointerPos.x, pointerPos.y);
          ctx.stroke();
          ctx.restore();

          drawStampWithSymmetry(stampStartPosRef.current.x, stampStartPosRef.current.y, stampSize, stampShape, stampAngle, 0.5);
        } else if (activeStamp) {
          // 2. Adjusting an existing active stamp
          drawStampWithSymmetry(activeStamp.x, activeStamp.y, activeStamp.size, activeStamp.shape, activeStamp.angle, 0.85);
        } else if (pointerPos) {
          // 3. Hovering with stamp tool
          drawStampWithSymmetry(pointerPos.x, pointerPos.y, stampSize, stampShape, stampAngle, 0.5);
        }
      }
    }
  }, [pointerPos, stampSize, stampAngle, savedCanvasData, tool, stampShape, color, thickness, isStamping, activeStamp, symmetryMode]);

  // Render live straight line preview during line tool drawing
  useEffect(() => {
    if (tool === 'line' && isDrawingLine && lineStart && lineEnd && savedCanvasData) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        // Restore the clean canvas state first to erase previous preview lines
        ctx.putImageData(savedCanvasData, 0, 0);

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.globalAlpha = 0.6; // slightly semi-transparent for the drag preview

        drawSegment(lineStart.x, lineStart.y, lineEnd.x, lineEnd.y, ctx, canvas.width, canvas.height);
        ctx.restore();
      }
    }
  }, [lineStart, lineEnd, isDrawingLine, savedCanvasData, tool, color, thickness, symmetryMode]);

  // Switch drawing tools safely, clearing any outstanding preview
  const selectTool = (t: 'pen' | 'highlighter' | 'eraser' | 'transform' | 'line') => {
    if (activeStamp) {
      flattenActiveStamp();
    }
    if (tool === 'stamp' && savedCanvasData) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.putImageData(savedCanvasData, 0, 0);
      }
    }
    setIsDrawingLine(false);
    setLineStart(null);
    setLineEnd(null);
    setPointerPos(null);
    setStampShape('');
    setTool(t);
  };

  // Set up a new interactive stamp template on the canvas
  const handleStampShapeChange = (shape: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeStamp) {
      flattenActiveStamp();
    }

    if (shape) {
      // First, restore current clean state if a preview was active
      if (tool === 'stamp' && savedCanvasData) {
        ctx.putImageData(savedCanvasData, 0, 0);
      }

      // Capture fresh clean state from current canvas
      const cleanState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setSavedCanvasData(cleanState);
      setStampShape(shape);
      setTool('stamp');
      
      // Set initial size
      setStampSize(shape === 'Ring Rail' ? 120 : 45);
      setPointerPos(null);
    } else {
      if (tool === 'stamp' && savedCanvasData) {
        ctx.putImageData(savedCanvasData, 0, 0);
      }
      setPointerPos(null);
      setStampShape('');
      setTool('pen');
    }
  };

  // Background Image Upload
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result as string;
      const compressed = await compressImage(result, 800);
      setBgSrc(compressed);
      const img = new Image();
      img.onload = () => {
        setBgImage(img);
        const canvas = canvasRef.current;
        if (canvas) {
          const s = Math.min(1, (canvas.width / img.width) * 0.75, (canvas.height / img.height) * 0.75);
          setImgState({
            x: (canvas.width - img.width * s) / 2,
            y: (canvas.height - img.height * s) / 2,
            scale: s,
            rot: 0,
            width: img.width,
            height: img.height
          });
          setTool('transform');
        }
      };
      img.src = compressed;
    };
    reader.readAsDataURL(file);
  };

  // Active stamp transformation logic
  const handleStampTransformStart = (e: React.PointerEvent<HTMLDivElement>, mode: 'drag' | 'scale' | 'rotate') => {
    e.preventDefault();
    e.stopPropagation();
    
    setStampTransformMode(mode);
    setStampDragStart({ x: e.clientX, y: e.clientY });
    if (activeStamp) {
      setInitialStampTransformState({
        x: activeStamp.x,
        y: activeStamp.y,
        size: activeStamp.size,
        angle: activeStamp.angle
      });
    }

    // Find center of bounding box to calculate angles/distances in client space
    const box = e.currentTarget.parentElement;
    if (box) {
      const rect = box.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      setStampTransformStartDist(Math.sqrt(dx * dx + dy * dy) || 1);
      setStampTransformStartAngle(Math.atan2(dy, dx));
    }
    
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleStampTransformMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stampTransformMode || !initialStampTransformState || !activeStamp) return;
    e.preventDefault();

    if (stampTransformMode === 'drag') {
      const dxClient = e.clientX - stampDragStart.x;
      const dyClient = e.clientY - stampDragStart.y;
      
      const dxCanvas = dxClient / zoom;
      const dyCanvas = dyClient / zoom;

      setActiveStamp(prev => {
        if (!prev) return null;
        return {
          ...prev,
          x: initialStampTransformState.x + dxCanvas,
          y: initialStampTransformState.y + dyCanvas
        };
      });
    } else if (stampTransformMode === 'scale') {
      const box = e.currentTarget.parentElement;
      if (box) {
        const rect = box.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const scaleMultiplier = dist / stampTransformStartDist;
        setActiveStamp(prev => {
          if (!prev) return null;
          return {
            ...prev,
            size: Math.max(5, Math.round(initialStampTransformState.size * scaleMultiplier))
          };
        });
      }
    } else if (stampTransformMode === 'rotate') {
      const box = e.currentTarget.parentElement;
      if (box) {
        const rect = box.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const angle = Math.atan2(dy, dx);
        const radDiff = angle - stampTransformStartAngle;
        setActiveStamp(prev => {
          if (!prev) return null;
          return {
            ...prev,
            angle: (initialStampTransformState.angle + radDiff) % (2 * Math.PI)
          };
        });
      }
    }
  };

  const handleStampTransformEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stampTransformMode) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setStampTransformMode(null);
    setInitialStampTransformState(null);
  };

  // Background transformation logic
  const handleTransformStart = (e: React.PointerEvent<HTMLDivElement>, mode: 'drag' | 'scale' | 'rotate') => {
    e.preventDefault();
    e.stopPropagation();
    
    setTransformMode(mode);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialImgState({ ...imgState });

    // Find center of bounding box to calculate angles/distances
    const box = e.currentTarget.parentElement;
    if (box) {
      const rect = box.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      setTransformCenter({ x: cx, y: cy });

      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      setTransformStartDist(Math.sqrt(dx * dx + dy * dy) || 1);
      setTransformStartAngle(Math.atan2(dy, dx));
    }
    
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleTransformMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!transformMode || !initialImgState) return;
    e.preventDefault();

    if (transformMode === 'drag') {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setImgState(prev => ({
        ...prev,
        x: initialImgState.x + dx,
        y: initialImgState.y + dy
      }));
    } else if (transformMode === 'scale') {
      const dx = e.clientX - transformCenter.x;
      const dy = e.clientY - transformCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scaleMultiplier = dist / transformStartDist;
      setImgState(prev => ({
        ...prev,
        scale: Math.max(0.1, Math.min(5, initialImgState.scale * scaleMultiplier))
      }));
    } else if (transformMode === 'rotate') {
      const dx = e.clientX - transformCenter.x;
      const dy = e.clientY - transformCenter.y;
      const angle = Math.atan2(dy, dx);
      const radDiff = angle - transformStartAngle;
      const degDiff = radDiff * (180 / Math.PI);
      setImgState(prev => ({
        ...prev,
        rot: (initialImgState.rot + degDiff) % 360
      }));
    }
  };

  const handleTransformEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!transformMode) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setTransformMode(null);
    setInitialImgState(null);
  };

  // Clear Sketchpad
  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setActiveStamp(null);
    setBgImage(null);
    setBgSrc(null);
    setTool('pen');
  };

  // Save Canvas (Flattens background image + drawings together)
  const save = () => {
    if (activeStamp) {
      flattenActiveStamp();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create virtual canvas of identical size to capture flattening output
    const virtualCanvas = document.createElement('canvas');
    virtualCanvas.width = canvas.width;
    virtualCanvas.height = canvas.height;
    const ctx = virtualCanvas.getContext('2d');
    if (!ctx) return;

    // Fill white background for saved file
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, virtualCanvas.width, virtualCanvas.height);

    // 1. Draw transformed background image
    if (bgImage) {
      ctx.save();
      // Translate to image center point
      const cx = imgState.x + (imgState.width * imgState.scale) / 2;
      const cy = imgState.y + (imgState.height * imgState.scale) / 2;
      
      ctx.translate(cx, cy);
      ctx.rotate((imgState.rot * Math.PI) / 180);
      ctx.translate(-cx, -cy);
      
      ctx.drawImage(
        bgImage,
        imgState.x,
        imgState.y,
        imgState.width * imgState.scale,
        imgState.height * imgState.scale
      );
      ctx.restore();
    }

    // 1.25. Draw grid and rulers on virtual canvas if selected for export
    if (includeGridAndRulersInExport) {
      // Draw grid
      if (isGridEnabled) {
        ctx.save();
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.12)';
        ctx.lineWidth = 0.5;

        const pxPerCell = gridCellSize;
        const width = virtualCanvas.width;
        const height = virtualCanvas.height;

        for (let x = 0; x < width; x += pxPerCell) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          if (Math.round(x / pxPerCell) % 5 === 0) {
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.28)';
            ctx.lineWidth = 1.0;
          } else {
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.12)';
            ctx.lineWidth = 0.5;
          }
          ctx.stroke();
        }

        for (let y = 0; y < height; y += pxPerCell) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          if (Math.round(y / pxPerCell) % 5 === 0) {
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.28)';
            ctx.lineWidth = 1.0;
          } else {
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.12)';
            ctx.lineWidth = 0.5;
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw all saved rulers
      rulerMeasurements.forEach((r) => {
        ctx.save();
        const dx = r.end.x - r.start.x;
        const dy = r.end.y - r.start.y;
        const distPx = Math.sqrt(dx * dx + dy * dy);
        const distMm = distPx / 15;

        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(r.start.x, r.start.y);
        ctx.lineTo(r.end.x, r.end.y);
        ctx.stroke();

        const angle = Math.atan2(dy, dx);
        const tickLen = 6;
        ctx.beginPath();
        ctx.moveTo(r.start.x - Math.sin(angle) * tickLen, r.start.y + Math.cos(angle) * tickLen);
        ctx.lineTo(r.start.x + Math.sin(angle) * tickLen, r.start.y - Math.cos(angle) * tickLen);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(r.end.x - Math.sin(angle) * tickLen, r.end.y + Math.cos(angle) * tickLen);
        ctx.lineTo(r.end.x + Math.sin(angle) * tickLen, r.end.y - Math.cos(angle) * tickLen);
        ctx.stroke();

        const mx = (r.start.x + r.end.x) / 2;
        const my = (r.start.y + r.end.y) / 2;
        const label = `${distMm.toFixed(1)} mm`;

        ctx.font = 'bold 9px monospace';
        const textWidth = ctx.measureText(label).width;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(mx - textWidth / 2 - 4, my - 7, textWidth + 8, 14, 4);
        ctx.fill();

        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, mx, my);

        ctx.restore();
      });
    }

    // 1.5. Draw jewelry stencil overlay if selected for export
    if (stencilType !== 'none' && stencilIncludeInExport) {
      drawStencilMaster(
        ctx,
        virtualCanvas.width,
        virtualCanvas.height,
        stencilType,
        stencilSize,
        stencilOpacity * 0.7, // Slightly softer opacity for exports
        stencilRotate,
        stencilOffsetX,
        stencilOffsetY
      );
    }

    // 2. Draw transparency-flattened drawing layer on top
    ctx.drawImage(canvas, 0, 0);

    // Compress the flattened image to a max dimension of 800px to avoid localStorage quota issues
    const MAX_DIM = 800;
    let exportCanvas = virtualCanvas;
    if (virtualCanvas.width > MAX_DIM || virtualCanvas.height > MAX_DIM) {
      const scale = Math.min(MAX_DIM / virtualCanvas.width, MAX_DIM / virtualCanvas.height);
      const compressCanvas = document.createElement('canvas');
      compressCanvas.width = Math.round(virtualCanvas.width * scale);
      compressCanvas.height = Math.round(virtualCanvas.height * scale);
      const compressCtx = compressCanvas.getContext('2d');
      if (compressCtx) {
        compressCtx.drawImage(virtualCanvas, 0, 0, compressCanvas.width, compressCanvas.height);
        exportCanvas = compressCanvas;
      }
    }

    const flattenedDataUrl = exportCanvas.toDataURL('image/jpeg', 0.85);
    onSave(flattenedDataUrl);
  };

  // Mouse wheel zoom handler for desktop/trackpad users
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = 1.05;
    const direction = e.deltaY < 0 ? 1 : -1;
    const factor = direction > 0 ? zoomFactor : 1 / zoomFactor;
    const newZoom = Math.max(0.5, Math.min(6, zoom * factor));

    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const nextPanX = cursorX - (cursorX - panX) * (newZoom / zoom);
      const nextPanY = cursorY - (cursorY - panY) * (newZoom / zoom);

      setZoom(newZoom);
      setPanX(nextPanX);
      setPanY(nextPanY);
    }
  };

  // Calculated styles for bounding transform box
  const w = imgState.width * imgState.scale;
  const h = imgState.height * imgState.scale;
  const cx = imgState.x + w / 2;
  const cy = imgState.y + h / 2;

  return (
    <div className="fixed inset-0 bg-brand-900/40 backdrop-blur-md z-[100] flex flex-col animate-fadeIn select-none">
      {/* Top action bar */}
      <div className="flex justify-between items-center px-4 py-3 bg-brand-900 text-white shadow-lg border-b border-brand-800">
        <div>
          <h3 className="font-serif font-black tracking-wide text-md text-brand-gold italic flex items-center gap-2">
            <Sparkles size={16} />
            {title}
          </h3>
          <p className="text-[10px] text-brand-300 font-mono">Gold & Rose Design Suite</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Undo Button */}
          <button
            type="button"
            disabled={historyIndex <= 0}
            onClick={handleUndo}
            className="text-xs text-brand-200 hover:text-white disabled:opacity-30 bg-brand-800/60 disabled:hover:bg-transparent hover:bg-brand-800 px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1"
            title="Undo stroke"
          >
            <Undo2 size={13} />
            Undo
          </button>

          {/* Redo Button */}
          <button
            type="button"
            disabled={historyIndex >= history.length - 1}
            onClick={handleRedo}
            className="text-xs text-brand-200 hover:text-white disabled:opacity-30 bg-brand-800/60 disabled:hover:bg-transparent hover:bg-brand-800 px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 border-r border-brand-800 pr-3"
            title="Redo stroke"
          >
            <Redo2 size={13} />
            Redo
          </button>

          <button 
            type="button"
            onClick={clear} 
            className="text-xs text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg font-bold transition-all"
          >
            Clear All
          </button>
          <button 
            type="button"
            onClick={onCancel} 
            className="text-xs text-brand-300 hover:bg-brand-800 px-3 py-1.5 rounded-lg font-bold transition-all"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={save} 
            className="text-xs bg-brand-gold text-brand-900 hover:bg-brand-gold/90 px-5 py-2 rounded-lg font-black transition-all shadow-md flex items-center gap-1"
          >
            <Check size={14} />
            Save to Piece
          </button>
        </div>
      </div>

      {/* Main design canvas stage */}
      <div 
        ref={containerRef}
        onWheel={handleWheel}
        className="flex-1 relative overflow-hidden bg-brand-100"
      >
        {/* Transformable stage viewport wrapper */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
          }}
        >
          {/* Hardware-accelerated background image element */}
          {bgSrc && bgImage && (
            <img
              src={bgSrc}
              alt="Design backdrop"
              style={{
                position: 'absolute',
                pointerEvents: 'none',
                left: 0,
                top: 0,
                width: `${imgState.width}px`,
                height: `${imgState.height}px`,
                transform: `translate(${imgState.x}px, ${imgState.y}px) scale(${imgState.scale}) rotate(${imgState.rot}deg)`,
                transformOrigin: 'top left',
                display: 'block',
                maxWidth: 'none',
                maxHeight: 'none',
                boxShadow: '0 10px 25px rgba(0,0,0,0.08)'
              }}
            />
          )}

          {/* Gestural transformation box (only active/visible in transform tool) */}
          {bgSrc && bgImage && tool === 'transform' && (
            <div
              onPointerDown={(e) => handleTransformStart(e, 'drag')}
              onPointerMove={handleTransformMove}
              onPointerUp={handleTransformEnd}
              style={{
                position: 'absolute',
                border: '2px dashed #d4af37',
                width: `${w}px`,
                height: `${h}px`,
                left: 0,
                top: 0,
                transform: `translate(${cx - w/2}px, ${cy - h/2}px) rotate(${imgState.rot}deg)`,
                cursor: 'move',
                zIndex: 30,
                pointerEvents: 'auto'
              }}
            >
              {/* Rotation Handle (top-right) */}
              <div
                onPointerDown={(e) => handleTransformStart(e, 'rotate')}
                onPointerMove={handleTransformMove}
                onPointerUp={handleTransformEnd}
                className="absolute -top-3.5 -right-3.5 w-7 h-7 bg-brand-800 text-brand-gold rounded-full border border-brand-gold flex items-center justify-center cursor-alias shadow-lg"
                title="Rotate Background"
              >
                <RotateCw size={12} />
              </div>

              {/* Scale Handle (bottom-right) */}
              <div
                onPointerDown={(e) => handleTransformStart(e, 'scale')}
                onPointerMove={handleTransformMove}
                onPointerUp={handleTransformEnd}
                className="absolute -bottom-3.5 -right-3.5 w-7 h-7 bg-brand-gold text-brand-900 rounded-full border border-white flex items-center justify-center cursor-se-resize shadow-lg"
                title="Scale Background"
              >
                <Maximize2 size={12} />
              </div>
            </div>
          )}

          {/* Ghosted Stencil & Grid & Ruler Overlay Layer */}
          <canvas
            ref={stencilCanvasRef}
            className="absolute inset-0 w-full h-full z-18 pointer-events-none"
            style={{ mixBlendMode: 'multiply' }}
          />

          {/* Drawing canvas layer */}
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onPointerCancel={handlePointerLeave}
            className="absolute inset-0 w-full h-full z-20 touch-none"
            style={{
              pointerEvents: tool === 'transform' ? 'none' : 'auto',
              background: 'transparent'
            }}
          />

          {/* Interactive Active Stamp Selection & Transformation Box */}
          {activeStamp && tool === 'stamp' && !isStamping && (
            <div
              onPointerDown={(e) => handleStampTransformStart(e, 'drag')}
              onPointerMove={handleStampTransformMove}
              onPointerUp={handleStampTransformEnd}
              style={{
                position: 'absolute',
                border: '2px dashed #c2a265', // Brand gold dashed border for active stamp
                width: `${activeStamp.size * 2}px`,
                height: `${activeStamp.size * 2}px`,
                left: `${activeStamp.x - activeStamp.size}px`,
                top: `${activeStamp.y - activeStamp.size}px`,
                transform: `rotate(${(activeStamp.angle * 180) / Math.PI}deg)`,
                cursor: 'move',
                zIndex: 35,
                pointerEvents: 'auto'
              }}
            >
              {/* Quick Action Confirmation / Delete floating menu inside bounding box */}
              <div 
                className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-brand-900 text-white px-2.5 py-1.5 rounded-lg border border-brand-800 shadow-2xl pointer-events-auto z-40"
                onPointerDown={(e) => e.stopPropagation()} // Stop propagation so clicking menu buttons doesn't trigger drag
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    flattenActiveStamp();
                  }}
                  className="w-6 h-6 bg-emerald-600 hover:bg-emerald-500 rounded flex items-center justify-center transition-colors cursor-pointer"
                  title="Apply / Bake Stamp permanent"
                >
                  <Check size={12} className="text-white font-bold" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveStamp(null);
                  }}
                  className="w-6 h-6 bg-red-600 hover:bg-red-500 rounded flex items-center justify-center transition-colors cursor-pointer"
                  title="Delete Stamp"
                >
                  <X size={12} className="text-white font-bold" />
                </button>
              </div>

              {/* Rotation Handle (top-right) */}
              <div
                onPointerDown={(e) => handleStampTransformStart(e, 'rotate')}
                onPointerMove={handleStampTransformMove}
                onPointerUp={handleStampTransformEnd}
                className="absolute -top-3.5 -right-3.5 w-7 h-7 bg-brand-800 text-brand-gold rounded-full border border-brand-gold flex items-center justify-center cursor-alias shadow-lg select-none pointer-events-auto z-40"
                title="Rotate Stamp"
              >
                <RotateCw size={12} />
              </div>

              {/* Scale Handle (bottom-right) */}
              <div
                onPointerDown={(e) => handleStampTransformStart(e, 'scale')}
                onPointerMove={handleStampTransformMove}
                onPointerUp={handleStampTransformEnd}
                className="absolute -bottom-3.5 -right-3.5 w-7 h-7 bg-brand-gold text-brand-900 rounded-full border border-white flex items-center justify-center cursor-se-resize shadow-lg select-none pointer-events-auto z-40"
                title="Scale Stamp"
              >
                <Maximize2 size={12} />
              </div>
            </div>
          )}
        </div>

        {/* Floating Zoom Control (Top Right of Stage) */}
        <div className="absolute top-4 right-4 bg-brand-900/95 backdrop-blur-md px-3 py-2 rounded-xl text-xs text-brand-200 border border-brand-800 shadow-lg pointer-events-auto z-40 flex items-center gap-2.5">
          <span className="font-mono text-[11px] font-bold text-brand-gold">
            Zoom: {Math.round(zoom * 100)}%
          </span>
          {(zoom !== 1 || panX !== 0 || panY !== 0) && (
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPanX(0);
                setPanY(0);
              }}
              className="text-[9px] font-black uppercase tracking-widest bg-brand-gold text-brand-900 px-2 py-1 rounded-lg hover:bg-brand-gold/90 transition-all shadow-md active:scale-95"
            >
              Reset View
            </button>
          )}
        </div>

        {/* Floating Help Tip */}
        <div className="absolute top-4 left-4 bg-brand-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs text-brand-200 border border-brand-800 shadow-lg pointer-events-none z-40 max-w-xs space-y-1">
          <p className="font-bold text-brand-gold flex items-center gap-1">
            <HelpCircle size={13} />
            Designer Instructions:
          </p>
          <p className="text-[10px] text-brand-300">
            {tool === 'stamp' 
              ? 'Move cursor onto the canvas to preview the shape. Click anywhere to instantly stamp it. Adjust the size slider anytime.' 
              : tool === 'transform' 
              ? 'Drag inside the dashed box to move the backdrop photo. Drag the golden handles to scale or rotate it.' 
              : tool === 'ruler'
              ? 'Click and drag calipers across any parts of the design to measure live dimensions in physical millimeters.'
              : 'Select pen color/thickness and draw directly on top. Switch to eraser to correct strokes.'}
          </p>
          <p className="text-[9px] text-brand-400 font-mono italic">
            💡 Tablet Tip: Pinch with 2 fingers to zoom or pan.
          </p>
        </div>

        {/* Floating CAD HUD Panels Overlay (Floating above the canvas to prevent layout shifts) */}
        <div className="absolute bottom-4 left-4 right-4 z-40 flex flex-col gap-2 pointer-events-auto">
          {/* ACTIVE CALIPER RULER PANEL (Shown only when ruler tool is active) */}
          {tool === 'ruler' && (
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-brand-900/95 backdrop-blur-md border border-brand-800 rounded-xl shadow-2xl animate-fadeIn">
              <div className="flex items-center gap-2 self-start md:self-auto">
                <span className="bg-brand-gold text-brand-900 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                  <Ruler size={10} /> Active Caliper Ruler
                </span>
                <span className="text-[10px] text-brand-200 font-medium hidden sm:inline">
                  Click & drag calipers across the canvas to place real-time dimension measurements (15px = 1mm).
                </span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {rulerMeasurements.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRulerMeasurements([])}
                    className="text-[9px] font-black text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/30 px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all"
                  >
                    Clear Measurements ({rulerMeasurements.length})
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* DESIGN STENCIL SETTINGS PANEL (Shown only when stencil is active) */}
          {stencilType !== 'none' ? (
            <div className="w-full grid grid-cols-1 md:grid-cols-4 items-center gap-4 p-3.5 bg-brand-950/95 backdrop-blur-md border border-brand-800 rounded-xl shadow-2xl animate-fadeIn text-[11px]">
              {/* Header / Stencil Info */}
              <div className="md:col-span-1 flex flex-col gap-1">
                <span className="bg-brand-gold text-brand-900 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider w-max flex items-center gap-1">
                  <Sparkles size={10} /> Stencil Active
                </span>
                <span className="font-bold text-brand-100 uppercase tracking-wide">
                  {stencilType === 'solitaire' ? '4-Prong Solitaire' :
                   stencilType === 'cathedral' ? 'Cathedral Side-View' :
                   stencilType === 'halo' ? 'Halo Setting Guide' :
                   stencilType === 'threestone' ? 'Three-Stone Mount' :
                   'Pave Band Template'}
                </span>
              </div>

              {/* Controls Row 1: Size & Opacity */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Size Slider */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-brand-300 w-12 text-left">Size:</span>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    value={stencilSize}
                    onChange={(e) => setStencilSize(parseInt(e.target.value))}
                    className="flex-1 accent-brand-gold cursor-pointer h-1 bg-brand-900/40 rounded-lg appearance-none"
                  />
                  <span className="font-bold text-brand-200 font-mono w-10 text-right">{stencilSize}px</span>
                </div>

                {/* Opacity Slider */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-brand-300 w-12 text-left">Opacity:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={stencilOpacity}
                    onChange={(e) => setStencilOpacity(parseFloat(e.target.value))}
                    className="flex-1 accent-brand-gold cursor-pointer h-1 bg-brand-900/40 rounded-lg appearance-none"
                  />
                  <span className="font-bold text-brand-200 font-mono w-10 text-right">{(stencilOpacity * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Controls Row 2: Rotation & Reset */}
              <div className="md:col-span-1 flex items-center justify-between gap-3">
                {/* Rotate Slider */}
                <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                  <span className="font-bold text-brand-300 w-10 text-left">Rotate:</span>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={stencilRotate}
                    onChange={(e) => setStencilRotate(parseInt(e.target.value))}
                    className="flex-1 accent-brand-gold cursor-pointer h-1 bg-brand-900/40 rounded-lg appearance-none"
                  />
                  <span className="font-bold text-brand-200 font-mono w-10 text-right">{stencilRotate}°</span>
                </div>

                {/* Reset button */}
                <button
                  type="button"
                  onClick={() => {
                    setStencilOffsetX(0);
                    setStencilOffsetY(0);
                    setStencilRotate(0);
                    setStencilSize(200);
                    setStencilOpacity(0.4);
                  }}
                  className="text-[9px] font-black text-brand-300 hover:text-white border border-brand-800 bg-brand-900 px-2.5 py-1 rounded transition-all shrink-0 uppercase"
                  title="Reset stencil properties"
                >
                  Reset
                </button>
              </div>

              {/* Position offset controls & Export Toggle */}
              <div className="md:col-span-4 border-t border-brand-800/50 pt-2.5 flex flex-wrap justify-between items-center gap-3">
                {/* Position sliders */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-brand-400 uppercase tracking-widest text-[9px]">Offset X:</span>
                    <input
                      type="range"
                      min="-300"
                      max="300"
                      value={stencilOffsetX}
                      onChange={(e) => setStencilOffsetX(parseInt(e.target.value))}
                      className="w-20 accent-brand-gold cursor-pointer h-1 bg-brand-900/40 rounded-lg appearance-none"
                    />
                    <span className="font-mono font-bold text-brand-200 w-8 text-right">{stencilOffsetX > 0 ? `+${stencilOffsetX}` : stencilOffsetX}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-brand-400 uppercase tracking-widest text-[9px]">Offset Y:</span>
                    <input
                      type="range"
                      min="-300"
                      max="300"
                      value={stencilOffsetY}
                      onChange={(e) => setStencilOffsetY(parseInt(e.target.value))}
                      className="w-20 accent-brand-gold cursor-pointer h-1 bg-brand-900/40 rounded-lg appearance-none"
                    />
                    <span className="font-mono font-bold text-brand-200 w-8 text-right">{stencilOffsetY > 0 ? `+${stencilOffsetY}` : stencilOffsetY}px</span>
                  </div>
                </div>

                {/* Include in Save Toggle */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-brand-300">Export:</span>
                  <button
                    type="button"
                    onClick={() => setStencilIncludeInExport(!stencilIncludeInExport)}
                    className={`px-2.5 py-1 rounded text-[9px] font-black uppercase transition-all ${
                      stencilIncludeInExport ? 'bg-brand-gold text-brand-900 shadow-md' : 'bg-brand-800 text-brand-300 border border-brand-700'
                    }`}
                  >
                    {stencilIncludeInExport ? 'Bake Enabled' : 'Guide Only'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Floating control dock - highly optimized for tablet and mobile views */}
      <div className="bg-white/95 backdrop-blur-xl border-t border-brand-200 p-3 md:p-4 pb-5 flex flex-col gap-3 shadow-2xl z-30">

        {/* VISUAL STAMP GALLERY RIBBON (Quick Stamp Selection) */}
        <div className="w-full bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 animate-fadeIn shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2 px-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Sparkles size={12} className="text-brand-gold animate-spin-slow" />
                Quick Stamp Selector
              </span>
              <span className="text-[9px] text-slate-400/90 font-medium hidden xs:inline">
                (Swipe / Scroll horizontally to view more shapes)
              </span>
            </div>
            {tool === 'stamp' && stampShape && (
              <button
                type="button"
                onClick={() => {
                  handleStampShapeChange('');
                  selectTool('pen');
                }}
                className="text-[9px] font-black text-slate-700 hover:text-slate-950 hover:bg-slate-200/80 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg transition-all shadow-sm self-end sm:self-auto"
              >
                Clear Selection
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 custom-stamp-scroll select-none w-full scroll-smooth">
            {/* Ring Rail Stamp */}
            <button
              type="button"
              onClick={() => handleStampShapeChange('Ring Rail')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all shrink-0 min-h-[38px] group ${
                tool === 'stamp' && stampShape === 'Ring Rail'
                  ? 'bg-brand-900 text-brand-gold border-brand-950 shadow-md scale-105 z-10 animate-pulse'
                  : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-100/60 hover:border-slate-300'
              }`}
              title="Click to select Ring Rail Stamp"
            >
              <StampIcon 
                shape="Ring Rail" 
                className={`w-5 h-5 shrink-0 transition-colors ${
                  tool === 'stamp' && stampShape === 'Ring Rail' ? 'text-brand-gold' : 'text-slate-400 group-hover:text-slate-600'
                }`} 
              />
              <span>Ring Rail</span>
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-slate-200/80 shrink-0 mx-1.5" />

            {/* Top View Stones */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[9px] font-black text-slate-400/90 uppercase tracking-wider mr-1">Top Cuts:</span>
              {CENTER_SHAPES.map((shape) => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => handleStampShapeChange(shape)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all shrink-0 min-h-[38px] group ${
                    tool === 'stamp' && stampShape === shape
                      ? 'bg-brand-900 text-brand-gold border-brand-950 shadow-md scale-105 z-10'
                      : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-100/60 hover:border-slate-300'
                  }`}
                  title={`Click to select ${shape} Stamp`}
                >
                  <StampIcon 
                    shape={shape} 
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      tool === 'stamp' && stampShape === shape ? 'text-brand-gold' : 'text-slate-400 group-hover:text-slate-600'
                    }`} 
                  />
                  <span>{shape}</span>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-slate-200/80 shrink-0 mx-1.5" />

            {/* Side View Stones */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[9px] font-black text-slate-400/90 uppercase tracking-wider mr-1">Side Cuts:</span>
              {[
                { val: 'Round Side', label: 'Round' },
                { val: 'Princess Side', label: 'Princess' },
                { val: 'Emerald Side', label: 'Emerald' },
                { val: 'Pear Side', label: 'Pear' },
                { val: 'Marquise Side', label: 'Marquise' },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => handleStampShapeChange(item.val)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all shrink-0 min-h-[38px] group ${
                    tool === 'stamp' && stampShape === item.val
                      ? 'bg-brand-900 text-brand-gold border-brand-950 shadow-md scale-105 z-10'
                      : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-100/60 hover:border-slate-300'
                  }`}
                  title={`Click to select ${item.label} Side Stamp`}
                >
                  <StampIcon 
                    shape={item.val} 
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      tool === 'stamp' && stampShape === item.val ? 'text-brand-gold' : 'text-slate-400 group-hover:text-slate-600'
                    }`} 
                  />
                  <span>{item.label} Side</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* MAIN SKETCH TOOLS BAR */}
        <div className="w-full flex flex-wrap lg:flex-nowrap items-center justify-between gap-3.5 md:gap-4">
          
          {/* Group 1: Drawing & Brush Configuration (Tool Selectors, Color Palette, and Stroke Slider) */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start shrink-0">
            {/* Tool selector buttons */}
            <div className="flex gap-1 bg-brand-50 p-1 rounded-xl border border-brand-200 shadow-inner shrink-0">
              <button
                type="button"
                onClick={() => selectTool('pen')}
                className={`p-2.5 md:p-3 rounded-lg transition-all min-w-[42px] min-h-[42px] flex items-center justify-center ${tool === 'pen' ? 'bg-brand-900 text-white shadow-md' : 'text-brand-600 hover:bg-brand-100'}`}
                title="Pencil Tool"
              >
                <Pen size={15} />
              </button>
              <button
                type="button"
                onClick={() => selectTool('highlighter')}
                className={`p-2.5 md:p-3 rounded-lg transition-all min-w-[42px] min-h-[42px] flex items-center justify-center ${tool === 'highlighter' ? 'bg-brand-900 text-white shadow-md' : 'text-brand-600 hover:bg-brand-100'}`}
                title="Highlighter"
              >
                <Highlighter size={15} />
              </button>
              <button
                type="button"
                onClick={() => selectTool('line')}
                className={`p-2.5 md:p-3 rounded-lg transition-all min-w-[42px] min-h-[42px] flex items-center justify-center ${tool === 'line' ? 'bg-brand-900 text-white shadow-md' : 'text-brand-600 hover:bg-brand-100'}`}
                title="Straight Line Tool"
              >
                <Minus size={15} className="rotate-45" />
              </button>
              <button
                type="button"
                onClick={() => selectTool('eraser')}
                className={`p-2.5 md:p-3 rounded-lg transition-all min-w-[42px] min-h-[42px] flex items-center justify-center ${tool === 'eraser' ? 'bg-brand-900 text-white shadow-md' : 'text-brand-600 hover:bg-brand-100'}`}
                title="Eraser"
              >
                <Eraser size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setTool('ruler');
                  setStampShape('');
                }}
                className={`p-2.5 md:p-3 rounded-lg transition-all min-w-[42px] min-h-[42px] flex items-center justify-center ${tool === 'ruler' ? 'bg-brand-900 text-white shadow-md' : 'text-brand-600 hover:bg-brand-100'}`}
                title="Caliper Ruler Measurement Tool"
              >
                <Ruler size={15} />
              </button>
              <button
                type="button"
                onClick={() => selectTool('transform')}
                disabled={!bgSrc}
                className={`p-2.5 md:p-3 rounded-lg transition-all min-w-[42px] min-h-[42px] flex items-center justify-center ${tool === 'transform' ? 'bg-brand-900 text-white shadow-md' : 'text-brand-400 disabled:opacity-30 hover:bg-brand-100'}`}
                title="Position Reference Photo"
              >
                <Move size={15} />
              </button>
            </div>

            {/* Color palette */}
            <div className="flex items-center gap-1 px-2 py-1.5 bg-brand-50/50 rounded-xl border border-brand-100/80 overflow-x-auto max-w-[260px] sm:max-w-[320px] scrollbar-none shrink-0" title="Precious Metals & Fine Gemstones Palette">
              {jewelryColors.map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    setColor(c.val);
                    if (tool === 'eraser' || tool === 'transform' || tool === 'ruler') {
                      setTool('pen');
                    }
                  }}
                  title={c.name}
                  className={`w-6 h-6 rounded-full ${c.bgClass} border-2 transition-all shadow-sm shrink-0 relative ${color === c.val ? 'border-brand-gold scale-125 shadow-md z-10' : 'border-transparent scale-100 hover:scale-110'}`}
                />
              ))}
            </div>

            {/* continuous brush stroke thickness slider */}
            <div className="flex items-center gap-2 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-200/60 shrink-0 min-w-[150px] sm:min-w-[185px]">
              <span className="text-[9px] font-black text-brand-500 uppercase tracking-wider shrink-0">Stroke:</span>
              <input
                type="range"
                min="1"
                max="30"
                step="0.5"
                value={thickness}
                onChange={(e) => setThickness(parseFloat(e.target.value))}
                className="w-16 sm:w-20 md:w-24 accent-brand-900 cursor-pointer h-1 bg-brand-200 rounded-lg appearance-none shrink-0"
              />
              <span className="text-[9px] font-bold font-mono text-brand-800 w-11 text-center bg-white px-1 py-0.5 rounded border border-brand-200 shrink-0">
                {thickness.toFixed(1)}px
              </span>
            </div>
          </div>

          {/* Group 2: Backdrop & Overlay Templates (Photo Upload & Stencil Overlays) */}
          <div className="flex items-center gap-2 w-full sm:w-auto lg:w-auto justify-between sm:justify-end shrink-0">
            {/* Reference Image upload */}
            <div className="shrink-0">
              <label className="cursor-pointer text-[10px] font-black text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200/80 px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm uppercase tracking-wider min-h-[42px]">
                <Camera size={14} className="text-brand-gold shrink-0" />
                Upload Photo
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleBgUpload} 
                />
              </label>
            </div>

            {/* Stencil Selector */}
            <div className="shrink-0 min-w-[140px] sm:max-w-[200px]">
              <select
                id="sketch-stencil-select"
                value={stencilType}
                onChange={(e) => setStencilType(e.target.value)}
                className="cursor-pointer text-[10px] font-black text-brand-800 bg-brand-50 border border-brand-200 px-3 py-3 rounded-xl hover:bg-brand-100 transition-all shadow-sm outline-none w-full uppercase tracking-wider min-h-[42px]"
              >
                <option value="none">📐 No Overlay Stencil</option>
                <option value="solitaire">📐 4-Prong Solitaire</option>
                <option value="cathedral">📐 Cathedral Mount (Side)</option>
                <option value="halo">📐 Halo Setting Guide</option>
                <option value="threestone">📐 Three-Stone Mount</option>
                <option value="pave">📐 Pavé Band Template</option>
              </select>
            </div>
          </div>

        </div>

        {/* CONSULTATION ENHANCEMENTS DRAWER */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-brand-100 pt-3 mt-1 text-[11px]">
          {/* Column 1: Symmetry controls */}
          <div className="flex flex-col gap-1.5 bg-brand-50/50 p-2.5 rounded-xl border border-brand-100/60">
            <span className="font-bold text-brand-800 uppercase tracking-wider text-[9px] flex items-center gap-1">
              <RefreshCw size={10} className="text-brand-gold" /> Symmetry Mirror Mode
            </span>
            <div className="grid grid-cols-4 gap-1">
              {(['none', 'vertical', 'horizontal', 'quad'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSymmetryMode(mode)}
                  className={`px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all border text-center ${
                    symmetryMode === mode 
                      ? 'bg-brand-900 text-brand-gold border-brand-900 shadow-sm' 
                      : 'bg-white text-brand-600 border-brand-200 hover:bg-brand-100'
                  }`}
                >
                  {mode === 'none' ? 'Off' : mode === 'vertical' ? 'Vert' : mode === 'horizontal' ? 'Horiz' : 'Quad'}
                </button>
              ))}
            </div>
          </div>

          {/* Column 2: Calibrated mm Grid */}
          <div className="flex flex-col gap-1.5 bg-brand-50/50 p-2.5 rounded-xl border border-brand-100/60">
            <div className="flex justify-between items-center">
              <span className="font-bold text-brand-800 uppercase tracking-wider text-[9px] flex items-center gap-1">
                <Grid3X3 size={10} className="text-brand-gold" /> Millimeter Grid
              </span>
              <button
                type="button"
                onClick={() => setIsGridEnabled(!isGridEnabled)}
                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all ${
                  isGridEnabled ? 'bg-emerald-600 text-white shadow' : 'bg-brand-200 text-brand-600'
                }`}
              >
                {isGridEnabled ? 'Grid On' : 'Grid Off'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-brand-500 uppercase tracking-widest w-12 shrink-0">Spacing:</span>
              <input
                type="range"
                min="15"
                max="75"
                step="15"
                disabled={!isGridEnabled}
                value={gridCellSize}
                onChange={(e) => setGridCellSize(parseInt(e.target.value))}
                className="flex-1 accent-brand-900 cursor-pointer h-1 bg-brand-200 rounded-lg appearance-none disabled:opacity-40"
              />
              <span className="font-mono font-bold text-brand-700 w-11 text-right shrink-0">
                {(gridCellSize / 15).toFixed(0)} mm
              </span>
            </div>
          </div>

          {/* Column 3: Bake Options */}
          <div className="flex flex-col gap-1.5 bg-brand-50/50 p-2.5 rounded-xl border border-brand-100/60">
            <span className="font-bold text-brand-800 uppercase tracking-wider text-[9px] flex items-center gap-1">
              <Check size={10} className="text-brand-gold" /> Export Calibration Options
            </span>
            <div className="flex items-center justify-between gap-2 h-full">
              <span className="text-[10px] text-brand-600 font-medium">Include calipers and millimeter grids in saved design?</span>
              <button
                type="button"
                onClick={() => setIncludeGridAndRulersInExport(!includeGridAndRulersInExport)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border shrink-0 ${
                  includeGridAndRulersInExport 
                    ? 'bg-brand-900 text-brand-gold border-brand-900 shadow-sm' 
                    : 'bg-white text-brand-600 border-brand-200 hover:bg-brand-100'
                }`}
              >
                {includeGridAndRulersInExport ? 'Bake Calipers' : 'Consult Only'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
