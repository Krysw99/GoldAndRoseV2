import React, { useState, useEffect } from 'react';
import { TROY_ONCE_GRAMS } from '../constants';

interface SpotPriceViewProps {
  spotPrices: { gold: number; silver: number; platinum: number };
  onUpdateSpotPrices: (spot: { gold: number; silver: number; platinum: number }) => void;
  syncStatus: string | null;
  onFetchLivePrices: () => void;
}

export default function SpotPriceView({
  spotPrices,
  onUpdateSpotPrices,
  syncStatus,
  onFetchLivePrices
}: SpotPriceViewProps) {
  const [purityKey, setPurityKey] = useState('gold-14');
  const [grams, setGrams] = useState('10');
  const [estimatedCost, setEstimatedCost] = useState(0);

  const bg = spotPrices.gold / TROY_ONCE_GRAMS;
  const bs = spotPrices.silver / TROY_ONCE_GRAMS;
  const bp = spotPrices.platinum / TROY_ONCE_GRAMS;

  useEffect(() => {
    const w = parseFloat(grams) || 0;
    if (w <= 0) {
      setEstimatedCost(0);
      return;
    }

    const [metal, levelStr] = purityKey.split('-');
    const level = parseFloat(levelStr);

    let pricePerGram = 0;
    if (metal === 'gold') {
      pricePerGram = bg * (level / 24);
    } else if (metal === 'silver') {
      pricePerGram = bs * level;
    } else if (metal === 'platinum') {
      pricePerGram = bp * level;
    }

    setEstimatedCost(w * pricePerGram);
  }, [purityKey, grams, bg, bs, bp]);

  return (
    <div className="p-4 md:p-8 bg-white rounded-b-2xl rounded-tr-2xl shadow-lg border border-brand-100 space-y-6 animate-fadeIn">
      {/* Metrics Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-brand-100 pb-4 gap-4">
        <div>
          <h2 className="text-sm font-black text-brand-900 uppercase tracking-wider mb-1">
            Live System Metrics & Desk Settings
          </h2>
          <p className="text-xs text-brand-500">
            View live financial indices for Gold, Silver, and Platinum, or manage custom spot desk configurations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-brand-400 font-bold font-mono">
            Last Sync: {syncStatus || 'Pending Sync'}
          </span>
          <button
            type="button"
            onClick={onFetchLivePrices}
            className="text-xs bg-brand-900 text-brand-gold px-4 py-2.5 rounded-xl font-bold hover:bg-brand-950 shadow-md transition-all border border-brand-800"
          >
            Sync Market Rate
          </button>
        </div>
      </div>

      {/* Modify Feed Anchors */}
      <div>
        <h3 className="text-[10px] font-bold text-brand-500 uppercase tracking-widest pl-1 mb-2">
          Modify Raw Feed Anchors (per Oz)
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

      {/* Matrices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gold Matrix */}
        <div className="bg-brand-50 p-5 rounded-2xl border border-brand-100 space-y-4">
          <h3 className="text-xs font-black text-brand-800 uppercase tracking-widest border-b border-brand-200 pb-2">
            Gold Matrix (per gram)
          </h3>
          <div className="space-y-2 font-mono text-xs">
            {[10, 14, 18, 19, 22, 24].map((k) => {
              const pure = k / 24;
              const scrap = bg * pure * 0.85;
              const raw = bg * pure;
              return (
                <div key={k} className="flex justify-between items-center py-1.5 border-b border-brand-200/50">
                  <span>{k}K Gold</span>
                  <div className="text-right">
                    <span className="text-brand-500 text-[10px] mr-2">Scrap: ${scrap.toFixed(2)}</span>
                    <span className="font-bold text-brand-900">Raw: ${raw.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Silver Matrix */}
        <div className="bg-brand-50 p-5 rounded-2xl border border-brand-100 space-y-4">
          <h3 className="text-xs font-black text-brand-800 uppercase tracking-widest border-b border-brand-200 pb-2">
            Silver Matrix (per gram)
          </h3>
          <div className="space-y-2 font-mono text-xs">
            {[0.925, 0.999].map((p) => {
              const scrap = bs * p * 0.85;
              const raw = bs * p;
              return (
                <div key={p} className="flex justify-between items-center py-1.5 border-b border-brand-200/50">
                  <span>{(p * 100).toFixed(1)}% Silver</span>
                  <div className="text-right">
                    <span className="text-brand-500 text-[10px] mr-2">Scrap: ${scrap.toFixed(2)}</span>
                    <span className="font-bold text-brand-900">Raw: ${raw.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Platinum Matrix */}
        <div className="bg-brand-50 p-5 rounded-2xl border border-brand-100 space-y-4">
          <h3 className="text-xs font-black text-brand-800 uppercase tracking-widest border-b border-brand-200 pb-2">
            Platinum Matrix (per gram)
          </h3>
          <div className="space-y-2 font-mono text-xs">
            {[0.950, 0.999].map((p) => {
              const scrap = bp * p * 0.85;
              const raw = bp * p;
              return (
                <div key={p} className="flex justify-between items-center py-1.5 border-b border-brand-200/50">
                  <span>{(p * 100).toFixed(1)}% Plat</span>
                  <div className="text-right">
                    <span className="text-brand-500 text-[10px] mr-2">Scrap: ${scrap.toFixed(2)}</span>
                    <span className="font-bold text-brand-900">Raw: ${raw.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Estimator Card */}
      <div className="bg-brand-900 text-white p-6 rounded-2xl shadow-xl border border-brand-800">
        <h3 className="text-brand-gold uppercase tracking-widest text-xs font-bold mb-4">
          Quick Raw Metal Estimator
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-[10px] font-bold text-brand-300 uppercase block mb-1">
              Metal & Purity
            </label>
            <select
              value={purityKey}
              onChange={(e) => setPurityKey(e.target.value)}
              className="w-full p-2.5 bg-brand-800 border border-brand-700 rounded-lg text-white font-bold text-xs"
            >
              <option value="gold-10">Gold 10k (41.7%)</option>
              <option value="gold-14">Gold 14k (58.3%)</option>
              <option value="gold-18">Gold 18k (75.0%)</option>
              <option value="gold-19">Gold 19k (79.2%)</option>
              <option value="gold-22">Gold 22k (91.7%)</option>
              <option value="gold-24">Gold 24k (99.9%)</option>
              <option value="silver-0.925">Silver Sterling (92.5%)</option>
              <option value="silver-0.999">Silver Pure (99.9%)</option>
              <option value="platinum-0.95">Platinum 950 (95.0%)</option>
              <option value="platinum-0.999">Platinum Pure (99.9%)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-brand-300 uppercase block mb-1">
              Weight in Grams
            </label>
            <input
              type="number"
              className="w-full p-2.5 bg-brand-800 border border-brand-700 rounded-lg text-white font-bold text-xs no-spinner"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
            />
          </div>
          <div className="p-3 bg-brand-950 rounded-xl border border-brand-800 flex justify-between items-center">
            <span className="text-brand-400 text-[10px] font-bold uppercase">Estimated Raw Cost:</span>
            <span className="text-brand-gold font-bold font-mono text-sm">${estimatedCost.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
