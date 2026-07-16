/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Camera, Shield, DollarSign, Scale, ArrowRight, Printer } from 'lucide-react';
import { ScrapItem, MaterialType, ScrapTransaction } from '../types';
import { PURITY_OPTIONS, TROY_ONCE_GRAMS } from '../constants';
import { calculateScrapItemValue, calculateScrapTotal } from '../utils';
import { printElement } from '../utils/printHelper';
import SignaturePad from './SignaturePad';

interface ScrapCalculatorProps {
  spotPrices: { gold: number; silver: number; platinum: number };
  onUpdateSpotPrices: (spot: { gold: number; silver: number; platinum: number }) => void;
  onSaveTransaction: (
    data: {
      name: string;
      phone: string;
      address: string;
      driversLicense: string;
      stoneRemovalQty: string;
      items: ScrapItem[];
      image: string | null;
      signature: string | null;
    },
    existingId?: string
  ) => ScrapTransaction;
  syncStatus: string | null;
  onFetchLivePrices: () => void;
  editingTransaction?: ScrapTransaction | null;
  onCancelEdit?: () => void;
  onTriggerPrint?: (printFn: () => void) => void;
  isIframe?: boolean;
}

export default function ScrapCalculator({ 
  spotPrices, 
  onUpdateSpotPrices,
  onSaveTransaction,
  syncStatus,
  onFetchLivePrices,
  editingTransaction,
  onCancelEdit,
  onTriggerPrint,
  isIframe
}: ScrapCalculatorProps) {
  // Scrap State
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [driversLicense, setDriversLicense] = useState('');
  const [stoneRemovalQty, setStoneRemovalQty] = useState('');
  const [scrapImage, setScrapImage] = useState<string | null>(null);
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);
  
  // Crop & Lightbox States
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropState, setCropState] = useState({ x: 10, y: 15, w: 80, h: 70 }); // percentages
  const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
  const [dragStart, setDragStart] = useState<{ clientX: number; clientY: number; x: number; y: number; w: number; h: number } | null>(null);
  const [enlargeImage, setEnlargeImage] = useState<string | null>(null);
  const cropContainerRef = React.useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<ScrapItem[]>([
    { weight: '', material: 'gold', purity: 14, rate: 85 }
  ]);

  useEffect(() => {
    if (editingTransaction) {
      setCustomerName(editingTransaction.name || '');
      setPhoneNumber(editingTransaction.phone || '');
      setAddress(editingTransaction.address || '');
      setDriversLicense(editingTransaction.driversLicense || '');
      setStoneRemovalQty(editingTransaction.stoneRemovalQty || '');
      setScrapImage(editingTransaction.image || null);
      setCustomerSignature(editingTransaction.signature || null);
      setItems(editingTransaction.items && editingTransaction.items.length > 0 ? editingTransaction.items : [{ weight: '', material: 'gold', purity: 14, rate: 85 }]);
    } else {
      setCustomerName('');
      setPhoneNumber('');
      setAddress('');
      setDriversLicense('');
      setStoneRemovalQty('');
      setScrapImage(null);
      setCustomerSignature(null);
      setItems([{ weight: '', material: 'gold', purity: 14, rate: 85 }]);
    }
  }, [editingTransaction]);

  // Handle crop container mouse/touch dragging
  useEffect(() => {
    if (!dragMode || !dragStart || !cropContainerRef.current) return;

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      const container = cropContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const dx = ((clientX - dragStart.clientX) / rect.width) * 100;
      const dy = ((clientY - dragStart.clientY) / rect.height) * 100;

      if (dragMode === 'move') {
        let newX = dragStart.x + dx;
        let newY = dragStart.y + dy;
        newX = Math.max(0, Math.min(100 - dragStart.w, newX));
        newY = Math.max(0, Math.min(100 - dragStart.h, newY));
        setCropState(prev => ({ ...prev, x: newX, y: newY }));
      } else if (dragMode === 'resize') {
        let newW = dragStart.w + dx;
        let newH = dragStart.h + dy;
        newW = Math.max(10, Math.min(100 - dragStart.x, newW));
        newH = Math.max(10, Math.min(100 - dragStart.y, newH));
        setCropState(prev => ({ ...prev, w: newW, h: newH }));
      }
    };

    const handleDragEnd = () => {
      setDragMode(null);
      setDragStart(null);
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [dragMode, dragStart]);

  // Handle adding rows
  const addRow = () => {
    setItems(prev => [...prev, { weight: '', material: 'gold', purity: 14, rate: 85 }]);
  };

  const removeRow = (idx: number) => {
    if (items.length <= 1) {
      setItems([{ weight: '', material: 'gold', purity: 14, rate: 85 }]);
    } else {
      setItems(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const updateItem = (idx: number, field: keyof ScrapItem, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      
      const updated = { ...item, [field]: value };
      
      // If material changes, set sensible default purity
      if (field === 'material') {
        const mat = value as MaterialType;
        updated.purity = mat === 'gold' ? 14 : (mat === 'silver' ? 0.925 : 0.950);
      }
      
      return updated;
    }));
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, mode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragMode(mode);
    setDragStart({
      clientX,
      clientY,
      x: cropState.x,
      y: cropState.y,
      w: cropState.w,
      h: cropState.h
    });
  };

  // Image Upload - Open Cropper Modal
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setCropImageSrc(src);
      // Reset cropState to default widescreen-aspect box
      setCropState({ x: 10, y: 15, w: 80, h: 70 });
      setIsCropModalOpen(true);
      // Reset input value so same file can be uploaded again if needed
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  // Execute actual high-resolution crop on the natural image dimensions
  const handleSaveCrop = () => {
    if (!cropImageSrc) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // Calculate crop dimensions relative to real high-res original size
      const sourceX = (cropState.x / 100) * img.naturalWidth;
      const sourceY = (cropState.y / 100) * img.naturalHeight;
      const sourceWidth = (cropState.w / 100) * img.naturalWidth;
      const sourceHeight = (cropState.h / 100) * img.naturalHeight;

      // Output optimized for storage: cap maximum dimension at 600px
      const maxOutputDim = 600;
      let targetWidth = sourceWidth;
      let targetHeight = sourceHeight;
      
      if (targetWidth > maxOutputDim || targetHeight > maxOutputDim) {
        if (targetWidth > targetHeight) {
          targetHeight = (maxOutputDim / targetWidth) * targetHeight;
          targetWidth = maxOutputDim;
        } else {
          targetWidth = (maxOutputDim / targetHeight) * targetWidth;
          targetHeight = maxOutputDim;
        }
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          targetWidth,
          targetHeight
        );
        
        // Output as highly optimized JPEG at 0.6 quality to keep within storage caps
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setScrapImage(croppedDataUrl);
        setIsCropModalOpen(false);
      }
    };
    img.src = cropImageSrc;
  };

  const scrapTotal = calculateScrapTotal(items, spotPrices, stoneRemovalQty);

  const handleSave = (shouldPrint: boolean = false) => {
    if (!customerName.trim()) {
      alert("Please enter customer name to log the buyback.");
      return;
    }
    const activeItems = items.filter(i => Number(i.weight) > 0);
    if (activeItems.length === 0) {
      alert("Please enter weights for at least one item.");
      return;
    }

    const savedTx = onSaveTransaction({
      name: customerName,
      phone: phoneNumber,
      address,
      driversLicense,
      stoneRemovalQty,
      items: activeItems,
      image: scrapImage,
      signature: customerSignature
    }, editingTransaction?.id);

    const resetForm = () => {
      if (!editingTransaction) {
        setCustomerName('');
        setPhoneNumber('');
        setAddress('');
        setDriversLicense('');
        setStoneRemovalQty('');
        setScrapImage(null);
        setCustomerSignature(null);
        setItems([{ weight: '', material: 'gold', purity: 14, rate: 85 }]);
      }
    };

    if (shouldPrint && savedTx) {
      if (isIframe && onTriggerPrint) {
        onTriggerPrint(() => {
          printElement('scrap-receipt-box');
          resetForm();
        });
      } else {
        printElement('scrap-receipt-box');
        resetForm();
      }
    } else {
      resetForm();
    }
  };

  return (
    <>
      <div className="p-4 md:p-8 bg-white rounded-b-2xl rounded-tr-2xl shadow-lg border border-brand-100 space-y-8 animate-fadeIn print:hidden">
      {editingTransaction && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-800 font-bold text-xs uppercase font-mono">ADJUSTING MODE</span>
            <div>
              <p className="text-xs font-bold text-brand-900">Adjusting Scrap Buyback Record</p>
              <p className="text-[10px] text-brand-500 font-mono">Transaction ID: {editingTransaction.id} (Original Date: {editingTransaction.date})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* 1. Final Cash Offer Card */}
      <div className="relative bg-brand-900 rounded-[2rem] py-10 px-6 shadow-2xl text-center border border-brand-800 overflow-hidden">
        <div className="absolute right-5 top-5 flex items-center gap-2">
          {syncStatus && (
            <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest bg-green-900/30 border border-green-800 px-2 py-1.5 rounded-md">
              ✓ {syncStatus}
            </span>
          )}
          <button
            type="button"
            onClick={onFetchLivePrices}
            className="text-xs bg-brand-800 text-brand-gold px-4 py-2 rounded-xl font-bold hover:bg-brand-700 shadow-md transition-all border border-brand-700"
          >
            Sync Market Rate
          </button>
        </div>
        <h3 className="text-brand-400 uppercase tracking-[0.2em] text-[10px] font-bold mt-4">
          Final Cash Offer (CAD)
        </h3>
        <p id="scrap-grand-total" className="text-6xl md:text-7xl font-black text-brand-gold tracking-tighter mt-2 drop-shadow-md">
          ${scrapTotal.toFixed(2)}
        </p>
      </div>

      {/* 2. Live Feed Anchors Grid */}
      <div>
        <h3 className="text-[10px] font-bold text-brand-500 uppercase tracking-widest pl-1 mb-2">
          Live Feed Anchors (per Oz)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['gold', 'silver', 'platinum'] as const).map((m) => (
            <div key={m} className="bg-white p-3 rounded-xl border border-brand-200 shadow-sm">
              <label className="text-[10px] font-bold text-brand-500 uppercase block mb-1">
                {m}
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded-lg font-bold bg-brand-50 text-brand-900 text-sm no-spinner shadow-sm"
                value={spotPrices[m]}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  onUpdateSpotPrices({ ...spotPrices, [m]: val });
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Client Intake Block */}
      <div className="bg-brand-50 p-5 rounded-2xl border border-brand-200 space-y-4">
        <div className="flex justify-between items-center border-b border-brand-200 pb-2">
          <h3 className="text-xs font-bold text-brand-600 uppercase tracking-widest">
            Client Intake
          </h3>
          <div className="flex items-center gap-4">
            <label className="cursor-pointer text-xs bg-brand-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-brand-900 transition-colors flex items-center gap-1.5 shadow-sm">
              <Camera size={14} className="text-brand-gold" />
              {scrapImage ? 'Retake ID' : 'Scan ID'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
            {scrapImage && (
              <div className="relative border border-brand-200 rounded-xl overflow-hidden shadow-md group cursor-pointer flex items-center">
                <img 
                  src={scrapImage} 
                  alt="ID attachment" 
                  className="h-10 w-20 object-cover transition-transform hover:scale-105" 
                  onClick={() => setEnlargeImage(scrapImage)}
                  title="Click to enlarge"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setScrapImage(null);
                  }}
                  className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700 shadow-lg text-[8px] leading-none w-3.5 h-3.5 flex items-center justify-center font-bold z-10"
                  title="Remove attachment"
                >
                  &times;
                </button>
                {cropImageSrc && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCropModalOpen(true);
                    }}
                    className="absolute bottom-0.5 left-0.5 right-0.5 bg-brand-gold/90 text-brand-950 font-bold rounded text-[8px] hover:bg-brand-gold py-0.5 text-center shadow border border-brand-200"
                    title="Recrop photograph"
                  >
                    CROP
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Full Name"
            className="border p-3 rounded-xl text-sm shadow-sm"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <input
            type="tel"
            placeholder="Phone Number"
            className="border p-3 rounded-xl text-sm shadow-sm"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <input
            type="text"
            placeholder="Full Address"
            className="border p-3 rounded-xl text-sm md:col-span-2 shadow-sm"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <input
            type="text"
            placeholder="Driver's License / ID"
            className="border p-3 rounded-xl text-sm shadow-sm"
            value={driversLicense}
            onChange={(e) => setDriversLicense(e.target.value)}
          />
          <div className="flex items-center border p-2 rounded-xl bg-white shadow-sm">
            <span className="text-[10px] font-bold text-brand-500 uppercase px-2">
              Stone Removal (-$5):
            </span>
            <input
              type="number"
              className="w-full text-sm font-bold text-red-600 no-spinner"
              value={stoneRemovalQty}
              onChange={(e) => setStoneRemovalQty(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 4. Items List Rows */}
      <div className="bg-brand-100/50 p-4 rounded-2xl border border-brand-200 space-y-3">
        {items.map((item, idx) => {
          const rowValue = calculateScrapItemValue(item, spotPrices);
          return (
            <div
              key={idx}
              className="grid grid-cols-1 md:grid-cols-[1.5fr_1.5fr_1.5fr_1fr_auto_auto] gap-3 items-center bg-white p-3 rounded-xl border shadow-sm"
            >
              <div className="flex flex-col">
                <label className="text-[8px] font-bold text-brand-400 uppercase md:hidden mb-0.5">Mass (g)</label>
                <input
                  type="number"
                  placeholder="Mass (g)"
                  className="border p-2.5 rounded-lg text-sm font-bold no-spinner"
                  value={item.weight}
                  onChange={(e) => updateItem(idx, 'weight', e.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[8px] font-bold text-brand-400 uppercase md:hidden mb-0.5">Metal</label>
                <select
                  className="border p-2.5 rounded-lg text-sm font-bold bg-brand-50"
                  value={item.material}
                  onChange={(e) => updateItem(idx, 'material', e.target.value as MaterialType)}
                >
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                  <option value="platinum">Platinum</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[8px] font-bold text-brand-400 uppercase md:hidden mb-0.5">Purity</label>
                <select
                  className="border p-2.5 rounded-lg text-sm font-bold bg-brand-50"
                  value={item.purity}
                  onChange={(e) => updateItem(idx, 'purity', parseFloat(e.target.value))}
                >
                  {PURITY_OPTIONS[item.material].map((p) => (
                    <option key={p} value={p}>
                      {item.material === 'gold' ? `${p}k` : `${(p * 100).toFixed(1)}%`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[8px] font-bold text-brand-400 uppercase md:hidden mb-0.5">Rate %</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    className="border p-2.5 rounded-lg text-sm font-bold w-full text-center"
                    value={item.rate}
                    onChange={(e) => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-xs font-bold text-brand-400">%</span>
                </div>
              </div>
              <div className="text-sm font-black text-brand-900 pr-2 text-right flex items-center justify-end">
                <span className="md:hidden text-[8px] text-brand-400 uppercase mr-1">Sum:</span>
                ${rowValue.toFixed(2)}
              </div>
              <button
                type="button"
                onClick={() => removeRow(idx)}
                className="text-red-400 font-bold px-2 hover:text-red-600 text-lg hover:bg-red-50 rounded"
              >
                &times;
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={addRow}
          className="w-full border-2 border-dashed border-brand-300 py-3 rounded-xl text-brand-600 font-bold text-sm bg-white hover:bg-brand-50 transition-colors"
        >
          + Add Entry
        </button>
      </div>

      {/* 5. Customer Signature */}
      <div className="bg-brand-50 p-5 rounded-2xl border border-brand-200 space-y-3">
        <h3 className="text-xs font-bold text-brand-600 uppercase tracking-widest pl-1">
          Customer Signature Authorization
        </h3>
        <p className="text-[10px] text-brand-500 pl-1">
          By signing below, the customer certifies that they are the legal owner of the items listed above and authorize this payout transaction.
        </p>
        <SignaturePad
          initialSignature={customerSignature}
          onSave={(dataUrl) => setCustomerSignature(dataUrl)}
          onClear={() => setCustomerSignature(null)}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {editingTransaction ? (
          <>
            <button
              type="button"
              onClick={onCancelEdit}
              className="flex-1 bg-brand-100 hover:bg-brand-200 text-brand-800 font-bold text-sm tracking-widest uppercase py-4 rounded-xl transition-colors cursor-pointer"
            >
              Cancel Adjust
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black text-sm tracking-widest uppercase py-4 rounded-xl shadow-md transition-colors cursor-pointer"
            >
              Save Adjusted Buyback
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="flex-1 bg-brand-800 hover:bg-brand-900 text-brand-gold font-black text-sm tracking-widest uppercase py-4 rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Printer size={16} />
              Save & Print Payout Log
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="flex-1 bg-brand-100 hover:bg-brand-200 text-brand-800 font-bold text-sm tracking-widest uppercase py-4 rounded-xl transition-colors cursor-pointer"
            >
              Commit Payout Log
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="flex-1 bg-brand-800 text-brand-gold hover:bg-brand-900 font-black text-sm tracking-widest uppercase py-4 rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Printer size={16} />
              Commit & Print Payout Log
            </button>
          </>
        )}
      </div>
    </div>

    {/* Print-only container */}
    <div id="scrap-receipt-box" className="hidden print:block bg-white text-brand-800 text-left font-sans w-full p-4">
      <div className="max-w-xl mx-auto">
        {/* Header info */}
        <div className="flex justify-between items-start border-b border-brand-900 pb-4 mb-6">
          <div>
            <h1 className="font-serif text-2xl font-black italic tracking-wide text-brand-900 mb-0.5">Gold And Rose Jewellery Corp</h1>
            <p className="text-[10px] text-brand-500 font-bold uppercase tracking-wider">James Lee • 604-250-7414</p>
            <p className="text-[8px] text-brand-400 font-mono mt-0.5">GST/HST: 737186213RT0001</p>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-black uppercase tracking-widest text-brand-400">Buyback Receipt</h2>
            <p className="text-[10px] font-bold text-brand-800 mt-0.5">
              {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            <p className="text-[8px] font-mono text-brand-400">Ref: #{editingTransaction?.id || 'NEW'}</p>
          </div>
        </div>

        {/* Customer Details */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
          <div className="bg-brand-50 p-3 rounded-xl border border-brand-100">
            <p className="text-[9px] uppercase font-black text-brand-400 tracking-wider mb-1">Client Details</p>
            <p className="font-bold text-brand-900">{customerName || 'N/A'}</p>
            {phoneNumber && (
              <p className="text-brand-600 mt-0.5">{phoneNumber}</p>
            )}
            {address && (
              <p className="text-brand-500 mt-0.5 leading-relaxed">{address}</p>
            )}
            {driversLicense && (
              <p className="text-[9px] text-brand-400 mt-1 font-mono">ID: {driversLicense}</p>
            )}
          </div>
          <div className="bg-green-50/50 p-3 rounded-xl border border-green-100 text-right flex flex-col justify-center">
            <p className="text-[9px] uppercase font-black text-green-700 tracking-wider mb-1">Total Payout Paid (CAD)</p>
            <p className="text-2xl font-black text-green-600">${scrapTotal.toFixed(2)}</p>
          </div>
        </div>

        {/* Items list */}
        <div className="space-y-4 mb-6">
          <div>
            <p className="text-[10px] uppercase font-black text-brand-500 tracking-widest border-b border-brand-100 pb-1 mb-2">Verified Items Received</p>
            <div className="bg-brand-50/50 p-3 rounded-xl border border-brand-100/50 text-xs text-brand-700 space-y-1.5 leading-relaxed">
              {items.filter(i => Number(i.weight) > 0).map((it, idx) => {
                const val = calculateScrapItemValue(it, spotPrices);
                return (
                  <div key={idx} className="flex justify-between items-center border-b border-dashed border-brand-100 pb-1.5 last:border-none last:pb-0">
                    <span>
                      {it.weight}g {it.material} ({it.purity}{it.material === 'gold' ? 'k' : ''}) @ {it.rate}% payout rate
                    </span>
                    <span className="font-bold text-brand-900 font-mono">${val.toFixed(2)}</span>
                  </div>
                );
              })}
              {Number(stoneRemovalQty) > 0 && (
                <div className="flex justify-between items-center text-red-600 pt-1">
                  <span>Stone extraction fee ({stoneRemovalQty} stones)</span>
                  <span className="font-bold font-mono">-${(Number(stoneRemovalQty) * 5).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Snapshot of Driver's license / items if available */}
        {scrapImage && (
          <div className="mb-6 print:mb-8 break-inside-avoid">
            <p className="text-[10px] uppercase font-black text-brand-400 tracking-wider mb-2 print:text-[8px] print:text-brand-500">Verified ID Photograph</p>
            <img 
              src={scrapImage} 
              alt="Compliance photo" 
              className="h-28 w-44 object-contain rounded-xl border border-brand-200 shadow-sm cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all print:h-80 print:w-auto print:max-w-xl print:rounded-lg print:border print:border-brand-150 print:shadow-none" 
              onClick={() => setEnlargeImage(scrapImage)}
              title="Click to enlarge"
            />
          </div>
        )}

        {/* Sign-off terms */}
        <div className="border-t border-brand-200 pt-5 text-center space-y-4">
          <p className="text-[8px] text-brand-400 italic leading-relaxed font-sans">
            I declare that I am the legal owner of the scrap items presented above and have full right to transact and sell them to Gold & Rose Jewellery Corp. All buyout transactions are absolute and final.
          </p>
          <div className="flex flex-col items-center justify-center font-sans">
            {customerSignature ? (
              <div className="h-16 w-40 flex items-center justify-center relative overflow-hidden mb-1">
                <img 
                  src={customerSignature} 
                  alt="Client signature" 
                  className="max-h-16 max-w-full object-contain filter brightness-95" 
                />
              </div>
            ) : (
              <div className="h-12"></div>
            )}
            <div className="w-40 border-b border-brand-300"></div>
            <p className="text-[8px] uppercase tracking-wider text-brand-500 mt-1">Client Authorization Signature</p>
          </div>
        </div>
      </div>
    </div>

    {/* 4. Interactive ID Photograph Cropper Modal */}
    {isCropModalOpen && cropImageSrc && (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4 animate-fadeIn font-sans">
        <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-brand-100 flex flex-col max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center border-b border-brand-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-black uppercase text-brand-900 tracking-wider">
                Crop Verified ID Photograph
              </h3>
              <p className="text-[10px] text-brand-500 mt-0.5">
                Drag the box and corner handle to adjust. The final image will save in high-resolution for legibility.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCropModalOpen(false)}
              className="text-brand-400 hover:text-brand-600 font-bold text-lg cursor-pointer"
            >
              &times;
            </button>
          </div>

          {/* Draggable Viewport Container */}
          <div className="flex-1 flex items-center justify-center bg-slate-900 rounded-2xl p-4 min-h-[300px] overflow-hidden">
            <div 
              ref={cropContainerRef} 
              className="relative inline-block mx-auto max-h-[50vh] max-w-full overflow-hidden select-none border border-brand-gold/30 rounded-xl bg-slate-950 shadow-inner"
            >
              <img 
                src={cropImageSrc} 
                alt="Source to crop" 
                className="max-h-[50vh] block object-contain pointer-events-none"
              />
              
              {/* Dark Mask overlays for the cropped areas */}
              <div 
                className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none" 
                style={{ width: `${cropState.x}%` }}
              />
              <div 
                className="absolute top-0 bottom-0 right-0 bg-black/60 pointer-events-none" 
                style={{ left: `${cropState.x + cropState.w}%` }}
              />
              <div 
                className="absolute top-0 bg-black/60 pointer-events-none" 
                style={{ 
                  left: `${cropState.x}%`, 
                  width: `${cropState.w}%`, 
                  height: `${cropState.y}%` 
                }}
              />
              <div 
                className="absolute bottom-0 bg-black/60 pointer-events-none" 
                style={{ 
                  left: `${cropState.x}%`, 
                  width: `${cropState.w}%`, 
                  top: `${cropState.y + cropState.h}%` 
                }}
              />

              {/* Draggable Selection Box */}
              <div
                className="absolute cursor-move border-2 border-dashed border-brand-gold shadow-[0_0_0_1px_rgba(0,0,0,0.6),_inset_0_0_16px_rgba(212,175,55,0.4)]"
                style={{
                  left: `${cropState.x}%`,
                  top: `${cropState.y}%`,
                  width: `${cropState.w}%`,
                  height: `${cropState.h}%`
                }}
                onMouseDown={(e) => handleDragStart(e, 'move')}
                onTouchStart={(e) => handleDragStart(e, 'move')}
              >
                {/* Grid Lines */}
                <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                  <div className="w-full border-t border-brand-gold/40" />
                  <div className="h-full border-l border-brand-gold/40 absolute" />
                </div>

                {/* Corner Resize Handle */}
                <div
                  className="absolute bottom-[-8px] right-[-8px] w-5 h-5 bg-brand-gold border-2 border-white rounded-full cursor-se-resize shadow-xl z-20 flex items-center justify-center"
                  onMouseDown={(e) => handleDragStart(e, 'resize')}
                  onTouchStart={(e) => handleDragStart(e, 'resize')}
                >
                  <div className="w-2 h-2 bg-brand-900 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Sliders for Tablet/Mobile Convenience */}
          <div className="space-y-3 bg-brand-50 p-3.5 rounded-2xl border border-brand-200 mt-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-brand-600 font-bold uppercase">
                  <span>X Position</span>
                  <span>{Math.round(cropState.x)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max={Math.max(0, 100 - cropState.w)} 
                  value={cropState.x}
                  onChange={(e) => setCropState(prev => ({ ...prev, x: parseFloat(e.target.value) }))}
                  className="w-full accent-brand-gold h-1.5 bg-brand-200 rounded-lg cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-brand-600 font-bold uppercase">
                  <span>Y Position</span>
                  <span>{Math.round(cropState.y)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max={Math.max(0, 100 - cropState.h)} 
                  value={cropState.y}
                  onChange={(e) => setCropState(prev => ({ ...prev, y: parseFloat(e.target.value) }))}
                  className="w-full accent-brand-gold h-1.5 bg-brand-200 rounded-lg cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-brand-600 font-bold uppercase">
                  <span>Width</span>
                  <span>{Math.round(cropState.w)}%</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max={100 - cropState.x} 
                  value={cropState.w}
                  onChange={(e) => setCropState(prev => ({ ...prev, w: parseFloat(e.target.value) }))}
                  className="w-full accent-brand-gold h-1.5 bg-brand-200 rounded-lg cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-brand-600 font-bold uppercase">
                  <span>Height</span>
                  <span>{Math.round(cropState.h)}%</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max={100 - cropState.y} 
                  value={cropState.h}
                  onChange={(e) => setCropState(prev => ({ ...prev, h: parseFloat(e.target.value) }))}
                  className="w-full accent-brand-gold h-1.5 bg-brand-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Modal actions */}
          <div className="flex justify-end gap-2.5 mt-5 pt-3 border-t border-brand-100">
            <button
              type="button"
              onClick={() => setIsCropModalOpen(false)}
              className="px-4 py-2 border border-brand-200 text-brand-800 text-xs font-bold rounded-xl hover:bg-brand-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveCrop}
              className="px-5 py-2 bg-brand-gold text-brand-950 font-black text-xs uppercase rounded-xl hover:bg-yellow-500 shadow-md cursor-pointer"
            >
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 5. Click-to-Enlarge ID Photograph Lightbox Overlay */}
    {enlargeImage && (
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
            <Printer size={12} className="text-brand-gold" /> Print ID Photo
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
            alt="Enlarged Verified ID Document" 
            className="max-h-[80vh] max-w-full object-contain rounded-xl select-all" 
          />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/75 px-4 py-2 rounded-full border border-white/10 text-[10px] font-bold text-brand-200 shadow tracking-wider uppercase">
            Enlarged Compliance Document View
          </div>
        </div>
      </div>
    )}
  </>
  );
}
