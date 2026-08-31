/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Check } from 'lucide-react';

interface SignaturePadProps {
  initialSignature: string | null;
  onSave: (signatureDataUrl: string) => void;
  onClear: () => void;
}

export default function SignaturePad({ initialSignature, onSave, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(!!initialSignature);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const midPosRef = useRef<{ x: number; y: number } | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Resize canvas to container width
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { desynchronized: true });
    if (!ctx) return;

    // Set high DPI scale
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.parentElement?.clientWidth || 300;
    const height = rect.height || canvas.parentElement?.clientHeight || 144;
    canvas.width = width;
    canvas.height = height;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1c120c'; // Luxury Atelier Espresso dark stroke

    // Draw initial signature if any
    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = initialSignature;
    }
  }, [initialSignature]);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.cancelable) e.preventDefault();

    // Ignore hovering S-Pen before touching glass
    if (e.pointerType === 'pen' && e.buttons === 0 && e.pressure === 0) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1c120c';
    ctx.fillStyle = '#1c120c';
    ctx.lineWidth = 2.5;

    // Immediate dot on touchdown
    ctx.beginPath();
    ctx.arc(x, y, 1.25, 0, Math.PI * 2);
    ctx.fill();

    isDrawingRef.current = true;
    setIsDrawing(true);
    lastPosRef.current = { x, y };
    midPosRef.current = { x, y };

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture fallback
    }
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    if (e.cancelable) e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    
    // Coalesced hardware events for 120Hz/240Hz stylus fluidity
    const rawEvents: Array<{ clientX: number; clientY: number }> = [];
    const native = e.nativeEvent as unknown as { getCoalescedEvents?: () => PointerEvent[] };
    if (native && typeof native.getCoalescedEvents === 'function') {
      const coalesced = native.getCoalescedEvents();
      if (coalesced && coalesced.length > 0) {
        for (let i = 0; i < coalesced.length; i++) rawEvents.push(coalesced[i]);
      }
    }
    if (rawEvents.length === 0) rawEvents.push(e);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1c120c';
    ctx.lineWidth = 2.5;

    for (const ev of rawEvents) {
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const pt = { x, y };
      const last = lastPosRef.current || pt;

      const dX = x - last.x;
      const dY = y - last.y;
      if (dX * dX + dY * dY < 0.1) continue;

      const startMid = midPosRef.current || last;
      const endMid = { x: (last.x + x) / 2, y: (last.y + y) / 2 };

      ctx.beginPath();
      ctx.moveTo(startMid.x, startMid.y);
      ctx.quadraticCurveTo(last.x, last.y, endMid.x, endMid.y);
      ctx.stroke();

      lastPosRef.current = pt;
      midPosRef.current = endMid;
    }

    setHasSigned(true);
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx && lastPosRef.current && midPosRef.current) {
        ctx.beginPath();
        ctx.moveTo(midPosRef.current.x, midPosRef.current.y);
        ctx.quadraticCurveTo(lastPosRef.current.x, lastPosRef.current.y, lastPosRef.current.x, lastPosRef.current.y);
        ctx.stroke();
      }

      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture fallback
      }
      
      lastPosRef.current = null;
      midPosRef.current = null;

      // Trigger save on mouse/touch up
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    onClear();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative border-2 border-dashed border-brand-200 rounded-xl bg-brand-50/50 overflow-hidden h-36">
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
        />
        {!hasSigned && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-brand-400 font-medium">
            Draw customer signature here
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1 text-xs text-red-500 font-bold hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-red-100 transition-colors"
        >
          <Trash2 size={13} />
          Clear Signature
        </button>
      </div>
    </div>
  );
}
