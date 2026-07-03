/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { 
  Pen, Highlighter, Eraser, Move, 
  RotateCw, RefreshCw, X, Check, Camera, Sparkles, HelpCircle 
} from 'lucide-react';
import { CENTER_SHAPES } from '../constants';

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

  // Drawing tool state
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser' | 'transform' | 'stamp'>('pen');
  const [color, setColor] = useState('#1e293b'); // Slate dark
  const [thickness, setThickness] = useState(3.0);
  const [stampShape, setStampShape] = useState<string>('');

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

  // Instant Stamp parameters
  const [stampSize, setStampSize] = useState<number>(45);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);

  // Tool UI indicators
  const colorOptions = [
    { id: 'slate', val: '#1e293b', bgClass: 'bg-slate-800' },
    { id: 'gold', val: '#d4af37', bgClass: 'bg-amber-500' },
    { id: 'red', val: '#dc2626', bgClass: 'bg-red-600' },
    { id: 'green', val: '#16a34a', bgClass: 'bg-green-600' }
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
      }
    };

    // Initial resize
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redraw Stencil Canvas dynamically whenever stencil properties change
  useEffect(() => {
    const canvas = stencilCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
  }, [stencilType, stencilSize, stencilOpacity, stencilRotate, stencilOffsetX, stencilOffsetY]);

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
      // Pear Side
      // Table (asymmetric left-shifted)
      ctx.moveTo(-r * 0.4, -r * 0.6);
      ctx.lineTo(r * 0.4, -r * 0.6);
      // Girdle top line (elongated to right)
      ctx.moveTo(-r, -r * 0.1);
      ctx.lineTo(r * 1.2, -r * 0.1);
      // Girdle bottom line (elongated to right)
      ctx.moveTo(-r, r * 0.05);
      ctx.lineTo(r * 1.2, r * 0.05);
      // Girdle sides
      ctx.moveTo(-r, -r * 0.1); ctx.lineTo(-r, r * 0.05);
      ctx.moveTo(r * 1.2, -r * 0.1); ctx.lineTo(r * 1.2, r * 0.05);
      // Crown connections
      ctx.moveTo(-r * 0.4, -r * 0.6); ctx.lineTo(-r, -r * 0.1);
      ctx.moveTo(r * 0.4, -r * 0.6); ctx.lineTo(r * 1.2, -r * 0.1);
      ctx.moveTo(-r * 0.1, -r * 0.6); ctx.lineTo(-r * 0.4, -r * 0.1);
      ctx.moveTo(r * 0.1, -r * 0.6); ctx.lineTo(r * 0.5, -r * 0.1);
      // Pavilion to culet (asymmetric culet at x = -r * 0.1)
      ctx.moveTo(-r, r * 0.05); ctx.lineTo(-r * 0.1, r * 0.9);
      ctx.moveTo(r * 1.2, r * 0.05); ctx.lineTo(-r * 0.1, r * 0.9);
      ctx.moveTo(-r * 0.5, r * 0.05); ctx.lineTo(-r * 0.1, r * 0.9);
      ctx.moveTo(r * 0.5, r * 0.05); ctx.lineTo(-r * 0.1, r * 0.9);
    } else if (shape === 'Marquise Side') {
      // Marquise Side
      // Table
      ctx.moveTo(-r * 0.4, -r * 0.6);
      ctx.lineTo(r * 0.4, -r * 0.6);
      // Girdle top line (pointed both sides)
      ctx.moveTo(-r * 1.2, -r * 0.1);
      ctx.lineTo(r * 1.2, -r * 0.1);
      // Girdle bottom line (pointed both sides)
      ctx.moveTo(-r * 1.2, r * 0.05);
      ctx.lineTo(r * 1.2, r * 0.05);
      // Girdle sides (pointed tips)
      ctx.moveTo(-r * 1.2, -r * 0.1); ctx.lineTo(-r * 1.2, r * 0.05);
      ctx.moveTo(r * 1.2, -r * 0.1); ctx.lineTo(r * 1.2, r * 0.05);
      // Crown connections
      ctx.moveTo(-r * 0.4, -r * 0.6); ctx.lineTo(-r * 1.2, -r * 0.1);
      ctx.moveTo(r * 0.4, -r * 0.6); ctx.lineTo(r * 1.2, -r * 0.1);
      // Pavilion to centered culet
      ctx.moveTo(-r * 1.2, r * 0.05); ctx.lineTo(0, r * 0.9);
      ctx.moveTo(r * 1.2, r * 0.05); ctx.lineTo(0, r * 0.9);
      ctx.moveTo(-r * 0.5, r * 0.05); ctx.lineTo(0, r * 0.9);
      ctx.moveTo(r * 0.5, r * 0.05); ctx.lineTo(0, r * 0.9);
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

  // Drawing event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'transform') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = getCanvasContext();
    if (!ctx) return;

    if (tool === 'stamp' && stampShape) {
      // First, restore the clean canvas state to discard the preview before drawing permanently
      if (savedCanvasData) {
        ctx.putImageData(savedCanvasData, 0, 0);
      }

      // Draw the shape permanently at 100% opacity
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.globalAlpha = 1.0;
      drawDiamondShape(ctx, x, y, stampSize, stampShape, 0);
      ctx.restore();

      // Capture the updated permanent state of the canvas
      const cleanState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setSavedCanvasData(cleanState);
      
      // Keep showing the preview at the clicked position
      setPointerPos({ x, y });
    } else {
      setIsDrawing(true);
      canvas.setPointerCapture(e.pointerId);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'stamp' && stampShape) {
      setPointerPos({ x, y });
      return;
    }

    if (!isDrawing) return;

    const ctx = getCanvasContext();
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    // After finishing pen/highlighter/eraser drawing, capture the clean state
    const ctx = getCanvasContext();
    if (ctx && canvas) {
      const cleanState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setSavedCanvasData(cleanState);
    }
  };

  const handlePointerLeave = () => {
    if (tool === 'stamp' && savedCanvasData) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.putImageData(savedCanvasData, 0, 0);
      }
    }
    setPointerPos(null);
  };

  // Render live stamp preview under the pointer
  useEffect(() => {
    if (tool === 'stamp' && stampShape && pointerPos && savedCanvasData) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        // First restore the clean canvas state to erase the previous preview
        ctx.putImageData(savedCanvasData, 0, 0);

        // Draw the preview shape with 0.5 opacity
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.globalAlpha = 0.5;

        drawDiamondShape(ctx, pointerPos.x, pointerPos.y, stampSize, stampShape, 0);
        ctx.restore();
      }
    }
  }, [pointerPos, stampSize, savedCanvasData, tool, stampShape, color, thickness]);

  // Switch drawing tools safely, clearing any outstanding preview
  const selectTool = (t: 'pen' | 'highlighter' | 'eraser' | 'transform') => {
    if (tool === 'stamp' && savedCanvasData) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.putImageData(savedCanvasData, 0, 0);
      }
    }
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
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setBgSrc(result);
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
      img.src = result;
    };
    reader.readAsDataURL(file);
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
    setBgImage(null);
    setBgSrc(null);
    setTool('pen');
  };

  // Save Canvas (Flattens background image + drawings together)
  const save = () => {
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

    const flattenedDataUrl = virtualCanvas.toDataURL('image/jpeg', 0.85);
    onSave(flattenedDataUrl);
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
            className="text-xs text-brand-300 hover:bg-brand-800 px-3 py-1.5 rounded-lg font-bold transition-all border-r border-brand-800 pr-4"
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
        className="flex-1 relative overflow-hidden bg-brand-100"
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
              <RefreshCw size={12} />
            </div>
          </div>
        )}

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
              : 'Select pen color/thickness and draw directly on top. Switch to eraser to correct strokes.'}
          </p>
        </div>

        {/* Ghosted Stencil Overlay Layer */}
        {stencilType !== 'none' && (
          <canvas
            ref={stencilCanvasRef}
            className="absolute inset-0 w-full h-full z-18 pointer-events-none"
            style={{ mixBlendMode: 'multiply' }}
          />
        )}

        {/* Drawing canvas layer */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className="absolute inset-0 w-full h-full z-20 touch-none"
          style={{
            pointerEvents: tool === 'transform' ? 'none' : 'auto',
            background: 'transparent'
          }}
        />
      </div>

      {/* Floating control dock - highly optimized for tablet and mobile views */}
      <div className="bg-white/95 backdrop-blur-xl border-t border-brand-200 p-3 md:p-4 pb-5 flex flex-col gap-3 shadow-2xl z-30">
        
        {/* INTERACTIVE STAMP SETTINGS PANEL (Shown only when stamp tool is active) */}
        {tool === 'stamp' && stampShape ? (
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200/60 rounded-xl shadow-inner animate-fadeIn">
            <div className="flex items-center gap-2 self-start md:self-auto">
              <span className="bg-amber-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={10} className="animate-spin-slow" /> Active Stamp: {stampShape}
              </span>
              <span className="text-[10px] text-brand-600 font-medium hidden sm:inline">
                Click anywhere on canvas to stamp. Use slider to adjust size.
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              {/* Size Slider */}
              <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-[140px]">
                <span className="text-[10px] font-bold text-brand-700 w-8">Size:</span>
                <input
                  type="range"
                  min={stampShape === 'Ring Rail' ? "20" : "5"}
                  max="300"
                  value={stampSize}
                  onChange={(e) => setStampSize(parseInt(e.target.value))}
                  className="flex-1 sm:w-28 md:w-32 accent-amber-500 cursor-pointer h-1.5 bg-amber-100 rounded-lg appearance-none"
                />
                <span className="text-[10px] font-bold text-brand-800 font-mono w-10 text-right">{stampSize}px</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* DESIGN STENCIL SETTINGS PANEL (Shown only when stencil is active) */}
        {stencilType !== 'none' ? (
          <div className="w-full grid grid-cols-1 md:grid-cols-4 items-center gap-4 p-3.5 bg-brand-50 border border-brand-200/60 rounded-xl shadow-inner animate-fadeIn text-[11px] mb-2">
            {/* Header / Stencil Info */}
            <div className="md:col-span-1 flex flex-col gap-1">
              <span className="bg-brand-900 text-brand-gold text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider w-max flex items-center gap-1">
                <Sparkles size={10} /> Stencil Active
              </span>
              <span className="font-bold text-brand-800 uppercase tracking-wide">
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
                <span className="font-bold text-brand-700 w-12 text-left">Size:</span>
                <input
                  type="range"
                  min="50"
                  max="500"
                  value={stencilSize}
                  onChange={(e) => setStencilSize(parseInt(e.target.value))}
                  className="flex-1 accent-brand-900 cursor-pointer h-1 bg-brand-200 rounded-lg appearance-none"
                />
                <span className="font-bold text-brand-800 font-mono w-10 text-right">{stencilSize}px</span>
              </div>

              {/* Opacity Slider */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-brand-700 w-12 text-left">Opacity:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={stencilOpacity}
                  onChange={(e) => setStencilOpacity(parseFloat(e.target.value))}
                  className="flex-1 accent-brand-900 cursor-pointer h-1 bg-brand-200 rounded-lg appearance-none"
                />
                <span className="font-bold text-brand-800 font-mono w-10 text-right">{(stencilOpacity * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Controls Row 2: Rotation & Reset */}
            <div className="md:col-span-1 flex items-center justify-between gap-3">
              {/* Rotate Slider */}
              <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                <span className="font-bold text-brand-700 w-10 text-left">Rotate:</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={stencilRotate}
                  onChange={(e) => setStencilRotate(parseInt(e.target.value))}
                  className="flex-1 accent-brand-900 cursor-pointer h-1 bg-brand-200 rounded-lg appearance-none"
                />
                <span className="font-bold text-brand-800 font-mono w-10 text-right">{stencilRotate}°</span>
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
                className="text-[9px] font-black text-brand-500 hover:text-brand-900 border border-brand-200 bg-white px-2 py-1 rounded transition-all shrink-0 uppercase"
                title="Reset stencil properties"
              >
                Reset
              </button>
            </div>

            {/* Position offset controls & Export Toggle */}
            <div className="md:col-span-4 border-t border-brand-200/50 pt-2.5 flex flex-wrap justify-between items-center gap-3">
              {/* Position sliders */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-brand-500 uppercase tracking-widest text-[9px]">Offset X:</span>
                  <input
                    type="range"
                    min="-300"
                    max="300"
                    value={stencilOffsetX}
                    onChange={(e) => setStencilOffsetX(parseInt(e.target.value))}
                    className="w-20 accent-brand-900 cursor-pointer h-1 bg-brand-200 rounded-lg appearance-none"
                  />
                  <span className="font-mono font-bold text-brand-700 w-8 text-right">{stencilOffsetX > 0 ? `+${stencilOffsetX}` : stencilOffsetX}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-brand-500 uppercase tracking-widest text-[9px]">Offset Y:</span>
                  <input
                    type="range"
                    min="-300"
                    max="300"
                    value={stencilOffsetY}
                    onChange={(e) => setStencilOffsetY(parseInt(e.target.value))}
                    className="w-20 accent-brand-900 cursor-pointer h-1 bg-brand-200 rounded-lg appearance-none"
                  />
                  <span className="font-mono font-bold text-brand-700 w-8 text-right">{stencilOffsetY > 0 ? `+${stencilOffsetY}` : stencilOffsetY}px</span>
                </div>
              </div>

              {/* Include in Save Toggle */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-brand-600">Export:</span>
                <button
                  type="button"
                  onClick={() => setStencilIncludeInExport(!stencilIncludeInExport)}
                  className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all ${
                    stencilIncludeInExport ? 'bg-brand-900 text-brand-gold shadow' : 'bg-brand-200 text-brand-600'
                  }`}
                >
                  {stencilIncludeInExport ? 'Bake Enabled' : 'Guide Only'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* MAIN SKETCH TOOLS BAR */}
        <div className="w-full flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 md:gap-4">
          
          {/* Tool selectors & Image upload (Tablet layout optimized) */}
          <div className="flex items-center justify-between sm:justify-start gap-2.5 w-full sm:w-auto shrink-0">
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
                onClick={() => selectTool('eraser')}
                className={`p-2.5 md:p-3 rounded-lg transition-all min-w-[42px] min-h-[42px] flex items-center justify-center ${tool === 'eraser' ? 'bg-brand-900 text-white shadow-md' : 'text-brand-600 hover:bg-brand-100'}`}
                title="Eraser"
              >
                <Eraser size={15} />
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
          </div>
 
          {/* Stencil Selector (Tablet layout optimized) */}
          <div className="w-full sm:w-auto shrink-0 md:max-w-[200px]">
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

          {/* Stamp Selector (Tablet layout optimized) */}
          <div className="w-full sm:w-auto shrink-0 md:max-w-[200px]">
            <select
              id="sketch-shape-select"
              value={tool === 'stamp' ? stampShape : ''}
              onChange={(e) => handleStampShapeChange(e.target.value)}
              className="cursor-pointer text-[10px] font-black text-brand-800 bg-amber-50 border border-amber-200 px-3 py-3 rounded-xl hover:bg-amber-100/80 transition-all shadow-sm outline-none w-full uppercase tracking-wider min-h-[42px]"
            >
              <option value="">💠 Stamp Design Template</option>
              <optgroup label="Ring Design Layout">
                <option value="Ring Rail">Ring Rail (Circle)</option>
              </optgroup>
              <optgroup label="Top View Gemstones">
                {CENTER_SHAPES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </optgroup>
              <optgroup label="Side Profile Gemstones">
                <option value="Round Side">Round (Side)</option>
                <option value="Princess Side">Princess (Side)</option>
                <option value="Emerald Side">Emerald (Side)</option>
                <option value="Pear Side">Pear (Side)</option>
                <option value="Marquise Side">Marquise (Side)</option>
              </optgroup>
            </select>
          </div>
 
          {/* Color palette & Pen thickness slider (Tablet layout optimized) */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto justify-end shrink-0">
            {/* Color palette */}
            <div className="flex flex-nowrap gap-2 px-2.5 py-2 bg-brand-50/50 rounded-xl border border-brand-100/80 sm:border-transparent shrink-0">
              {colorOptions.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setColor(c.val);
                    if (tool === 'eraser' || tool === 'transform') {
                      setTool('pen');
                    }
                  }}
                  className={`w-6 h-6 rounded-full ${c.bgClass} border-2 transition-all shadow-sm shrink-0 ${color === c.val ? 'border-brand-gold scale-125 shadow-md' : 'border-transparent scale-100 hover:scale-105'}`}
                />
              ))}
            </div>
 
            {/* continuous brush stroke thickness slider */}
            <div className="flex items-center gap-2 bg-brand-50 px-3.5 py-2 rounded-xl border border-brand-200/60 w-full sm:w-auto shrink-0">
              <span className="text-[9px] font-black text-brand-500 uppercase tracking-wider shrink-0">Stroke:</span>
              <input
                type="range"
                min="1"
                max="30"
                step="0.5"
                value={thickness}
                onChange={(e) => setThickness(parseFloat(e.target.value))}
                className="flex-1 sm:w-20 md:w-24 accent-brand-900 cursor-pointer h-1 bg-brand-200 rounded-lg appearance-none"
              />
              <span className="text-[9px] font-bold font-mono text-brand-800 w-11 text-center bg-white px-1.5 py-0.5 rounded border border-brand-200 shrink-0">
                {thickness.toFixed(1)}px
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
