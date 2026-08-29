/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Crop, PenTool, ArrowRight, Circle, Square, 
  Type, Eraser, RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  Check, X, Undo, Redo, ZoomIn, ZoomOut, Maximize2, RefreshCw, 
  Trash2, Move, Eye, Sparkles, Camera
} from 'lucide-react';
import { compressImage } from '../utils';
import { playClickSound } from '../utils/audio';

interface PhotoEditorModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onSave: (editedDataUrl: string) => void;
  onClose: () => void;
  title?: string;
}

type EditorMode = 'crop' | 'draw';
type DrawTool = 'pen' | 'arrow' | 'line' | 'circle' | 'rect' | 'text' | 'eraser';
type AspectRatio = 'free' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

interface Point {
  x: number;
  y: number;
}

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const COLOR_PALETTE = [
  { name: 'Jeweler Red', hex: '#ef4444', bg: 'bg-red-500' },
  { name: 'Gold Yellow', hex: '#eab308', bg: 'bg-amber-400' },
  { name: 'Emerald Green', hex: '#10b981', bg: 'bg-emerald-500' },
  { name: 'Diamond Blue', hex: '#0ea5e9', bg: 'bg-sky-500' },
  { name: 'Pure White', hex: '#ffffff', bg: 'bg-white' },
  { name: 'Onyx Black', hex: '#0f172a', bg: 'bg-slate-900' },
  { name: 'Royal Purple', hex: '#a855f7', bg: 'bg-purple-500' },
];

const STROKE_WIDTHS = [
  { label: 'Fine (2px)', value: 2 },
  { label: 'Medium (4px)', value: 4 },
  { label: 'Bold (8px)', value: 8 },
  { label: 'Thick (14px)', value: 14 },
];

export default function PhotoEditorModal({
  isOpen,
  imageSrc,
  onSave,
  onClose,
  title = "Crop & Draw on Reference Photo"
}: PhotoEditorModalProps) {
  if (!isOpen || !imageSrc) return null;

  // Active Tab
  const [activeMode, setActiveMode] = useState<EditorMode>('draw');

  // Base image state
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Canvases & Containers
  const containerRef = useRef<HTMLDivElement | null>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Drawing state
  const [drawTool, setDrawTool] = useState<DrawTool>('pen');
  const [color, setColor] = useState<string>('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [customText, setCustomText] = useState<string>('Bench Note');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);

  // Smooth drawing point trackers
  const lastPosRef = useRef<Point | null>(null);
  const midPosRef = useRef<Point | null>(null);
  const pointsRef = useRef<Point[]>([]);

  // Undo / Redo History (stores ImageData of drawing layer)
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  // Cropping state
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, w: 100, h: 100 });
  const [cropDragMode, setCropDragMode] = useState<string | null>(null); // 'move' | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r'
  const [cropDragStart, setCropDragStart] = useState<{ x: number; y: number; rect: CropRect } | null>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Snapshot before starting a shape (for previewing live shape drag)
  const previewSnapshotRef = useRef<ImageData | null>(null);

  // Load the initial source image into an Image object
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setLoadedImg(img);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setZoom(1);

      // Initialize crop rect with 5% inset
      setCropRect({
        x: Math.round(img.width * 0.05),
        y: Math.round(img.height * 0.05),
        w: Math.round(img.width * 0.9),
        h: Math.round(img.height * 0.9),
      });

      // Prepare drawing canvas with high resolution backing
      const canvas = drawingCanvasRef.current;
      if (canvas) {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          const initialSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setHistory([initialSnapshot]);
          setHistoryIdx(0);
        }
      }
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Window-level crop drag handler for seamless panning and resizing without dropping capture
  useEffect(() => {
    if (!cropDragMode || !cropDragStart || !loadedImg || !drawingCanvasRef.current) return;

    const onPointerMove = (e: PointerEvent) => {
      e.preventDefault();
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const dx = (e.clientX - cropDragStart.x) * scaleX;
      const dy = (e.clientY - cropDragStart.y) * scaleY;

      const orig = cropDragStart.rect;
      const maxW = canvas.width;
      const maxH = canvas.height;

      let targetRatio = 0;
      if (aspectRatio === '1:1') targetRatio = 1;
      else if (aspectRatio === '4:3') targetRatio = 4 / 3;
      else if (aspectRatio === '3:4') targetRatio = 3 / 4;
      else if (aspectRatio === '16:9') targetRatio = 16 / 9;
      else if (aspectRatio === '9:16') targetRatio = 9 / 16;

      let newX = orig.x;
      let newY = orig.y;
      let newW = orig.w;
      let newH = orig.h;

      if (cropDragMode === 'move') {
        // Effortless full panning across the photo bounds
        newX = Math.max(0, Math.min(orig.x + dx, maxW - orig.w));
        newY = Math.max(0, Math.min(orig.y + dy, maxH - orig.h));
      } else if (cropDragMode === 'br') {
        // Bottom-Right Corner Handle
        newW = Math.max(30, Math.min(orig.w + dx, maxW - orig.x));
        newH = targetRatio > 0 ? newW / targetRatio : Math.max(30, Math.min(orig.h + dy, maxH - orig.y));
        if (orig.y + newH > maxH && targetRatio > 0) {
          newH = maxH - orig.y;
          newW = newH * targetRatio;
        }
      } else if (cropDragMode === 'bl') {
        // Bottom-Left Corner Handle
        const targetX = Math.max(0, Math.min(orig.x + dx, orig.x + orig.w - 30));
        newW = orig.w + (orig.x - targetX);
        newH = targetRatio > 0 ? newW / targetRatio : Math.max(30, Math.min(orig.h + dy, maxH - orig.y));
        newX = targetX;
        if (orig.y + newH > maxH && targetRatio > 0) {
          newH = maxH - orig.y;
          newW = newH * targetRatio;
          newX = orig.x + orig.w - newW;
        }
      } else if (cropDragMode === 'tl') {
        // Top-Left Corner Handle
        const targetX = Math.max(0, Math.min(orig.x + dx, orig.x + orig.w - 30));
        const targetY = Math.max(0, Math.min(orig.y + dy, orig.y + orig.h - 30));
        newW = orig.w + (orig.x - targetX);
        newH = targetRatio > 0 ? newW / targetRatio : orig.h + (orig.y - targetY);
        newX = targetRatio > 0 ? orig.x + orig.w - newW : targetX;
        newY = targetRatio > 0 ? orig.y + orig.h - newH : targetY;
        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
      } else if (cropDragMode === 'tr') {
        // Top-Right Corner Handle
        newW = Math.max(30, Math.min(orig.w + dx, maxW - orig.x));
        const targetY = Math.max(0, Math.min(orig.y + dy, orig.y + orig.h - 30));
        newH = targetRatio > 0 ? newW / targetRatio : orig.h + (orig.y - targetY);
        newY = targetRatio > 0 ? orig.y + orig.h - newH : targetY;
        if (newY < 0) newY = 0;
      } else if (cropDragMode === 'b') {
        // Bottom Edge Handle
        newH = Math.max(30, Math.min(orig.h + dy, maxH - orig.y));
        if (targetRatio > 0) {
          newW = newH * targetRatio;
          newX = Math.max(0, orig.x + (orig.w - newW) / 2);
        }
      } else if (cropDragMode === 't') {
        // Top Edge Handle
        const targetY = Math.max(0, Math.min(orig.y + dy, orig.y + orig.h - 30));
        newH = orig.h + (orig.y - targetY);
        newY = targetY;
        if (targetRatio > 0) {
          newW = newH * targetRatio;
          newX = Math.max(0, orig.x + (orig.w - newW) / 2);
        }
      } else if (cropDragMode === 'l') {
        // Left Edge Handle
        const targetX = Math.max(0, Math.min(orig.x + dx, orig.x + orig.w - 30));
        newW = orig.w + (orig.x - targetX);
        newX = targetX;
        if (targetRatio > 0) {
          newH = newW / targetRatio;
          newY = Math.max(0, orig.y + (orig.h - newH) / 2);
        }
      } else if (cropDragMode === 'r') {
        // Right Edge Handle
        newW = Math.max(30, Math.min(orig.w + dx, maxW - orig.x));
        if (targetRatio > 0) {
          newH = newW / targetRatio;
          newY = Math.max(0, orig.y + (orig.h - newH) / 2);
        }
      }

      setCropRect({
        x: Math.round(newX),
        y: Math.round(newY),
        w: Math.round(newW),
        h: Math.round(newH)
      });
    };

    const onPointerUp = () => {
      setCropDragMode(null);
      setCropDragStart(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [cropDragMode, cropDragStart, loadedImg, aspectRatio]);

  // Helper to push history
  const pushHistory = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHist = history.slice(0, historyIdx + 1);
    newHist.push(current);
    if (newHist.length > 25) newHist.shift();
    setHistory(newHist);
    setHistoryIdx(newHist.length - 1);
  }, [history, historyIdx]);

  // Handle Undo
  const handleUndo = useCallback(() => {
    if (historyIdx > 0) {
      playClickSound('click');
      const newIdx = historyIdx - 1;
      const targetSnapshot = history[newIdx];
      const canvas = drawingCanvasRef.current;
      if (canvas && targetSnapshot) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(targetSnapshot, 0, 0);
          setHistoryIdx(newIdx);
        }
      }
    }
  }, [history, historyIdx]);

  // Handle Redo
  const handleRedo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      playClickSound('click');
      const newIdx = historyIdx + 1;
      const targetSnapshot = history[newIdx];
      const canvas = drawingCanvasRef.current;
      if (canvas && targetSnapshot) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(targetSnapshot, 0, 0);
          setHistoryIdx(newIdx);
        }
      }
    }
  }, [history, historyIdx]);

  // Clear all drawings
  const handleClearDrawings = () => {
    if (!window.confirm("Clear all markup and annotations on this photo?")) return;
    playClickSound('delete');
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pushHistory();
      }
    }
  };

  // Convert client pointer coordinates to natural image/canvas coordinate space
  const getCanvasCoords = (clientX: number, clientY: number): Point | null => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Rotate 90 deg helper
  const handleRotate = (direction: 'cw' | 'ccw') => {
    playClickSound('click');
    setRotation(prev => (direction === 'cw' ? (prev + 90) % 360 : (prev - 90 + 360) % 360));
  };

  // Set Aspect ratio and adjust cropRect
  const handleSetAspectRatio = (ratio: AspectRatio) => {
    playClickSound('click');
    setAspectRatio(ratio);
    if (!loadedImg) return;

    let targetRatio = 0;
    if (ratio === '1:1') targetRatio = 1;
    else if (ratio === '4:3') targetRatio = 4 / 3;
    else if (ratio === '3:4') targetRatio = 3 / 4;
    else if (ratio === '16:9') targetRatio = 16 / 9;
    else if (ratio === '9:16') targetRatio = 9 / 16;

    if (targetRatio > 0) {
      const maxW = loadedImg.width * 0.9;
      const maxH = loadedImg.height * 0.9;
      let newW = maxW;
      let newH = newW / targetRatio;

      if (newH > maxH) {
        newH = maxH;
        newW = newH * targetRatio;
      }

      setCropRect({
        x: Math.round((loadedImg.width - newW) / 2),
        y: Math.round((loadedImg.height - newH) / 2),
        w: Math.round(newW),
        h: Math.round(newH),
      });
    }
  };

  // Apply Crop Transformation
  const handleApplyCrop = async () => {
    if (!loadedImg || !drawingCanvasRef.current) return;
    playClickSound('success');
    setIsProcessing(true);

    try {
      // 1. Create working offscreen canvas for transformed source image
      const srcW = loadedImg.width;
      const srcH = loadedImg.height;

      // Handle orientation transform (rotation & flip)
      const isRotated90or270 = rotation === 90 || rotation === 270;
      const transformedW = isRotated90or270 ? srcH : srcW;
      const transformedH = isRotated90or270 ? srcW : srcH;

      const compCanvas = document.createElement('canvas');
      compCanvas.width = transformedW;
      compCanvas.height = transformedH;
      const compCtx = compCanvas.getContext('2d');

      if (compCtx) {
        compCtx.imageSmoothingEnabled = true;
        compCtx.imageSmoothingQuality = 'high';
        compCtx.save();
        compCtx.translate(transformedW / 2, transformedH / 2);
        compCtx.rotate((rotation * Math.PI) / 180);
        compCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        compCtx.drawImage(loadedImg, -srcW / 2, -srcH / 2);
        compCtx.restore();

        // Also draw existing drawings onto this transformed space
        if (drawingCanvasRef.current) {
          compCtx.drawImage(drawingCanvasRef.current, 0, 0);
        }

        // Now crop to cropRect
        const cropX = Math.max(0, Math.min(cropRect.x, transformedW - 10));
        const cropY = Math.max(0, Math.min(cropRect.y, transformedH - 10));
        const cropW = Math.max(10, Math.min(cropRect.w, transformedW - cropX));
        const cropH = Math.max(10, Math.min(cropRect.h, transformedH - cropY));

        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = cropW;
        finalCanvas.height = cropH;
        const finalCtx = finalCanvas.getContext('2d');

        if (finalCtx) {
          finalCtx.imageSmoothingEnabled = true;
          finalCtx.imageSmoothingQuality = 'high';
          finalCtx.drawImage(compCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

          // Update loadedImg to cropped version at high quality
          const newBase64 = finalCanvas.toDataURL('image/jpeg', 0.95);
          const newImg = new Image();
          newImg.onload = () => {
            setLoadedImg(newImg);
            setRotation(0);
            setFlipH(false);
            setFlipV(false);

            // Reset cropRect to full image
            setCropRect({
              x: Math.round(newImg.width * 0.05),
              y: Math.round(newImg.height * 0.05),
              w: Math.round(newImg.width * 0.9),
              h: Math.round(newImg.height * 0.9),
            });

            // Reset drawing canvas to match new dimensions
            if (drawingCanvasRef.current) {
              drawingCanvasRef.current.width = newImg.width;
              drawingCanvasRef.current.height = newImg.height;
              const dCtx = drawingCanvasRef.current.getContext('2d');
              if (dCtx) {
                dCtx.clearRect(0, 0, newImg.width, newImg.height);
                dCtx.imageSmoothingEnabled = true;
                dCtx.imageSmoothingQuality = 'high';
                const snap = dCtx.getImageData(0, 0, newImg.width, newImg.height);
                setHistory([snap]);
                setHistoryIdx(0);
              }
            }
            setActiveMode('draw');
            setIsProcessing(false);
          };
          newImg.src = newBase64;
        }
      }
    } catch (err) {
      console.error("Error cropping image:", err);
      setIsProcessing(false);
    }
  };

  // Final Save & Export handler
  const handleSaveAndExport = async () => {
    if (!loadedImg || !drawingCanvasRef.current) return;
    playClickSound('success');
    setIsProcessing(true);

    try {
      const srcW = loadedImg.width;
      const srcH = loadedImg.height;
      const isRotated90or270 = rotation === 90 || rotation === 270;
      const transformedW = isRotated90or270 ? srcH : srcW;
      const transformedH = isRotated90or270 ? srcW : srcH;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = transformedW;
      exportCanvas.height = transformedH;
      const ctx = exportCanvas.getContext('2d');

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw background photo with orientation transforms
        ctx.save();
        ctx.translate(transformedW / 2, transformedH / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.drawImage(loadedImg, -srcW / 2, -srcH / 2);
        ctx.restore();

        // Draw drawing annotation layer
        ctx.drawImage(drawingCanvasRef.current, 0, 0);

        // Convert to high-resolution JPEG (1200px max, 0.85 quality)
        const rawBase64 = exportCanvas.toDataURL('image/jpeg', 0.90);
        const optimized = await compressImage(rawBase64, 1200, 0.85);

        onSave(optimized);
        onClose();
      }
    } catch (err) {
      console.error("Failed to export edited photo:", err);
      alert("Error saving edited image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- SMOOTH DRAWING EVENT HANDLERS ---
  const handleDrawingStart = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeMode !== 'draw') return;
    if (e.cancelable) e.preventDefault();

    // Ignore hovering stylus or non-pressed events
    if (e.buttons === 0 || (e.pointerType === 'pen' && e.pressure === 0)) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Fallback
    }

    const pt = getCanvasCoords(e.clientX, e.clientY);
    if (!pt) return;

    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Save snapshot before drag for live shape preview (arrow, circle, rect, line)
    previewSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    setIsDrawing(true);
    setStartPoint(pt);
    setCurrentPoint(pt);
    lastPosRef.current = pt;
    midPosRef.current = pt;

    if (drawTool === 'pen' || drawTool === 'eraser') {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (drawTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = strokeWidth * 2.5;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = strokeWidth;
      }

      // Draw initial smooth dot for click/tap
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, (drawTool === 'eraser' ? strokeWidth * 1.25 : strokeWidth) / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (drawTool === 'text') {
      // Stamp text immediately at click position
      drawTextStamp(ctx, pt.x, pt.y, customText, color);
      pushHistory();
      setIsDrawing(false);
    }
  };

  const handleDrawingMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeMode !== 'draw' || !startPoint) return;
    if (e.cancelable) e.preventDefault();

    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Use coalesced events for ultra-smooth stylus/pencil tracking if supported
    const coalesced = (e.nativeEvent && typeof (e.nativeEvent as unknown as { getCoalescedEvents?: () => PointerEvent[] }).getCoalescedEvents === 'function')
      ? (e.nativeEvent as unknown as { getCoalescedEvents: () => PointerEvent[] }).getCoalescedEvents()
      : [e];

    if (drawTool === 'pen' || drawTool === 'eraser') {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (drawTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = strokeWidth * 2.5;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = strokeWidth;
      }

      for (const ev of coalesced) {
        const pt = getCanvasCoords(ev.clientX, ev.clientY);
        if (!pt) continue;

        const last = lastPosRef.current || pt;
        const startMid = midPosRef.current || last;
        const endMid = { x: (last.x + pt.x) / 2, y: (last.y + pt.y) / 2 };

        // Quadratic Bézier curve interpolation for anti-aliased, ultra-smooth lines
        ctx.beginPath();
        ctx.moveTo(startMid.x, startMid.y);
        ctx.quadraticCurveTo(last.x, last.y, endMid.x, endMid.y);
        ctx.stroke();

        lastPosRef.current = pt;
        midPosRef.current = endMid;
      }
    } else {
      const pt = getCanvasCoords(e.clientX, e.clientY);
      if (!pt) return;
      setCurrentPoint(pt);

      if (previewSnapshotRef.current) {
        // For shapes: restore snapshot and draw live preview
        ctx.putImageData(previewSnapshotRef.current, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = strokeWidth;

        if (drawTool === 'line') {
          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
        } else if (drawTool === 'arrow') {
          drawArrow(ctx, startPoint.x, startPoint.y, pt.x, pt.y, strokeWidth, color);
        } else if (drawTool === 'circle') {
          const radiusX = Math.abs(pt.x - startPoint.x) / 2;
          const radiusY = Math.abs(pt.y - startPoint.y) / 2;
          const centerX = Math.min(startPoint.x, pt.x) + radiusX;
          const centerY = Math.min(startPoint.y, pt.y) + radiusY;
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (drawTool === 'rect') {
          const x = Math.min(startPoint.x, pt.x);
          const y = Math.min(startPoint.y, pt.y);
          const w = Math.abs(pt.x - startPoint.x);
          const h = Math.abs(pt.y - startPoint.y);
          ctx.strokeRect(x, y, w, h);
        }
      }
    }
  };

  const handleDrawingEnd = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeMode !== 'draw') return;
    setIsDrawing(false);

    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture may already be released
      }
    }

    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw trailing connection to last position
        if ((drawTool === 'pen' || drawTool === 'eraser') && midPosRef.current && lastPosRef.current) {
          ctx.beginPath();
          ctx.moveTo(midPosRef.current.x, midPosRef.current.y);
          ctx.lineTo(lastPosRef.current.x, lastPosRef.current.y);
          ctx.stroke();
        }

        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
        pushHistory();
      }
    }
    setStartPoint(null);
    setCurrentPoint(null);
    lastPosRef.current = null;
    midPosRef.current = null;
    previewSnapshotRef.current = null;
  };

  // Helper to draw clean vector arrow
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    width: number,
    arrowColor: string
  ) => {
    const headLength = Math.max(14, width * 3.5);
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.save();
    ctx.strokeStyle = arrowColor;
    ctx.fillStyle = arrowColor;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';

    // Draw main line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Draw arrow head
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Helper to stamp text note with high contrast badge
  const drawTextStamp = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    textColor: string
  ) => {
    if (!text.trim()) return;
    ctx.save();
    const fontSize = Math.max(14, strokeWidth * 4.5);
    ctx.font = `bold ${fontSize}px sans-serif`;

    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const padding = fontSize * 0.4;
    const height = fontSize * 1.3;

    // Background pill badge for maximum readability on any photo surface
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.roundRect(x - padding, y - height * 0.85, textWidth + padding * 2, height, 6);
    ctx.fill();
    ctx.stroke();

    // Foreground Text
    ctx.fillStyle = textColor;
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  // --- CROP BOX INTERACTION HANDLERS ---
  const handleCropPointerDown = (e: React.PointerEvent<HTMLElement>, handleType: string) => {
    if (activeMode !== 'crop') return;
    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Fallback
    }

    setCropDragMode(handleType);
    setCropDragStart({
      x: e.clientX,
      y: e.clientY,
      rect: { ...cropRect }
    });
  };

  const handleCropPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!cropDragMode || !cropDragStart || !loadedImg || !drawingCanvasRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = drawingCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const dx = (e.clientX - cropDragStart.x) * scaleX;
    const dy = (e.clientY - cropDragStart.y) * scaleY;

    const orig = cropDragStart.rect;
    const maxW = canvas.width;
    const maxH = canvas.height;

    let targetRatio = 0;
    if (aspectRatio === '1:1') targetRatio = 1;
    else if (aspectRatio === '4:3') targetRatio = 4 / 3;
    else if (aspectRatio === '3:4') targetRatio = 3 / 4;
    else if (aspectRatio === '16:9') targetRatio = 16 / 9;
    else if (aspectRatio === '9:16') targetRatio = 9 / 16;

    let newX = orig.x;
    let newY = orig.y;
    let newW = orig.w;
    let newH = orig.h;

    if (cropDragMode === 'move') {
      // Clean panning: translate entire crop box while staying inside photo bounds
      newX = Math.max(0, Math.min(orig.x + dx, maxW - orig.w));
      newY = Math.max(0, Math.min(orig.y + dy, maxH - orig.h));
    } else if (cropDragMode === 'br') {
      // Bottom-Right Corner Handle
      newW = Math.max(30, Math.min(orig.w + dx, maxW - orig.x));
      newH = targetRatio > 0 ? newW / targetRatio : Math.max(30, Math.min(orig.h + dy, maxH - orig.y));
      if (orig.y + newH > maxH && targetRatio > 0) {
        newH = maxH - orig.y;
        newW = newH * targetRatio;
      }
    } else if (cropDragMode === 'bl') {
      // Bottom-Left Corner Handle
      const targetX = Math.max(0, Math.min(orig.x + dx, orig.x + orig.w - 30));
      newW = orig.w + (orig.x - targetX);
      newH = targetRatio > 0 ? newW / targetRatio : Math.max(30, Math.min(orig.h + dy, maxH - orig.y));
      newX = targetX;
      if (orig.y + newH > maxH && targetRatio > 0) {
        newH = maxH - orig.y;
        newW = newH * targetRatio;
        newX = orig.x + orig.w - newW;
      }
    } else if (cropDragMode === 'tl') {
      // Top-Left Corner Handle
      const targetX = Math.max(0, Math.min(orig.x + dx, orig.x + orig.w - 30));
      const targetY = Math.max(0, Math.min(orig.y + dy, orig.y + orig.h - 30));
      newW = orig.w + (orig.x - targetX);
      newH = targetRatio > 0 ? newW / targetRatio : orig.h + (orig.y - targetY);
      newX = targetRatio > 0 ? orig.x + orig.w - newW : targetX;
      newY = targetRatio > 0 ? orig.y + orig.h - newH : targetY;
      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;
    } else if (cropDragMode === 'tr') {
      // Top-Right Corner Handle
      newW = Math.max(30, Math.min(orig.w + dx, maxW - orig.x));
      const targetY = Math.max(0, Math.min(orig.y + dy, orig.y + orig.h - 30));
      newH = targetRatio > 0 ? newW / targetRatio : orig.h + (orig.y - targetY);
      newY = targetRatio > 0 ? orig.y + orig.h - newH : targetY;
      if (newY < 0) newY = 0;
    } else if (cropDragMode === 'b') {
      // Bottom Edge Handle
      newH = Math.max(30, Math.min(orig.h + dy, maxH - orig.y));
      if (targetRatio > 0) {
        newW = newH * targetRatio;
        newX = Math.max(0, orig.x + (orig.w - newW) / 2);
      }
    } else if (cropDragMode === 't') {
      // Top Edge Handle
      const targetY = Math.max(0, Math.min(orig.y + dy, orig.y + orig.h - 30));
      newH = orig.h + (orig.y - targetY);
      newY = targetY;
      if (targetRatio > 0) {
        newW = newH * targetRatio;
        newX = Math.max(0, orig.x + (orig.w - newW) / 2);
      }
    } else if (cropDragMode === 'l') {
      // Left Edge Handle
      const targetX = Math.max(0, Math.min(orig.x + dx, orig.x + orig.w - 30));
      newW = orig.w + (orig.x - targetX);
      newX = targetX;
      if (targetRatio > 0) {
        newH = newW / targetRatio;
        newY = Math.max(0, orig.y + (orig.h - newH) / 2);
      }
    } else if (cropDragMode === 'r') {
      // Right Edge Handle
      newW = Math.max(30, Math.min(orig.w + dx, maxW - orig.x));
      if (targetRatio > 0) {
        newH = newW / targetRatio;
        newY = Math.max(0, orig.y + (orig.h - newH) / 2);
      }
    }

    setCropRect({
      x: Math.round(newX),
      y: Math.round(newY),
      w: Math.round(newW),
      h: Math.round(newH)
    });
  };

  const handleCropPointerUp = (e?: React.PointerEvent<HTMLElement>) => {
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture may already be released
      }
    }
    setCropDragMode(null);
    setCropDragStart(null);
  };

  // Convert crop rect into percentage values for CSS overlay positioning
  const canvasWidth = drawingCanvasRef.current?.width || (loadedImg?.width || 100);
  const canvasHeight = drawingCanvasRef.current?.height || (loadedImg?.height || 100);

  const cropPctLeft = (cropRect.x / canvasWidth) * 100;
  const cropPctTop = (cropRect.y / canvasHeight) * 100;
  const cropPctWidth = (cropRect.w / canvasWidth) * 100;
  const cropPctHeight = (cropRect.h / canvasHeight) * 100;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 animate-fadeIn select-none font-sans">
      <div className="bg-slate-900 text-white rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl border border-slate-700/80 overflow-hidden">
        
        {/* TOP HEADER & TOOLBAR TABS */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-brand-gold flex items-center justify-center shadow-inner">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="font-serif italic font-bold text-sm sm:text-base text-amber-200">{title}</h3>
              <p className="text-[10px] text-slate-400 font-mono">Professional Bench Markup & Crop Suite</p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-900 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => { playClickSound('click'); setActiveMode('draw'); }}
              className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMode === 'draw'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PenTool size={13} />
              Draw & Annotate
            </button>
            <button
              type="button"
              onClick={() => { playClickSound('click'); setActiveMode('crop'); }}
              className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMode === 'crop'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Crop size={13} />
              Crop & Rotate
            </button>
          </div>

          {/* Close Icon Button */}
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer"
            title="Cancel & Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* SECONDARY TOOL CONTROLS STRIP */}
        <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          
          {activeMode === 'draw' ? (
            /* DRAWING TOOLS */
            <div className="flex flex-wrap items-center gap-2 w-full justify-between">
              
              {/* Tool selector buttons */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => { playClickSound('click'); setDrawTool('pen'); }}
                  className={`p-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${drawTool === 'pen' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                  title="Precision Smooth Pen"
                >
                  <PenTool size={14} />
                  <span className="text-[10px] font-bold">Pen</span>
                </button>
                <button
                  type="button"
                  onClick={() => { playClickSound('click'); setDrawTool('arrow'); }}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${drawTool === 'arrow' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                  title="Callout Arrow (Drag to draw arrow)"
                >
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => { playClickSound('click'); setDrawTool('circle'); }}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${drawTool === 'circle' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                  title="Circle Detail"
                >
                  <Circle size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => { playClickSound('click'); setDrawTool('rect'); }}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${drawTool === 'rect' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                  title="Box Area"
                >
                  <Square size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => { playClickSound('click'); setDrawTool('text'); }}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${drawTool === 'text' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                  title="Text Bench Note"
                >
                  <Type size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => { playClickSound('click'); setDrawTool('eraser'); }}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${drawTool === 'eraser' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                  title="Eraser"
                >
                  <Eraser size={14} />
                </button>
              </div>

              {/* Text Note Input (visible when text tool active) */}
              {drawTool === 'text' && (
                <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-amber-300 font-bold uppercase">Note:</span>
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="e.g. Retip Prong, 1.5ct Oval"
                    className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-lg text-xs font-bold text-white outline-none w-36 sm:w-48"
                  />
                  <span className="text-[9px] text-slate-400 italic">Click photo to stamp</span>
                </div>
              )}

              {/* Color Palette */}
              <div className="flex items-center gap-1.5">
                {COLOR_PALETTE.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => { playClickSound('click'); setColor(c.hex); }}
                    className={`w-6 h-6 rounded-full transition-transform cursor-pointer border ${c.bg} ${
                      color === c.hex ? 'scale-125 border-white ring-2 ring-amber-400' : 'border-slate-700 hover:scale-110'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>

              {/* Thickness selector */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {STROKE_WIDTHS.map(sw => (
                  <button
                    key={sw.value}
                    type="button"
                    onClick={() => { playClickSound('click'); setStrokeWidth(sw.value); }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                      strokeWidth === sw.value ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {sw.value}px
                  </button>
                ))}
              </div>

              {/* Undo / Redo / Clear Actions */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyIdx <= 0}
                  className={`p-2 rounded-xl border border-slate-800 transition-colors cursor-pointer ${
                    historyIdx > 0 ? 'bg-slate-950 text-white hover:bg-slate-800' : 'bg-slate-950/40 text-slate-600 cursor-not-allowed'
                  }`}
                  title="Undo Stroke"
                >
                  <Undo size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyIdx >= history.length - 1}
                  className={`p-2 rounded-xl border border-slate-800 transition-colors cursor-pointer ${
                    historyIdx < history.length - 1 ? 'bg-slate-950 text-white hover:bg-slate-800' : 'bg-slate-950/40 text-slate-600 cursor-not-allowed'
                  }`}
                  title="Redo Stroke"
                >
                  <Redo size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleClearDrawings}
                  className="p-2 rounded-xl bg-slate-950 text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-slate-800 transition-colors cursor-pointer"
                  title="Clear All Markups"
                >
                  <Trash2 size={14} />
                </button>
              </div>

            </div>
          ) : (
            /* CROPPING & ORIENTATION CONTROLS */
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              {/* Aspect Ratio Buttons */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['free', '1:1', '4:3', '3:4', '16:9'] as AspectRatio[]).map(ratio => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => handleSetAspectRatio(ratio)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                      aspectRatio === ratio ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {ratio === 'free' ? 'Custom' : ratio}
                  </button>
                ))}
              </div>

              {/* Rotate & Flip Controls */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleRotate('ccw')}
                  className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Rotate Left 90°"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRotate('cw')}
                  className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Rotate Right 90°"
                >
                  <RotateCw size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => { playClickSound('click'); setFlipH(!flipH); }}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${flipH ? 'bg-amber-500/20 text-amber-300' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
                  title="Flip Horizontally"
                >
                  <FlipHorizontal size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => { playClickSound('click'); setFlipV(!flipV); }}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${flipV ? 'bg-amber-500/20 text-amber-300' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
                  title="Flip Vertically"
                >
                  <FlipVertical size={14} />
                </button>
              </div>

              {/* Commit Crop Button */}
              <button
                type="button"
                onClick={handleApplyCrop}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                Confirm Crop
              </button>
            </div>
          )}

        </div>

        {/* MAIN CANVAS WORKSPACE AREA */}
        <div 
          ref={containerRef}
          className="flex-1 relative bg-slate-950 overflow-hidden flex items-center justify-center p-4 select-none touch-none"
        >
          {loadedImg && (
            <div 
              className="relative shadow-2xl rounded-xl overflow-hidden max-w-full max-h-full border border-slate-800"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease'
              }}
            >
              {/* Background Photo with Rotation and Flips */}
              <img
                src={loadedImg.src}
                alt="Bench Piece Background"
                className="max-h-[62vh] max-w-full object-contain block pointer-events-none select-none"
                style={{
                  transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                  transition: 'transform 0.2s ease'
                }}
              />

              {/* Interactive Drawing Canvas Layer */}
              <canvas
                ref={drawingCanvasRef}
                className={`absolute inset-0 w-full h-full touch-none ${activeMode === 'draw' ? 'pointer-events-auto cursor-crosshair z-20' : 'pointer-events-none z-10'}`}
                onPointerDown={handleDrawingStart}
                onPointerMove={handleDrawingMove}
                onPointerUp={handleDrawingEnd}
                onPointerCancel={handleDrawingEnd}
              />

              {/* Interactive Visual Cropping Box Overlay (Visible only in crop mode) */}
              {activeMode === 'crop' && (
                <div 
                  className="absolute inset-0 pointer-events-auto z-30 select-none touch-none"
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={handleCropPointerUp}
                  onPointerCancel={handleCropPointerUp}
                >
                  {/* Darkened semi-transparent mask around crop box */}
                  <div 
                    className="absolute inset-0 bg-slate-950/65 pointer-events-none"
                    style={{
                      clipPath: `polygon(0% 0%, 0% 100%, ${cropPctLeft}% 100%, ${cropPctLeft}% ${cropPctTop}%, ${cropPctLeft + cropPctWidth}% ${cropPctTop}%, ${cropPctLeft + cropPctWidth}% ${cropPctTop + cropPctHeight}%, ${cropPctLeft}% ${cropPctTop + cropPctHeight}%, ${cropPctLeft}% 100%, 100% 100%, 100% 0%)`
                    }}
                  />

                  {/* Active Crop Box Boundary */}
                  <div
                    className="absolute border-2 border-amber-400 shadow-2xl cursor-move pointer-events-auto group"
                    style={{
                      left: `${cropPctLeft}%`,
                      top: `${cropPctTop}%`,
                      width: `${cropPctWidth}%`,
                      height: `${cropPctHeight}%`
                    }}
                    onPointerDown={(e) => handleCropPointerDown(e, 'move')}
                  >
                    {/* Rule of Thirds Grid Guidelines */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                      <div className="border-r border-b border-white/60" />
                      <div className="border-r border-b border-white/60" />
                      <div className="border-b border-white/60" />
                      <div className="border-r border-b border-white/60" />
                      <div className="border-r border-b border-white/60" />
                      <div className="border-b border-white/60" />
                      <div className="border-r border-b border-white/60" />
                      <div className="border-r border-b border-white/60" />
                      <div />
                    </div>

                    {/* Central Pan / Move Badge for effortless dragging */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
                      <div className="bg-slate-950/80 text-amber-300 px-2.5 py-1 rounded-full border border-amber-400/50 text-[9px] font-black tracking-wider uppercase flex items-center gap-1 shadow-lg">
                        <Move size={10} />
                        <span>Pan Box</span>
                      </div>
                    </div>

                    {/* 4 Corner Drag Handles (with prominent bottom corner emphasis) */}
                    {/* Top-Left */}
                    <div
                      className="absolute -top-3 -left-3 w-6 h-6 bg-amber-400 border-2 border-slate-950 rounded-full cursor-nwse-resize shadow-lg flex items-center justify-center transition-transform hover:scale-125 z-40"
                      onPointerDown={(e) => handleCropPointerDown(e, 'tl')}
                      title="Adjust Top-Left"
                    >
                      <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
                    </div>

                    {/* Top-Right */}
                    <div
                      className="absolute -top-3 -right-3 w-6 h-6 bg-amber-400 border-2 border-slate-950 rounded-full cursor-nesw-resize shadow-lg flex items-center justify-center transition-transform hover:scale-125 z-40"
                      onPointerDown={(e) => handleCropPointerDown(e, 'tr')}
                      title="Adjust Top-Right"
                    >
                      <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
                    </div>

                    {/* Bottom-Left (Adjustable Corner) */}
                    <div
                      className="absolute -bottom-3 -left-3 w-7 h-7 bg-amber-400 border-2 border-slate-950 rounded-full cursor-nesw-resize shadow-xl flex items-center justify-center transition-transform hover:scale-125 ring-2 ring-amber-400/40 z-40"
                      onPointerDown={(e) => handleCropPointerDown(e, 'bl')}
                      title="Adjust Bottom-Left Corner"
                    >
                      <div className="w-2 h-2 bg-slate-950 rounded-full" />
                    </div>

                    {/* Bottom-Right (Adjustable Corner) */}
                    <div
                      className="absolute -bottom-3 -right-3 w-7 h-7 bg-amber-400 border-2 border-slate-950 rounded-full cursor-nwse-resize shadow-xl flex items-center justify-center transition-transform hover:scale-125 ring-2 ring-amber-400/40 z-40"
                      onPointerDown={(e) => handleCropPointerDown(e, 'br')}
                      title="Adjust Bottom-Right Corner"
                    >
                      <div className="w-2 h-2 bg-slate-950 rounded-full" />
                    </div>

                    {/* 4 Edge Adjustment Handles */}
                    {/* Top Edge */}
                    <div
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-3 bg-amber-400 border border-slate-950 rounded-full cursor-ns-resize shadow-md flex items-center justify-center hover:scale-110 z-35"
                      onPointerDown={(e) => handleCropPointerDown(e, 't')}
                      title="Adjust Top Edge"
                    />

                    {/* Bottom Edge (Adjustable Bottom Edge) */}
                    <div
                      className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-12 h-3.5 bg-amber-400 border-2 border-slate-950 rounded-full cursor-ns-resize shadow-lg flex items-center justify-center hover:scale-110 ring-1 ring-amber-300 z-35"
                      onPointerDown={(e) => handleCropPointerDown(e, 'b')}
                      title="Adjust Bottom Edge"
                    />

                    {/* Left Edge */}
                    <div
                      className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-10 bg-amber-400 border border-slate-950 rounded-full cursor-ew-resize shadow-md flex items-center justify-center hover:scale-110 z-35"
                      onPointerDown={(e) => handleCropPointerDown(e, 'l')}
                      title="Adjust Left Edge"
                    />

                    {/* Right Edge */}
                    <div
                      className="absolute -right-2 top-1/2 -translate-y-1/2 w-3 h-10 bg-amber-400 border border-slate-950 rounded-full cursor-ew-resize shadow-md flex items-center justify-center hover:scale-110 z-35"
                      onPointerDown={(e) => handleCropPointerDown(e, 'r')}
                      title="Adjust Right Edge"
                    />

                  </div>
                </div>
              )}
            </div>
          )}

          {/* Floating Zoom & Centering Controls in Canvas bottom-left */}
          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-slate-800 text-slate-400 shadow-xl z-50">
            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))}
              className="p-1 hover:text-white cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <span className="text-[10px] font-mono font-bold text-amber-300 w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
              className="p-1 hover:text-white cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="p-1 hover:text-white cursor-pointer ml-1 border-l border-slate-700 pl-2"
              title="Reset Zoom to 100%"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400 animate-pulse shrink-0" />
            <span>
              {activeMode === 'draw'
                ? "Tip: Use Precision Pen, Arrows, or Circle tools to mark claw tips and bench specs."
                : "Tip: Drag the corner or bottom handles to resize crop area, or drag inside the box to pan."}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndExport}
              disabled={isProcessing}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Save & Attach Photo
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
