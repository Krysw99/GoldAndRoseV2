import React from 'react';
import { QuoteSession, AppSettings, JewelryItem } from '../types';

interface WholesaleRepairInvoicePrintProps {
  session: QuoteSession;
  settings: AppSettings;
  containerId?: string;
  dateStr?: string;
}

export default function WholesaleRepairInvoicePrint({
  session,
  settings,
  containerId = "wholesale-repair-invoice-print",
  dateStr
}: WholesaleRepairInvoicePrintProps) {
  const effectiveDate = dateStr || new Date().toLocaleDateString();

  const profileId = session.wholesaleProfileId || '';

  const activeItem = (session.rings.find(r => r.category === 'repair') || session.rings[0] || {
    id: '',
    category: 'repair',
    stoneSource: 'our',
    custCenterCt: '',
    custMeleeCount: '',
    material: 'gold',
    metalColor: 'Yellow',
    goldKarat: 14,
    fancy: [],
    melee: [],
    clientStones: [],
    centerStones: [],
    addons: [],
    showEngraving: false,
    engravingText: '',
    engravingFont: "'Times New Roman', Times, serif",
    designNotes: [],
    discount: '',
    discountType: '$',
    applyDesignFee: false,
    goldGrams: '',
    referenceSketches: [],
    referencePhotos: [],
    repairs: [],
    repairNotes: ''
  }) as JewelryItem;

  const currentRepairs = activeItem.repairs || [];
  const currentAddons = activeItem.addons || [];

  const subtotalTotal = (activeItem?.repairs || []).reduce((acc, r) => acc + (r.price || 0), 0) + 
    (activeItem?.addons || []).reduce((acc, a) => acc + (parseFloat(a.fee) || 0), 0);

  const pProfile = (settings.wholesaleProfiles || []).find(p => p.id === profileId);
  const discountPercent = (pProfile as any)?.discountPercent || 0;
  const computedDiscount = (subtotalTotal * discountPercent) / 100;

  const scrapCredit = Number(session.scrapCredit) || 0;
  const netSubtotal = Math.max(0, subtotalTotal - computedDiscount - scrapCredit);
  const taxAmount = session.applyTax ? netSubtotal * 0.12 : 0;
  const calculatedGrandTotal = netSubtotal + taxAmount;

  const isOverridden = typeof session.customGrandTotal === 'number' && !isNaN(session.customGrandTotal) && session.customGrandTotal !== null;
  const grandTotal = isOverridden ? (session.customGrandTotal as number) : calculatedGrandTotal;

  return (
    <div id={containerId} className="bg-white text-black p-8 max-w-4xl mx-auto font-sans text-xs space-y-6 text-left">
      {/* Print Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-5">
        <div>
          <h1 className="font-serif italic font-black text-2xl tracking-wide uppercase">{settings.storeName || "Gold & Rose"}</h1>
          <p className="text-[10px] text-gray-500 tracking-wider uppercase font-mono">{settings.storeSubName || "Jewellery Corporation"}</p>
          <p className="text-[9px] text-gray-400 mt-1.5 leading-tight">{settings.storeAddress}</p>
          <p className="text-[9px] text-gray-400 leading-tight">{settings.storeContact}</p>
          <p className="text-[9px] text-gray-400 font-mono mt-0.5">GST/HST: 737186213RT0001</p>
        </div>
        <div className="text-right">
          <h2 className="text-sm font-black uppercase tracking-widest bg-black text-white px-3 py-1.5 rounded">Wholesale Repair Sheet</h2>
          <div className="mt-3 text-[10px] space-y-0.5 font-mono">
            <div><strong>Invoice ID:</strong> {session.id}</div>
            {session.jobNum && <div><strong>Job #:</strong> {session.jobNum}</div>}
            <div><strong>Date Received:</strong> {effectiveDate}</div>
            {session.jobDesc && <div><strong>Promise Date:</strong> {new Date(session.jobDesc).toLocaleDateString()}</div>}
          </div>
        </div>
      </div>

      {/* Client Info Section */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono mb-1">Wholesale Partner</h3>
          <p className="text-sm font-black text-gray-900">{session.cName}</p>
          {profileId && (
            <span className="inline-block bg-black text-white text-[8px] font-bold px-1.5 py-0.5 rounded font-mono uppercase mt-1">
              Profile: {(settings.wholesaleProfiles || []).find(p => p.id === profileId)?.name || 'Custom'}
            </span>
          )}
        </div>
        <div className="text-right">
          <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono mb-1">Contact Details</h3>
          {session.cPhone && <p className="text-xs font-bold font-mono text-gray-800">{session.cPhone}</p>}
          {session.cEmail && <p className="text-xs font-bold text-gray-600">{session.cEmail}</p>}
        </div>
      </div>

      {/* Repair Items Checklist table */}
      <div>
        <h3 className="text-[10px] font-black text-gray-800 uppercase tracking-widest border-b border-black pb-1.5 mb-3 font-mono">Checked Sizing & Restoration Operations</h3>
        {currentRepairs.length === 0 ? (
          <p className="text-gray-400 italic py-2 text-center">No standard repair operations checked.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-[9px] font-mono uppercase tracking-wider text-gray-600 border-b border-gray-300">
                <th className="p-2.5 font-black">Operation / Task description</th>
                <th className="p-2.5 text-center font-black">Specs</th>
                <th className="p-2.5 text-right font-black">Calculated Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 text-xs">
              {currentRepairs.map((rep) => (
                <tr key={rep.id}>
                  <td className="p-2.5 font-bold text-gray-900">
                    {rep.name}
                    {rep.option && <span className="block text-[9px] text-gray-500 font-mono font-normal">Color plating option: {rep.option}</span>}
                  </td>
                  <td className="p-2.5 text-center font-mono font-bold text-gray-600">
                    {rep.id.startsWith('resizeUp') ? (
                      <span>+{rep.extraQty || 0} sizes</span>
                    ) : rep.qty > 0 ? (
                      <span>{rep.qty}x</span>
                    ) : (
                      <span className="text-[9px] font-bold text-gray-400 uppercase font-mono">Flat rate</span>
                    )}
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-gray-900">${rep.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Custom Bench Charges */}
      {currentAddons.length > 0 && (
        <div>
          <h3 className="text-[10px] font-black text-gray-800 uppercase tracking-widest border-b border-black pb-1.5 mb-3 font-mono">Raw Materials & Finding Component Charges</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-[9px] font-mono uppercase tracking-wider text-gray-600 border-b border-gray-300">
                <th className="p-2.5 font-black">Raw Component Description</th>
                <th className="p-2.5 text-right font-black">Component Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 text-xs">
              {currentAddons.map((add, idx) => (
                <tr key={idx}>
                  <td className="p-2.5 font-bold text-gray-900">{add.desc || 'Custom jewelry component charge'}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-gray-900">${(parseFloat(add.fee) || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sketches & Notes on Print */}
      <div className="grid grid-cols-2 gap-6 pt-2">
        {/* Printable sketches & photos */}
        <div className="space-y-4">
          {activeItem.referenceSketches && activeItem.referenceSketches.length > 0 && (
            <div>
              <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono mb-2 border-b border-gray-250 pb-1">Visual Bench Sketch</h3>
              <div className="grid grid-cols-2 gap-2">
                {activeItem.referenceSketches.map((sk, skIdx) => (
                  <div key={skIdx} className="border border-gray-200 p-1 rounded-lg aspect-square bg-white">
                    <img src={sk} alt={`Sketch ${skIdx+1}`} className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeItem.referencePhotos && activeItem.referencePhotos.length > 0 && (
            <div>
              <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono mb-2 border-b border-gray-250 pb-1">Visual Intake Photograph</h3>
              <div className="grid grid-cols-2 gap-2">
                {activeItem.referencePhotos.map((ph, phIdx) => (
                  <div key={phIdx} className="border border-gray-200 p-1 rounded-lg aspect-square bg-white">
                    <img src={ph} alt={`Intake ${phIdx+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Print Notes */}
        <div className="space-y-4">
          <div>
            <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono mb-1.5 border-b border-gray-250 pb-1">Special Bench Instructions</h3>
            <p className="text-gray-700 italic leading-relaxed text-xs p-3 bg-gray-50 rounded-xl border border-gray-150 whitespace-pre-line font-medium min-h-24">
              {activeItem.repairNotes || "No special instructions provided."}
            </p>
          </div>

          {session.notes && (
            <div>
              <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono mb-1.5 border-b border-gray-250 pb-1">Administrative Notes</h3>
              <p className="text-gray-700 italic leading-relaxed text-xs whitespace-pre-line">
                {session.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Billing & Sign-Off print block */}
      <div className="border-t-2 border-black pt-5 mt-4 grid grid-cols-2 gap-6 items-end">
        {/* Signature Block */}
        <div className="space-y-2">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">Wholesale Client Signature Authorization</p>
          {session.signatureImg ? (
            <div className="border border-gray-250 p-2.5 rounded-xl bg-gray-50 h-28 flex items-center justify-center">
              <img src={session.signatureImg} alt="Authorization signature" className="max-h-full object-contain" />
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 p-2.5 rounded-xl h-28 flex items-center justify-center text-gray-400 italic">
              Signature absent (Pending visual approval)
            </div>
          )}
          <p className="text-[9px] text-gray-400 leading-tight">By signing above, client stores acknowledge and approve the wholesale estimates and warranty parameters.</p>
        </div>

        {/* Print Totals */}
        <div className="space-y-2 text-right">
          <div className="flex justify-between text-xs text-gray-600 px-1 font-medium">
            <span>Calculated Operations Subtotal:</span>
            <span className="font-mono font-bold">${subtotalTotal.toFixed(2)}</span>
          </div>
          
          {computedDiscount > 0 && (
            <div className="flex justify-between text-xs text-amber-600 px-1 font-bold">
              <span>Profile Discount Deduct:</span>
              <span className="font-mono">-${computedDiscount.toFixed(2)}</span>
            </div>
          )}

          {scrapCredit > 0 && (
            <div className="flex justify-between text-xs text-green-600 px-1 font-bold">
              <span>Scrap Buyback Credit Deduct:</span>
              <span className="font-mono">-${scrapCredit.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-xs text-gray-900 border-t border-gray-200 pt-2 px-1 font-bold">
            <span>Net Estimated Total:</span>
            <span className="font-mono">{netSubtotal < 0 ? `-$${Math.abs(netSubtotal).toFixed(2)}` : `$${netSubtotal.toFixed(2)}`}</span>
          </div>

          {session.applyTax && (
            <div className="flex justify-between text-[11px] text-gray-600 px-1">
              <span>Sales Tax (12% GST/PST):</span>
              <span className="font-mono">${taxAmount.toFixed(2)}</span>
            </div>
          )}

          <div className={`flex justify-between text-sm p-3.5 rounded-xl font-bold items-center mt-2 ${grandTotal < 0 ? 'bg-emerald-900 text-emerald-100' : isOverridden ? 'bg-slate-900 text-amber-300 border border-amber-500/30' : 'bg-black text-white'}`}>
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-widest text-[9px] font-mono">
                {grandTotal < 0 ? 'Client Payout Due' : 'Job Grand Total'}
              </span>
              {isOverridden && (
                <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-mono font-bold print:hidden">
                  (Overridden)
                </span>
              )}
            </div>
            <span className="font-mono text-base font-black">
              {grandTotal < 0 ? `-$${Math.abs(grandTotal).toFixed(2)}` : `$${grandTotal.toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
