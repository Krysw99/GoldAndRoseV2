import React from 'react';
import { QuoteSession, AppSettings } from '../types';
import { calculateRingCost, hasRingData, getTennisEstimates } from '../utils';
import { FANCY_SHAPES, ROUND_MELEE } from '../constants';
import { Edit3 } from 'lucide-react';

interface ClientInvoicePrintProps {
  session: QuoteSession;
  settings: AppSettings;
  spotPrices: { gold: number; silver: number; platinum: number };
  isWholesale?: boolean;
  containerId?: string;
  dateStr?: string;
  isInteractive?: boolean;
  onChangeSession?: (updater: (prev: QuoteSession) => QuoteSession) => void;
  onOpenPriceOverride?: () => void;
  enlargeImage?: (url: string) => void;
}

export default function ClientInvoicePrint({
  session,
  settings,
  spotPrices,
  isWholesale = false,
  containerId = "quote-client-invoice-box",
  dateStr,
  isInteractive = false,
  onChangeSession,
  onOpenPriceOverride,
  enlargeImage
}: ClientInvoicePrintProps) {
  const effectiveDate = dateStr || new Date().toLocaleDateString();

  // Session Totals Compile
  const compileSessionCost = () => {
    let grossTotal = 0;
    let totalDiscount = 0;
    
    (session.rings || []).forEach(r => {
      if (!hasRingData(r)) return;
      const cost = calculateRingCost(
        r,
        settings,
        spotPrices,
        isWholesale ? 'wholesale' : 'retail',
        session.overridePrices,
        isWholesale ? session.wholesaleProfileId : undefined
      );
      grossTotal += cost;
      
      const val = parseFloat(r.discount) || 0;
      totalDiscount += r.discountType === '%' ? cost * (val / 100) : val;
    });

    const postDiscountTotal = grossTotal - totalDiscount;
    const scrapCredit = Number(session.scrapCredit) || 0;
    const netBeforeTax = postDiscountTotal - scrapCredit;
    const taxableSubtotal = Math.max(0, netBeforeTax);
    const calculatedTax = session.applyTax ? taxableSubtotal * 0.12 : 0;
    const calculatedGrandTotal = netBeforeTax + calculatedTax;

    const isOverridden = typeof session.customGrandTotal === 'number' && !isNaN(session.customGrandTotal) && session.customGrandTotal !== null;
    
    let subtotal = netBeforeTax;
    let tax = 0;
    let grandTotal = calculatedGrandTotal;

    if (isOverridden) {
      const customVal = session.customGrandTotal as number;
      if (session.customGrandTotalIsInclusive) {
        if (session.applyTax) {
          grandTotal = customVal;
          subtotal = customVal / 1.12;
          tax = customVal - subtotal;
        } else {
          grandTotal = customVal;
          subtotal = customVal;
          tax = 0;
        }
      } else {
        subtotal = customVal;
        tax = session.applyTax ? Math.max(0, customVal) * 0.12 : 0;
        grandTotal = subtotal + tax;
      }
    } else {
      subtotal = netBeforeTax;
      tax = session.applyTax ? Math.max(0, netBeforeTax) * 0.12 : 0;
      grandTotal = netBeforeTax + tax;
    }

    return {
      grossTotal,
      totalDiscount,
      postDiscountTotal,
      scrapCredit,
      subtotal,
      tax,
      calculatedGrandTotal,
      isOverridden,
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

    (session.rings || []).filter(r => hasRingData(r)).forEach((r, ri) => {
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

      // 2. Center Stone 2
      if (r.centerStone2?.carats) {
        const qty = 1;
        const source = r.stoneSource === 'customer' ? 'customer' : 'company';
        const totalCarats = parseFloat(r.centerStone2.carats) || 0;
        const shape = r.centerStone2.shape || 'Round';
        const category = 'Center Stone #2';
        const sizeLabel = r.centerStone2.type ? `${r.centerStone2.type} (${r.centerStone2.origin})` : 'Center';

        list.push({ source, category, shape, sizeLabel, qty, totalCarats, pieces: [pNum] });
      }

      // 3. Center Stones Array
      if (Array.isArray(r.centerStones)) {
        r.centerStones.forEach((cs, csIdx) => {
          if (!cs.carats) return;
          const qty = 1;
          const source = r.stoneSource === 'customer' ? 'customer' : 'company';
          const totalCarats = parseFloat(cs.carats) || 0;
          const shape = cs.shape || 'Round';
          const category = `Center Stone #${csIdx + 1}`;
          const sizeLabel = cs.type ? `${cs.type} (${cs.origin})` : 'Center';

          list.push({ source, category, shape, sizeLabel, qty, totalCarats, pieces: [pNum] });
        });
      }

      // 4. Supplied Melee
      if (Array.isArray(r.melee)) {
        r.melee.filter(m => parseInt(m.qty) > 0).forEach(m => {
          const qty = parseInt(m.qty) || 0;
          const source = 'company';
          const totalCarats = qty * (parseFloat(m.carat) || 0);
          const shape = 'Round Brilliant';
          const category = 'Melee Accent';
          const sizeLabel = `${m.size}mm`;

          list.push({ source, category, shape, sizeLabel, qty, totalCarats, pieces: [pNum] });
        });
      }

      // 5. Supplied Fancy
      if (Array.isArray(r.fancy)) {
        r.fancy.filter(f => parseInt(f.qty) > 0).forEach(f => {
          const qty = parseInt(f.qty) || 0;
          const source = 'company';
          const aF = FANCY_SHAPES[f.shape] || [];
          const fd = aF[f.sizeIdx] || { carat: 0, label: '' };
          const totalCarats = qty * (fd.carat || 0);
          const shape = f.shape;
          const category = 'Fancy Accent';
          const sizeLabel = fd.label || 'Fancy Melee';

          list.push({ source, category, shape, sizeLabel, qty, totalCarats, pieces: [pNum] });
        });
      }

      // 6. Client Owned Stones
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

          list.push({ source: 'customer', category, shape, sizeLabel, qty, totalCarats, pieces: [pNum] });
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

    const w = (session.wholesaleProfileId && settings.wholesaleProfiles?.find(p => p.id === session.wholesaleProfileId)?.settings) || settings.wholesale;
    const sPGold = Number(session.overridePrices?.gold ?? spotPrices.gold);
    const sPPlat = Number(session.overridePrices?.platinum ?? spotPrices.platinum);
    const sPSilv = Number(session.overridePrices?.silver ?? spotPrices.silver);

    (session.rings || []).forEach((r) => {
      if (!hasRingData(r)) return;

      const ringLabel = r.category === 'customRing' ? 'Engagement' 
                  : r.category === 'weddingBand' ? 'Wedding Band'
                  : r.category === 'mensBand' ? "Men's Band"
                  : r.category === 'pendant' ? 'Pendant'
                  : r.category === 'earrings' ? 'Earrings'
                  : r.category === 'repair' ? 'Repair'
                  : 'Tennis';

      const g = Number(r.goldGrams) || 0;

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

        const ringFabLabor = g * Number(w.laborPerGram);
        fabLabor += ringFabLabor;
        fabLaborDetails.push(`${ringLabel}: ${g.toFixed(2)}g x $${Number(w.laborPerGram).toFixed(2)}/g`);
      }

      if (r.category === 'tennisBracelet') {
        const est = getTennisEstimates(r);
        const fs = Number(r.tbManualStones) || est.estStones;
        const fc = Number(r.tbManualCarats) || (fs * est.caratPerStone);
        const ppc = r.tbShape === 'Round' 
          ? (w.meleeRates?.[r.tbSizeRound || '2.0'] ?? settings.rawCostRates?.melee ?? 350) 
          : (w.fancyRates?.[r.tbShape || 'Princess'] ?? settings.rawCostRates?.fancy ?? 450);
        const settingFee = r.tbShape === 'Round'
          ? Number(w.settingMelee || 5)
          : Number(w.settingFancy || 8);
        if (r.stoneSource !== 'customer') {
          settingLabor += fs * settingFee;
          settingLaborDetails.push(`${ringLabel}: ${fs}x Tennis setting x $${settingFee.toFixed(2)}`);
          stoneSupplyCost += fc * ppc;
          stoneSupplyDetails.push(`${ringLabel}: Tennis ${r.tbShape} stones (${fc.toFixed(2)}ct) @ $${ppc.toFixed(2)}/ct`);
        }
      } else {
        let mQ = 0;
        let mC = 0;
        let mCarats = 0;
        (r.melee || []).forEach(m => {
          const q = Number(m.qty) || 0;
          if (q <= 0) return;
          const rate = Number(w.meleeRates?.[m.size] ?? 400);
          mQ += q;
          const carats = q * Number(m.carat);
          mCarats += carats;
          mC += carats * rate;
          stoneSupplyDetails.push(`${ringLabel}: Melee ${m.size}mm (${carats.toFixed(2)}ct) @ $${rate.toFixed(2)}/ct`);
        });
        if (mQ > 0) {
          settingLabor += mQ * Number(w.settingMelee);
          settingLaborDetails.push(`${ringLabel}: ${mQ}x Melee setting x $${Number(w.settingMelee).toFixed(2)}`);
          stoneSupplyCost += mC;
        }

        let fQ = 0;
        let fC = 0;
        let fCarats = 0;
        (r.fancy || []).forEach(f => {
          const q = Number(f.qty) || 0;
          if (q <= 0) return;
          const aF = FANCY_SHAPES[f.shape] || [];
          const fd = aF[f.sizeIdx] || { carat: 0, label: '' };
          const key = fd.label ? `${f.shape}-${fd.label}` : '';
          const rate = Number((key && w.fancyRates?.[key]) ?? w.fancyRates?.[f.shape] ?? 500);
          fQ += q;
          const carats = q * Number(fd.carat || 0);
          fCarats += carats;
          fC += carats * rate;
          stoneSupplyDetails.push(`${ringLabel}: Fancy ${f.shape} ${fd.label} (${carats.toFixed(2)}ct) @ $${rate.toFixed(2)}/ct`);
        });
        if (fQ > 0) {
          settingLabor += fQ * Number(w.settingFancy);
          settingLaborDetails.push(`${ringLabel}: ${fQ}x Fancy setting x $${Number(w.settingFancy).toFixed(2)}`);
          stoneSupplyCost += fC;
        }

        if (r.centerStones && r.centerStones.length > 0) {
          r.centerStones.forEach((cs, csIdx) => {
            if (!cs.carats) return;
            const cCt = parseFloat(cs.carats) || 0;
            if (cCt > 0) {
              settingLabor += Number(w.settingCenter);
              settingLaborDetails.push(`${ringLabel}: Center #${csIdx + 1} setting fee x $${Number(w.settingCenter).toFixed(2)}`);
              if (r.stoneSource !== 'customer') {
                const rate = settings.centerStoneRates?.[cs.type]?.[cs.origin] ?? 1000;
                stoneSupplyCost += cCt * rate;
                stoneSupplyDetails.push(`${ringLabel}: Center #${csIdx + 1} ${cs.carats}ct ${cs.shape} ${cs.type} (${cs.origin}) @ $${rate.toFixed(2)}/ct`);
              }
            }
          });
        } else {
          if (r.centerStone?.carats) {
            const cCt = parseFloat(r.centerStone.carats) || 0;
            if (cCt > 0) {
              settingLabor += Number(w.settingCenter);
              settingLaborDetails.push(`${ringLabel}: Center stone setting fee x $${Number(w.settingCenter).toFixed(2)}`);
              if (r.stoneSource !== 'customer') {
                const rate = settings.centerStoneRates?.[r.centerStone.type]?.[r.centerStone.origin] ?? 1000;
                stoneSupplyCost += cCt * rate;
                stoneSupplyDetails.push(`${ringLabel}: Center ${r.centerStone.carats}ct ${r.centerStone.shape} ${r.centerStone.type} (${r.centerStone.origin}) @ $${rate.toFixed(2)}/ct`);
              }
            }
          }
          if (r.centerStone2?.carats) {
            const cCt = parseFloat(r.centerStone2.carats) || 0;
            if (cCt > 0) {
              settingLabor += Number(w.settingCenter);
              settingLaborDetails.push(`${ringLabel}: Center #2 setting fee x $${Number(w.settingCenter).toFixed(2)}`);
              if (r.stoneSource !== 'customer') {
                const rate = settings.centerStoneRates?.[r.centerStone2.type]?.[r.centerStone2.origin] ?? 1000;
                stoneSupplyCost += cCt * rate;
                stoneSupplyDetails.push(`${ringLabel}: Center #2 ${r.centerStone2.carats}ct ${r.centerStone2.shape} ${r.centerStone2.type} (${r.centerStone2.origin}) @ $${rate.toFixed(2)}/ct`);
              }
            }
          }
        }
      }

      // Client stones setting labor
      (r.clientStones || []).forEach(cs => {
        const q = Number(cs.qty) || 0;
        if (q <= 0) return;
        if (cs.type === 'Center') {
          settingLabor += q * Number(w.settingCenter);
          settingLaborDetails.push(`${ringLabel}: Client Center stone setting fee (${q}x) @ $${Number(w.settingCenter).toFixed(2)}`);
        } else if (cs.type === 'Fancy') {
          settingLabor += q * Number(w.settingFancy);
          settingLaborDetails.push(`${ringLabel}: Client Fancy stone setting fee (${q}x) @ $${Number(w.settingFancy).toFixed(2)}`);
        } else {
          settingLabor += q * Number(w.settingMelee);
          settingLaborDetails.push(`${ringLabel}: Client Melee stone setting fee (${q}x) @ $${Number(w.settingMelee).toFixed(2)}`);
        }
      });

      if (r.applyDesignFee) {
        const cadFeeVal = Number((w as any).cadFee ?? w.designFee);
        designAddons += cadFeeVal;
        designAddonsDetails.push(`${ringLabel}: CAD Design Fee x $${cadFeeVal.toFixed(2)}`);
      }

      (r.addons || []).forEach(a => {
        const fee = parseFloat(a.fee) || 0;
        if (fee > 0) {
          designAddons += fee;
          designAddonsDetails.push(`${ringLabel}: ${a.desc || 'Custom addon charge'} x $${fee.toFixed(2)}`);
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

  return (
    <div id={containerId} className="bg-white p-8 rounded-[2rem] border border-brand-200 shadow-xl space-y-6 print:p-0 print:border-none print:shadow-none print:rounded-none print:space-y-3.5 text-left font-sans text-brand-800 max-w-4xl mx-auto">
      {/* Invoice Header */}
      <div className="flex justify-between items-start border-b border-brand-200 pb-6 print:pb-3">
        <div>
          <h1 className="font-serif italic font-black text-3xl text-brand-900 tracking-tight print:text-2xl">{settings.storeName || 'Gold & Rose'}</h1>
          <p className="text-[10px] text-brand-500 font-mono uppercase tracking-widest mt-1 print:text-[8px]">{settings.storeSubName || 'Jewellery Corporation'}</p>
          <p className="text-xs text-brand-600 mt-2 print:text-[10px] print:mt-1">{settings.storeAddress || '4501 North Rd #209, Burnaby, BC V3N 4J5'}</p>
          <p className="text-xs text-brand-600 print:text-[10px]">{settings.storeContact || 'info@goldandrosejewellery.com | (604) 420-9077'}</p>
          <p className="text-[9px] text-brand-400 font-mono mt-0.5">GST/HST: 737186213RT0001</p>
        </div>
        <div className="text-right">
          <span className="bg-brand-900 text-brand-gold px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md print:px-3 print:py-1 print:text-[8px]">
            {isWholesale ? 'Wholesale Agreement' : 'Custom Retail Estimate'}
          </span>
          <p className="text-xs text-brand-500 font-mono mt-3 print:mt-1.5 print:text-[9px]">Date: {effectiveDate}</p>
          {session.jobNum && <p className="text-xs font-bold text-brand-800 mt-1 print:mt-0.5 print:text-[9px]">Job #: {session.jobNum}</p>}
          {session.id && <p className="text-[9px] font-mono text-brand-400 mt-0.5">Ref ID: #{session.id}</p>}
        </div>
      </div>

      {/* Client Credentials & Brief Summary Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-brand-50 p-5 rounded-2xl border border-brand-200 print:gap-3 print:p-3 print:rounded-xl">
        <div>
          <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2 print:mb-0.5 print:text-[8px]">Customer Details</h3>
          <p className="text-sm font-bold text-brand-950 print:text-xs">{session.cName || 'Unnamed Customer'}</p>
          {session.cPhone && <p className="text-xs text-brand-600 mt-1 print:mt-0 print:text-[10px]">Phone: {session.cPhone}</p>}
          {session.cEmail && <p className="text-xs text-brand-600 print:text-[10px]">Email: {session.cEmail}</p>}
          {session.employeeId && <p className="text-xs font-mono font-bold text-brand-700 print:text-[10px] mt-0.5">Staff Rep / ID: {session.employeeId}</p>}
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
      <div className="space-y-3 print:space-y-1.5">
        <h3 className="text-[9.5px] font-black text-brand-500 uppercase tracking-widest pl-1 print:text-[7.5px]">Jewelry Specifications Breakdown</h3>
        <div className="border border-brand-200 rounded-2xl overflow-hidden shadow-sm print:rounded-xl">
          <table className="w-full text-left border-collapse text-[11px] print:text-[9.5px]">
            <thead>
              <tr className="bg-brand-900 text-brand-gold border-b border-brand-800 uppercase text-[8.5px] tracking-wider font-black print:text-[7px]">
                <th className="p-2.5 pl-3.5 print:p-1.5 print:pl-2.5">Piece</th>
                <th className="p-2.5 print:p-1.5">Metal / Material</th>
                <th className="p-2.5 print:p-1.5">Gems & Stones</th>
                <th className="p-2.5 print:p-1.5">Special Addons / Notes</th>
                <th className="p-2.5 pr-3.5 text-right print:p-1.5 print:pr-2.5">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {(session.rings || []).filter(r => hasRingData(r)).map((r, ri) => {
                const cost = calculateRingCost(
                  r,
                  settings,
                  spotPrices,
                  isWholesale ? 'wholesale' : 'retail',
                  session.overridePrices,
                  isWholesale ? session.wholesaleProfileId : undefined
                );
                const discVal = parseFloat(r.discount) || 0;
                const discDeduction = r.discountType === '%' ? cost * (discVal / 100) : discVal;
                const finalPieceCost = Math.max(0, cost - discDeduction);
                const w = (session.wholesaleProfileId && settings.wholesaleProfiles?.find(p => p.id === session.wholesaleProfileId)?.settings) || settings.wholesale;

                return (
                  <tr key={r.id || ri} className="hover:bg-brand-50/50 transition-colors">
                    <td className="p-2.5 pl-3.5 font-bold text-brand-900 text-[11px] print:p-1.5 print:pl-2.5 print:text-[9px]">
                      #{ri + 1} {r.category === 'customRing' ? 'Engagement' : r.category === 'weddingBand' ? 'Band' : r.category === 'mensBand' ? "Men's" : r.category === 'pendant' ? 'Pendant' : r.category === 'earrings' ? 'Earrings' : r.category === 'repair' ? 'Repair' : 'Tennis'}
                    </td>
                    <td className="p-2.5 print:p-1.5">
                      <span className="font-semibold block text-[11px] print:text-[9px]">{r.goldKarat ? `${r.goldKarat}K` : ''} {r.metalColor} {r.material}</span>
                      <span className="text-[9.5px] text-brand-500 font-mono print:text-[8px]">{r.goldGrams || '0.0'}g</span>
                    </td>
                    <td className="p-2.5 space-y-0.5 print:p-1.5 print:space-y-0.5">
                      {r.centerStones && r.centerStones.length > 0 ? (
                        r.centerStones.map((cs, csIdx) => {
                          if (!cs.carats) return null;
                          const rate = isWholesale ? (settings.centerStoneRates?.[cs.type]?.[cs.origin] ?? 1000) : null;
                          return (
                            <span key={csIdx} className="block text-[10px] print:text-[8.5px]">
                              Center #{csIdx + 1}: {cs.carats}ct {cs.shape} {cs.type} ({cs.origin})
                              {rate !== null && <span className="text-emerald-700 font-extrabold ml-1">@ ${rate.toFixed(2)}/ct</span>}
                            </span>
                          );
                        })
                      ) : (
                        <>
                          {r.centerStone?.carats && (() => {
                            const rate = isWholesale ? (settings.centerStoneRates?.[r.centerStone.type]?.[r.centerStone.origin] ?? 1000) : null;
                            return (
                              <span className="block text-[10px] print:text-[8.5px]">
                                Center: {r.centerStone.carats}ct {r.centerStone.shape} {r.centerStone.type} ({r.centerStone.origin})
                                {rate !== null && <span className="text-emerald-700 font-extrabold ml-1">@ ${rate.toFixed(2)}/ct</span>}
                              </span>
                            );
                          })()}
                          {r.centerStone2?.carats && (() => {
                            const rate = isWholesale ? (settings.centerStoneRates?.[r.centerStone2.type]?.[r.centerStone2.origin] ?? 1000) : null;
                            return (
                              <span className="block text-[10px] print:text-[8.5px]">
                                Stone 2: {r.centerStone2.carats}ct {r.centerStone2.shape} {r.centerStone2.type} ({r.centerStone2.origin})
                                {rate !== null && <span className="text-emerald-700 font-extrabold ml-1">@ ${rate.toFixed(2)}/ct</span>}
                              </span>
                            );
                          })()}
                        </>
                      )}
                      {!isWholesale ? (
                        <>
                          {r.melee && r.melee.some(m => m.qty) && (
                            <span className="block text-[9.5px] text-brand-600 font-mono print:text-[8px]">
                              Melee: {r.melee.reduce((acc, m) => acc + (parseInt(m.qty) || 0), 0)} st ({r.melee.reduce((acc, m) => acc + ((parseInt(m.qty) || 0) * (parseFloat(m.carat) || 0)), 0).toFixed(2)}ctw)
                            </span>
                          )}
                          {r.fancy && r.fancy.some(f => f.qty) && (
                            <span className="block text-[9.5px] text-brand-600 font-mono print:text-[8px]">
                              Fancy: {r.fancy.reduce((acc, f) => acc + (parseInt(f.qty) || 0), 0)} st
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {r.melee && r.melee.filter(m => parseInt(m.qty) > 0).map((m, mIdx) => {
                            const count = parseInt(m.qty) || 0;
                            const totalCarats = count * (parseFloat(m.carat) || 0);
                            const rate = w.meleeRates?.[m.size] ?? 400;
                            return (
                              <span key={`m-inv-${mIdx}`} className="block text-[9.5px] text-brand-600 font-mono print:text-[8px]">
                                Melee {m.size}mm: {count} st ({totalCarats.toFixed(2)}ctw) <span className="text-emerald-700 font-extrabold">@ ${rate.toFixed(2)}/ct</span>
                              </span>
                            );
                          })}
                          {r.fancy && r.fancy.filter(f => parseInt(f.qty) > 0).map((f, fIdx) => {
                            const count = parseInt(f.qty) || 0;
                            const aF = FANCY_SHAPES[f.shape] || [];
                            const fd = aF[f.sizeIdx] || { carat: 0, label: '' };
                            const totalCarats = count * (fd.carat || 0);
                            const key = fd.label ? `${f.shape}-${fd.label}` : '';
                            const rate = Number((key && w.fancyRates?.[key]) ?? w.fancyRates?.[f.shape] ?? 500);
                            return (
                              <span key={`f-inv-${fIdx}`} className="block text-[9.5px] text-brand-600 font-mono print:text-[8px]">
                                Fancy {f.shape} {fd.label}: {count} st ({totalCarats.toFixed(2)}ctw) <span className="text-emerald-700 font-extrabold">@ ${rate.toFixed(2)}/ct</span>
                              </span>
                            );
                          })}
                        </>
                      )}
                    </td>
                    <td className="p-2.5 space-y-0.5 print:p-1.5 print:space-y-0.5">
                      {r.engravingText && <span className="block text-[10.5px] font-semibold italic print:text-[8.5px]" style={{ fontFamily: r.engravingFont }}>"Engraved: {r.engravingText}"</span>}
                      {r.designNotes && r.designNotes.map((n, ni) => <span key={ni} className="block text-[9px] text-brand-500 leading-tight print:text-[7.5px]">• {n.text}</span>)}
                    </td>
                    <td className="p-2.5 pr-3.5 text-right font-mono font-bold text-brand-950 text-xs print:p-1.5 print:pr-2.5 print:text-[9.5px]">
                      {discVal > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="text-[9.5px] text-slate-400/90 line-through font-normal print:text-[7.5px]">
                            ${cost.toFixed(2)}
                          </span>
                          <span className="text-[8.5px] text-red-600 font-extrabold font-sans print:text-[7px]">
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

      {/* Consolidated Stones Manifest */}
      {consolidatedStones.length > 0 && (
        <div className="space-y-1 print:space-y-0.5 border-t border-brand-100 pt-2 print:pt-1">
          <h3 className="text-[7.5px] font-black text-brand-900 uppercase tracking-wider pl-1 flex items-center gap-1.5 print:text-[5.5px]">
            <span>💎 Consolidated Manufacturing Stones & Procurement Manifest</span>
            <span className="text-[6.5px] font-black uppercase text-brand-500 font-mono tracking-normal print:text-[5px]">
              ({consolidatedStones.reduce((acc, s) => acc + s.qty, 0)} stones total)
            </span>
          </h3>
          <div className="border border-brand-200 rounded-lg overflow-hidden shadow-xs print:rounded-md max-w-full">
            <table className="w-full text-left border-collapse text-[7px] print:text-[5px] leading-tight">
              <thead>
                <tr className="bg-brand-900 text-brand-gold border-b border-brand-800 uppercase text-[6px] tracking-wider font-black print:text-[4.8px]">
                  <th className="py-0.5 px-1 pl-1.5 print:py-0.2 print:px-0.5 print:pl-1">Procurement Source</th>
                  <th className="py-0.5 px-1 print:py-0.2 print:px-0.5">Stone Type</th>
                  <th className="py-0.5 px-1 print:py-0.2 print:px-0.5">Shape/Cut</th>
                  <th className="py-0.5 px-1 print:py-0.2 print:px-0.5">Size/Dimension</th>
                  <th className="py-0.5 px-1 print:py-0.2 print:px-0.5 text-center">Qty</th>
                  <th className="py-0.5 px-1 print:py-0.2 print:px-0.5">Total Weight</th>
                  <th className="py-0.5 px-1 pr-1.5 text-right print:py-0.2 print:px-0.5 print:pr-1">Used in Pieces</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {consolidatedStones.map((stone, sIdx) => (
                  <tr key={sIdx} className={`${stone.source === 'customer' ? 'bg-amber-50/20' : 'hover:bg-brand-50/30'} transition-colors`}>
                    <td className="py-0.5 px-1 pl-1.5 print:py-0.2 print:px-0.5 print:pl-1 font-medium">
                      {stone.source === 'customer' ? (
                        <span className="inline-flex items-center gap-0.5 text-[6px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0 rounded-full print:text-[4.5px] print:px-0.5">
                          ⚠️ Client Supplied
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[6px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-1 py-0 rounded-full print:text-[4.5px] print:px-0.5">
                          🏢 Stock Supplied
                        </span>
                      )}
                    </td>
                    <td className="py-0.5 px-1 print:py-0.2 print:px-0.5 font-bold text-brand-900">{stone.category}</td>
                    <td className="py-0.5 px-1 print:py-0.2 print:px-0.5 font-semibold text-brand-800">{stone.shape}</td>
                    <td className="py-0.5 px-1 print:py-0.2 print:px-0.5 font-mono text-brand-600">{stone.sizeLabel}</td>
                    <td className="py-0.5 px-1 print:py-0.2 print:px-0.5 text-center font-bold font-mono text-brand-950">{stone.qty} pcs</td>
                    <td className="py-0.5 px-1 print:py-0.2 print:px-0.5 font-bold font-mono text-brand-900">
                      {stone.totalCarats > 0 ? `${stone.totalCarats.toFixed(2)} ctw` : '--'}
                    </td>
                    <td className="py-0.5 px-1 pr-1.5 text-right font-bold text-brand-600 print:py-0.2 print:px-0.5 print:pr-1">
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
        <div className="space-y-3 print:space-y-1.5 border-t border-brand-100 pt-5 print:pt-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-100/50 pb-2.5 print:pb-1">
            <h3 className="text-[11px] font-black text-brand-900 uppercase tracking-widest pl-1 flex items-center gap-2 print:text-[8px]">
              <span>🛠️ Wholesale Manufacturing Session Cost Breakdown</span>
            </h3>
            <div className="flex flex-wrap gap-3.5 text-[9.5px] font-bold text-slate-500 font-mono pl-1 sm:pl-0 print:text-[7px] print:gap-2.5">
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
              <div className="space-y-2.5 print:space-y-1.5">
                {categories.map((cat, cidx) => (
                  <div key={cidx} className={`p-3 rounded-xl border ${cat.bgColor} ${cat.borderColor} print:p-2 print:rounded-lg`}>
                    <div className="flex justify-between items-center border-b border-brand-100/30 pb-1.5 mb-1.5 print:pb-1 print:mb-1">
                      <span className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider print:text-[7.5px]">{cat.title}</span>
                      <span className={`font-mono font-black text-sm ${cat.textColor} print:text-[10px]`}>
                        ${cat.cost.toFixed(2)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-1 print:grid-cols-2 print:gap-x-3">
                      {cat.details.map((det, detIdx) => (
                        <p key={detIdx} className="text-[9.5px] text-slate-600 leading-normal font-medium print:text-[7.5px] print:leading-snug flex items-start gap-1">
                          <span className="text-emerald-500 mt-0.5 text-[7px]">•</span>
                          <span>{det}</span>
                        </p>
                      ))}
                      {cat.details.length === 0 && (
                        <p className="text-[9px] text-slate-400 italic font-medium print:text-[7px]">No charges recorded</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Dynamic Mockups Thumbnail Anchors */}
      {session.rings && session.rings.some(r => {
        const isValidImage = (str: any) => typeof str === 'string' && (str.startsWith('data:image/') || str.startsWith('http://') || str.startsWith('https://') || str.startsWith('blob:'));
        const rSketches = (Array.isArray(r.referenceSketches) ? r.referenceSketches : (r.referenceSketch ? [r.referenceSketch] : [])).filter(isValidImage);
        const rPhotos = (Array.isArray(r.referencePhotos) ? r.referencePhotos : (r.referencePhoto ? [r.referencePhoto] : [])).filter(isValidImage);
        return rSketches.length > 0 || rPhotos.length > 0;
      }) && (
        <div className="border-t border-brand-100 pt-6 space-y-4 print:pt-3 print:space-y-1.5">
          <h4 className="text-[10px] font-black text-brand-800 uppercase tracking-widest text-center print:text-[8px]">Reference Sketches & Photos</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
            {session.rings.map((r, ri) => {
              const isValidImage = (str: any) => typeof str === 'string' && (str.startsWith('data:image/') || str.startsWith('http://') || str.startsWith('https://') || str.startsWith('blob:'));
              const rSketches = (Array.isArray(r.referenceSketches) ? r.referenceSketches : (r.referenceSketch ? [r.referenceSketch] : [])).filter(isValidImage);
              const rPhotos = (Array.isArray(r.referencePhotos) ? r.referencePhotos : (r.referencePhoto ? [r.referencePhoto] : [])).filter(isValidImage);
              if (rSketches.length === 0 && rPhotos.length === 0) return null;
              return (
                <div key={r.id || ri} className="border border-brand-100 bg-brand-50/20 rounded-2xl p-3 space-y-3 print:p-1.5 print:space-y-1.5 print:rounded-xl">
                  <p className="text-[10px] font-black uppercase text-brand-600 tracking-wider print:text-[8px]">
                    Piece {ri + 1}: {r.category === 'customRing' ? 'Custom Ring' : r.category === 'weddingBand' ? 'Band' : r.category === 'mensBand' ? "Men's Band" : r.category === 'pendant' ? 'Pendant' : r.category === 'earrings' ? 'Earrings' : r.category === 'repair' ? 'Repair' : 'Tennis'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {rSketches.map((sk, skIdx) => (
                      <div key={`sk-${skIdx}`} className="border border-brand-200 rounded-xl p-1.5 bg-white flex flex-col items-center print:p-2 print:rounded-xl">
                        <span className="text-[8px] font-black uppercase text-brand-400 tracking-wider mb-1 print:mb-1 print:text-[7px]">Sketch {skIdx + 1}</span>
                        <img 
                          src={sk} 
                          alt={`Piece ${ri+1} Sketch ${skIdx+1}`} 
                          className="h-28 w-full object-contain rounded cursor-pointer hover:scale-[1.01] transition-all print:h-64 print:rounded-lg" 
                          onClick={() => enlargeImage && enlargeImage(sk)}
                        />
                      </div>
                    ))}
                    {rPhotos.map((ph, phIdx) => (
                      <div key={`ph-${phIdx}`} className="border border-brand-200 rounded-xl p-1.5 bg-white flex flex-col items-center print:p-2 print:rounded-xl">
                        <span className="text-[8px] font-black uppercase text-brand-400 tracking-wider mb-1 print:mb-1 print:text-[7px]">Photo {phIdx + 1}</span>
                        <img 
                          src={ph} 
                          alt={`Piece ${ri+1} Photo ${phIdx+1}`} 
                          className="h-28 w-full object-contain rounded cursor-pointer hover:scale-[1.01] transition-all print:h-64 print:rounded-lg" 
                          onClick={() => enlargeImage && enlargeImage(ph)}
                        />
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
          {isInteractive && onChangeSession && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-brand-100 print:hidden">
              <span className="text-xs font-bold text-brand-700">Charge BC Sales Tax (12%)</span>
              <input
                type="checkbox"
                className="w-4 h-4 text-brand-gold bg-brand-100 border-brand-300 rounded focus:ring-brand-gold focus:ring-2 accent-brand-gold"
                checked={session.applyTax}
                onChange={(e) => onChangeSession(prev => ({ ...prev, applyTax: e.target.checked }))}
              />
            </div>
          )}
        </div>
        <div className="space-y-2 text-xs font-mono text-brand-700 print:space-y-1 print:text-[10px]">
          <div className="flex justify-between"><span>Gross Total Cost:</span><span>${totals.grossTotal.toFixed(2)}</span></div>
          {totals.totalDiscount > 0 && <div className="flex justify-between text-red-600"><span>Client Deduction Reductions:</span><span>-${totals.totalDiscount.toFixed(2)}</span></div>}
          {Number(session.scrapCredit) > 0 && (
            <div className="flex justify-between text-green-600 items-center">
              <span>Connected Scrap Payout Credit:</span>
              <span className="flex items-center gap-1.5">
                -${Number(session.scrapCredit).toFixed(2)}
                {isInteractive && onChangeSession && (
                  <button 
                    type="button" 
                    onClick={() => onChangeSession(prev => ({ ...prev, scrapCredit: 0 }))}
                    className="text-red-500 hover:text-red-700 ml-1 font-sans font-bold text-[9px] uppercase border border-red-200 bg-red-50 hover:bg-red-100 rounded px-1.5 py-0.5 print:hidden cursor-pointer"
                  >
                    unlink
                  </button>
                )}
              </span>
            </div>
          )}
          <div className="border-t border-brand-200 my-1 print:my-0.5"></div>
          <div className="flex justify-between">
            <span>Subtotal Value:</span>
            <span>{totals.subtotal < 0 ? `-$${Math.abs(totals.subtotal).toFixed(2)}` : `$${totals.subtotal.toFixed(2)}`}</span>
          </div>
          {session.applyTax && <div className="flex justify-between"><span>BC Taxes & GST (12%):</span><span>+${totals.tax.toFixed(2)}</span></div>}
          <div className="border-t-2 border-brand-900 my-1 print:my-0.5"></div>
          <div className="flex justify-between font-bold text-sm text-brand-950 font-sans print:text-xs items-center">
            <span>{totals.grandTotal < 0 ? 'CLIENT PAYOUT / CREDIT DUE:' : 'FINAL BALANCE DUE:'}</span>
            <div className="flex items-center gap-1.5">
              {totals.isOverridden && (
                <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded font-mono font-bold print:hidden">
                  (Overridden)
                </span>
              )}
              <span className={`text-lg font-black print:text-sm ${totals.grandTotal < 0 ? 'text-green-700' : totals.isOverridden ? 'text-amber-700' : 'text-brand-900'}`}>
                {totals.grandTotal < 0 ? `-$${Math.abs(totals.grandTotal).toFixed(2)}` : `$${totals.grandTotal.toFixed(2)}`}
              </span>
              {isInteractive && onOpenPriceOverride && (
                <button
                  type="button"
                  onClick={onOpenPriceOverride}
                  className="print:hidden p-1 rounded hover:bg-amber-100 text-slate-500 hover:text-amber-700 transition-all border border-slate-200 cursor-pointer"
                  title="Override Price"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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
            <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider bg-red-50 border border-red-200 px-3 py-2 rounded-xl print:px-2 print:py-1 print:text-[8px] print:rounded-lg">Pending Client Signature</span>
          )}
        </div>
      </div>
    </div>
  );
}
