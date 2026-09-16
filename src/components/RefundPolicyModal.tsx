import React, { useState } from 'react';
import {
  X,
  Printer,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Clock,
  Hammer,
  Flame,
  Gem,
  Layers,
  Sparkles,
  Copy,
  Check,
  Calculator,
  AlertCircle,
  FileText
} from 'lucide-react';
import { printElement } from '../utils/printHelper';
import { AppSettings } from '../types';

interface RefundPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: AppSettings;
  clientName?: string;
  quoteRef?: string;
}

export default function RefundPolicyModal({
  isOpen,
  onClose,
  settings,
  clientName,
  quoteRef
}: RefundPolicyModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'legal' | 'calculator'>('overview');
  const [copied, setCopied] = useState(false);

  // Cancellation Estimator State
  const [estCadHours, setEstCadHours] = useState('1'); // Starting design fee
  const [estWaxCount, setEstWaxCount] = useState('1');
  const [estCastingCount, setEstCastingCount] = useState('1');
  const [estBenchHours, setEstBenchHours] = useState('2');
  const [estAlloyGrams, setEstAlloyGrams] = useState('1.5');
  const [estGoldCost, setEstGoldCost] = useState('350');
  const [estStonesCost, setEstStonesCost] = useState('500');
  const [estDepositPaid, setEstDepositPaid] = useState('1200');

  if (!isOpen) return null;

  const storeName = settings?.storeName || 'Gold & Rose Jewellery Corp';
  const storeContact = settings?.storeContact || 'atelier@goldrose.com • 416-555-ROSE';
  const storeAddress = settings?.storeAddress || 'Custom Studio & Workshop Atelier';

  // Calculator computations
  const cadCost = Math.max(100, (parseFloat(estCadHours) || 0) * 100);
  const waxCost = (parseFloat(estWaxCount) || 0) * 30;
  const castCost = Math.max(0, (parseFloat(estCastingCount) || 0) * 50);
  const benchCost = (parseFloat(estBenchHours) || 0) * 40;
  const alloyCost = (parseFloat(estAlloyGrams) || 0) * 20;
  const goldCost = parseFloat(estGoldCost) || 0;
  const stonesCost = parseFloat(estStonesCost) || 0;
  const totalIncurred = cadCost + waxCost + castCost + benchCost + alloyCost + goldCost + stonesCost;
  const depositPaidNum = parseFloat(estDepositPaid) || 0;
  const netDifference = depositPaidNum - totalIncurred;

  const handlePrint = () => {
    printElement('refund-policy-printable-sheet');
  };

  const copyPolicyText = () => {
    const text = `${storeName} - CUSTOM ORDER, DEPOSIT & CANCELLATION REFUND POLICY
----------------------------------------------------------------------
1. 50% NON-REFUNDABLE PRODUCTION DEPOSIT
All custom design commissions, 3D CAD modeling, and bespoke jewelry work require a mandatory 50% deposit upon authorization prior to project commencement.

2. CANCELLATION DEDUCTION SCHEDULE
In the event of a client-initiated cancellation, the 50% deposit will be applied against all accrued labor, materials, and specialized services completed to date:
- CAD Design & 3D Engineering: Starting at $100.00
- 3D Wax Prototype Molds: $30.00 per mold
- Casting & Flask Operation: Starting at $50.00 per cast
- Master Bench Artisan Labor: $40.00 per hour
- Master Alloy Formulation: $20.00 per gram
- Precious Metals (Gold/Platinum): Billed at purchase-date market spot price
- Special Gemstone/Diamond Orders: Strictly Non-Refundable (cannot be returned to wholesale cutters)

3. SETTLEMENT OF BALANCE
- If accumulated costs are less than the 50% deposit, the remaining balance will be returned within 7-10 business days.
- If accumulated costs exceed the 50% deposit, the client is responsible for settling the outstanding balance before any materials are released.
- Completed custom pieces, alterations, and engraved items are final sale.`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-950/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-brand-200 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-brand-950 via-brand-900 to-brand-950 text-white px-6 py-5 flex items-center justify-between border-b border-brand-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-800/80 border border-brand-gold/40 flex items-center justify-center text-brand-gold shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif italic text-lg sm:text-xl font-bold tracking-tight text-white">
                  Deposit & Cancellation Policy
                </h2>
                <span className="bg-brand-gold/20 text-brand-gold border border-brand-gold/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                  50% Deposit
                </span>
              </div>
              <p className="text-xs text-brand-200/80 font-mono mt-0.5">
                {storeName} • Custom Commission & Repair Terms
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-brand-gold text-brand-950 hover:bg-amber-300 transition-all shadow-md cursor-pointer"
              title="Print Official Policy Document"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print Document</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-brand-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close Dialog"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="bg-brand-50/70 border-b border-brand-100 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-brand-100/70 rounded-xl border border-brand-200/70">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white text-brand-950 shadow-sm'
                  : 'text-brand-700 hover:text-brand-950 hover:bg-white/40'
              }`}
            >
              Client Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('legal')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === 'legal'
                  ? 'bg-white text-brand-950 shadow-sm'
                  : 'text-brand-700 hover:text-brand-950 hover:bg-white/40'
              }`}
            >
              Formal Agreement
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('calculator')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'calculator'
                  ? 'bg-white text-brand-950 shadow-sm'
                  : 'text-brand-700 hover:text-brand-950 hover:bg-white/40'
              }`}
            >
              <Calculator size={13} className="text-amber-600" />
              <span>Deduction Calculator</span>
            </button>
          </div>

          <button
            type="button"
            onClick={copyPolicyText}
            className="inline-flex items-center gap-1.5 text-xs text-brand-700 hover:text-brand-950 font-medium px-2.5 py-1.5 rounded-lg hover:bg-brand-100 transition-colors cursor-pointer"
            title="Copy policy terms to clipboard"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          
          {/* TAB 1: OVERVIEW & RATES MATRIX */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Highlight Banner */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 p-5 rounded-2xl flex flex-col sm:flex-row gap-4 items-start shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif italic font-bold text-base text-amber-950">
                    50% Mandatory Production Deposit
                  </h3>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    Because bespoke jewelry is custom-tailored to unique client specifications, our studio requires a 
                    <strong> 50% non-refundable deposit</strong> to begin work. This deposit locks in precious metal spot market rates, 
                    reserves bench time, and commissions custom 3D CAD modeling and stone sourcing.
                  </p>
                </div>
              </div>

              {/* Rates Matrix Cards */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-brand-900 flex items-center gap-1.5">
                    <Layers size={14} className="text-brand-gold" />
                    Itemized Cancellation Cost Recovery Schedule
                  </h4>
                  <span className="text-[11px] text-slate-400 italic">Deducted from deposit upon cancellation</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* 1. CAD Design */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between hover:border-brand-300 transition-colors shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                        <Sparkles size={16} />
                      </div>
                      <span className="text-xs font-black font-mono text-blue-900 bg-blue-100/70 px-2 py-0.5 rounded-lg">
                        From $100.00
                      </span>
                    </div>
                    <div className="mt-3">
                      <h5 className="font-bold text-xs text-slate-900">3D CAD Modeling Fee</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Non-refundable once digital 3D sculpting, rendering, or engineering begins.
                      </p>
                    </div>
                  </div>

                  {/* 2. Wax Prints */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between hover:border-brand-300 transition-colors shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
                        <Layers size={16} />
                      </div>
                      <span className="text-xs font-black font-mono text-purple-900 bg-purple-100/70 px-2 py-0.5 rounded-lg">
                        $30.00 / mold
                      </span>
                    </div>
                    <div className="mt-3">
                      <h5 className="font-bold text-xs text-slate-900">3D Wax Prints & Molds</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Covers high-resolution resin printing, wax injection, and prototype sizing molds.
                      </p>
                    </div>
                  </div>

                  {/* 3. Casting Setup */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between hover:border-brand-300 transition-colors shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
                        <Flame size={16} />
                      </div>
                      <span className="text-xs font-black font-mono text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded-lg">
                        From $50.00
                      </span>
                    </div>
                    <div className="mt-3">
                      <h5 className="font-bold text-xs text-slate-900">Casting & Kiln Operations</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Investment plaster, overnight kiln burnout cycles, and casting machine pours.
                      </p>
                    </div>
                  </div>

                  {/* 4. Bench Labor */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between hover:border-brand-300 transition-colors shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <Hammer size={16} />
                      </div>
                      <span className="text-xs font-black font-mono text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded-lg">
                        $40.00 / hour
                      </span>
                    </div>
                    <div className="mt-3">
                      <h5 className="font-bold text-xs text-slate-900">Master Bench Artisan Labor</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Actual bench time accrued (fabrication, soldering, setting, assembly, and prep).
                      </p>
                    </div>
                  </div>

                  {/* 5. Master Alloy */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between hover:border-brand-300 transition-colors shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-100">
                        <Clock size={16} />
                      </div>
                      <span className="text-xs font-black font-mono text-rose-900 bg-rose-100/70 px-2 py-0.5 rounded-lg">
                        $20.00 / gram
                      </span>
                    </div>
                    <div className="mt-3">
                      <h5 className="font-bold text-xs text-slate-900">Master Alloy Formulations</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Custom metal deoxidizers, grain refiners, and karat alloying blends consumed.
                      </p>
                    </div>
                  </div>

                  {/* 6. Gold Spot Price */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between hover:border-brand-300 transition-colors shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-xl bg-yellow-50 text-yellow-700 border border-yellow-200">
                        <DollarSign size={16} />
                      </div>
                      <span className="text-xs font-black font-mono text-yellow-900 bg-yellow-100 px-2 py-0.5 rounded-lg">
                        Spot at Purchase Date
                      </span>
                    </div>
                    <div className="mt-3">
                      <h5 className="font-bold text-xs text-slate-900">Gold & Platinum Bullion</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Billed at the locked market rate on the purchase/casting date for committed grams.
                      </p>
                    </div>
                  </div>

                  {/* 7. Special Gemstones - Full Width */}
                  <div className="sm:col-span-2 lg:col-span-3 bg-red-50/70 border border-red-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-red-100 text-red-700 border border-red-200 shrink-0">
                        <Gem size={20} />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-red-950 flex items-center gap-1.5">
                          <span>Special-Order Diamonds & Colored Gemstones</span>
                          <span className="text-[10px] bg-red-200/80 text-red-900 font-black uppercase px-2 py-0.5 rounded-md">
                            Non-Returnable
                          </span>
                        </h5>
                        <p className="text-[11px] text-red-800/80 mt-0.5 leading-relaxed">
                          Natural diamonds, lab diamonds, and gemstones purchased or cut specifically for this project cannot be returned to suppliers. Clients retain ownership of purchased stones upon final balance settlement.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Policy Summary Callouts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-brand-50/50 p-4 rounded-2xl border border-brand-100 space-y-1.5">
                  <h5 className="font-bold text-xs text-brand-900 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-green-600" />
                    Remaining Deposit Balance Refund
                  </h5>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    If the total accrued expenses (as calculated above) are less than the 50% deposit paid, 
                    the unexpended funds will be refunded to the client within 7-10 business days.
                  </p>
                </div>

                <div className="bg-brand-50/50 p-4 rounded-2xl border border-brand-100 space-y-1.5">
                  <h5 className="font-bold text-xs text-brand-900 flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-amber-600" />
                    Completed Custom Work & Deliverables
                  </h5>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Completed custom jewelry, personalized engravings, and finalized sizing jobs are strictly 
                    <strong> final sale</strong> and not eligible for return once casting and final assembly are concluded.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPLETE LEGAL AGREEMENT */}
          {activeTab === 'legal' && (
            <div className="space-y-5 text-xs text-slate-700 leading-relaxed animate-fadeIn bg-slate-50/60 p-6 rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="font-serif italic font-bold text-base text-brand-950">
                  Custom Jewelry Commission & Repair Policy Agreement
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Effective Date: {new Date().toLocaleDateString()} • {storeName}
                </p>
              </div>

              <div className="space-y-4 text-justify">
                <section className="space-y-1">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    1. Scope of Custom Manufacturing
                  </h4>
                  <p>
                    Every bespoke jewelry commission, CAD engineered model, casting, and restoration is custom crafted to specific client design requests, finger measurements, and aesthetic instructions. Because materials and labor are irreversibly dedicated to each unique creation from the moment of authorization, standard retail return privileges do not apply.
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    2. Fifty Percent (50%) Production Deposit
                  </h4>
                  <p>
                    A non-refundable deposit equal to exactly fifty percent (50%) of the estimated total commission cost is mandatory prior to the commencement of 3D CAD modeling, digital rendering, wax printing, metal acquisition, or stone procurement. Receipt of deposit or authorized signature constitutes formal client approval to begin the manufacturing workflow.
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    3. Itemized Cancellation Expense Schedule
                  </h4>
                  <p>
                    Should the client elect to cancel, pause, or substantially alter the project after authorization, the 50% deposit shall be applied against all accrued materials, bench labor, and vendor commitments according to the following schedule:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 mt-1 font-mono text-[11px] text-slate-800">
                    <li><strong>3D CAD & Digital Modeling:</strong> Billed at a minimum initial design charge of $100.00.</li>
                    <li><strong>Prototype Resin & Wax Molds:</strong> Billed at $30.00 per mold or wax print generated.</li>
                    <li><strong>Casting & Tree Setup Operations:</strong> Billed starting at $50.00 per flask pour.</li>
                    <li><strong>Master Bench Artisan Labor:</strong> Billed at exactly $40.00 per hour for all bench, assembly, soldering, setting, and polishing time.</li>
                    <li><strong>Master Alloy Formulations:</strong> Billed at $20.00 per gram of alloy consumed in formulation.</li>
                    <li><strong>Precious Metal Bullion:</strong> Billed at the official market spot price on the purchase/casting date for all raw gold, platinum, or silver committed to the piece.</li>
                    <li><strong>Special-Order Gemstones & Diamonds:</strong> 100% non-refundable once sourced or cut. Unset gems will be released to the client upon final settlement.</li>
                  </ul>
                </section>

                <section className="space-y-1">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    4. Reconciliation of Balance
                  </h4>
                  <p>
                    In the event that total incurred charges under Section 3 are less than the 50% deposit paid, the excess balance shall be remitted to the client within seven to ten (7-10) business days. Should accrued costs exceed the deposit, the client shall remain obligated to satisfy the net outstanding balance prior to the release of any physical materials.
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    5. Final Sale & Warranty
                  </h4>
                  <p>
                    Completed custom jewelry, sized pieces, and completed repair jobs are strictly final sale. Workmanship is backed by our studio guarantee against structural defects under normal wear for 12 months from delivery date.
                  </p>
                </section>
              </div>
            </div>
          )}

          {/* TAB 3: INTERACTIVE CANCELLATION CALCULATOR */}
          {activeTab === 'calculator' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-amber-600" />
                  <h4 className="font-serif italic font-bold text-sm text-brand-950">
                    Live Cancellation & Deposit Refund Estimator
                  </h4>
                </div>
                <p className="text-xs text-slate-500">
                  Input accrued project parameters to simulate an itemized deduction and determine if a deposit refund or outstanding balance is due.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Inputs Column */}
                <div className="space-y-3 bg-white p-4 rounded-2xl border border-brand-100 shadow-sm">
                  <h5 className="font-bold text-xs text-brand-900 uppercase tracking-wider border-b pb-2">
                    Accrued Work & Materials
                  </h5>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        CAD Design Fee ($100 min)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={estCadHours}
                        onChange={(e) => setEstCadHours(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 font-mono text-xs focus:ring-1 focus:ring-brand-gold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Wax Molds ($30/ea)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={estWaxCount}
                        onChange={(e) => setEstWaxCount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 font-mono text-xs focus:ring-1 focus:ring-brand-gold outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Casting Pours ($50/ea)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={estCastingCount}
                        onChange={(e) => setEstCastingCount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 font-mono text-xs focus:ring-1 focus:ring-brand-gold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Bench Labor Hours ($40/hr)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={estBenchHours}
                        onChange={(e) => setEstBenchHours(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 font-mono text-xs focus:ring-1 focus:ring-brand-gold outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Alloy Grams ($20/g)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={estAlloyGrams}
                        onChange={(e) => setEstAlloyGrams(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 font-mono text-xs focus:ring-1 focus:ring-brand-gold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Gold Committed ($ spot)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={estGoldCost}
                        onChange={(e) => setEstGoldCost(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 font-mono text-xs focus:ring-1 focus:ring-brand-gold outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Stones Ordered ($ non-returnable)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={estStonesCost}
                        onChange={(e) => setEstStonesCost(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 font-mono text-xs focus:ring-1 focus:ring-brand-gold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-800 mb-1">
                        50% Deposit Paid ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={estDepositPaid}
                        onChange={(e) => setEstDepositPaid(e.target.value)}
                        className="w-full bg-amber-50 border border-amber-300 rounded-xl px-2.5 py-1.5 font-mono text-xs focus:ring-1 focus:ring-brand-gold outline-none font-bold text-amber-950"
                      />
                    </div>
                  </div>
                </div>

                {/* Results Column */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col justify-between shadow-md">
                  <div>
                    <h5 className="text-xs font-black uppercase tracking-wider text-brand-gold border-b border-white/10 pb-2 flex items-center justify-between">
                      <span>Deduction Reconciliation</span>
                      <span className="font-mono text-[10px] text-white/60">Auto-calculated</span>
                    </h5>

                    <div className="space-y-2 py-3 font-mono text-xs">
                      <div className="flex justify-between text-white/70">
                        <span>CAD Design Fee:</span>
                        <span>${cadCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>Wax Prints ({estWaxCount}x @ $30):</span>
                        <span>${waxCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>Casting Setup ({estCastingCount}x @ $50):</span>
                        <span>${castCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>Bench Labor ({estBenchHours}h @ $40):</span>
                        <span>${benchCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>Alloy ({estAlloyGrams}g @ $20):</span>
                        <span>${alloyCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>Gold Material (Spot):</span>
                        <span>${goldCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>Special Gemstone Orders:</span>
                        <span>${stonesCost.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-white/20 pt-2 flex justify-between font-bold text-amber-300">
                        <span>Total Incurred Deductions:</span>
                        <span>${totalIncurred.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border ${
                    netDifference >= 0 
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' 
                      : 'bg-red-950/60 border-red-500/40 text-red-200'
                  }`}>
                    <div className="text-[10px] font-black uppercase tracking-wider text-white/80">
                      {netDifference >= 0 ? 'Estimated Deposit Refund to Client' : 'Additional Balance Due from Client'}
                    </div>
                    <div className="text-2xl font-black font-mono mt-1">
                      {netDifference >= 0 ? `+$${netDifference.toFixed(2)}` : `-$${Math.abs(netDifference).toFixed(2)}`}
                    </div>
                    <div className="text-[10px] text-white/70 mt-1">
                      {netDifference >= 0 
                        ? 'Refundable to client after covering all incurred bench & material costs.' 
                        : 'Total incurred costs exceed deposit paid; client settles balance before stone release.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-50 border-t border-brand-100 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>Standard Gold & Rose Custom Terms • 50% Non-Refundable Production Deposit</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-brand-900 hover:bg-brand-950 text-brand-gold font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={13} />
              Print Policy
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>

      {/* HIDDEN HIGH-FIDELITY PRINTABLE SHEET (Targeted by printElement) */}
      <div id="refund-policy-printable-sheet" className="hidden print:block p-8 bg-white text-black font-sans text-xs">
        {/* Printable Letterhead */}
        <div className="border-b-2 border-black pb-4 mb-5 flex justify-between items-start">
          <div>
            <h1 className="font-serif italic font-black text-2xl uppercase tracking-wider">
              {storeName}
            </h1>
            <p className="text-[10px] uppercase tracking-widest font-mono text-gray-600">
              Luxury Fine Jewellery • CAD Atelier • Master Goldsmithing
            </p>
            <p className="text-[9px] text-gray-500 mt-1">
              {storeContact} • {storeAddress}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block border border-black px-2 py-0.5 text-[9px] font-black uppercase tracking-wider mb-1">
              Official Studio Policy Document
            </span>
            <p className="text-[9px] text-gray-600 font-mono">Date: {new Date().toLocaleDateString()}</p>
            {clientName && <p className="text-[9px] font-bold text-gray-800">Client: {clientName}</p>}
            {quoteRef && <p className="text-[9px] text-gray-600 font-mono">Ref #: {quoteRef}</p>}
          </div>
        </div>

        {/* Policy Header */}
        <div className="mb-4 text-center">
          <h2 className="text-base font-bold uppercase tracking-wider font-serif">
            Deposit, Cancellation & Refund Policy
          </h2>
          <p className="text-[10px] text-gray-600 italic">
            Applies to all Custom Manufacturing Commissions, 3D CAD Prototyping, and Specialized Repair Work
          </p>
        </div>

        {/* Core Principles */}
        <div className="border border-gray-300 p-3 rounded-lg bg-gray-50 mb-4 space-y-1.5">
          <h3 className="font-bold text-[11px] uppercase tracking-wider">
            1. Mandatory Fifty Percent (50%) Production Deposit
          </h3>
          <p className="text-[10px] text-gray-700 leading-relaxed">
            All custom jewelry pieces and CAD modeling commissions require a mandatory <strong>50% deposit</strong> upon design approval and quote authorization. This deposit serves to secure production scheduling, lock in precious metal market rates, commission custom 3D CAD modeling, and acquire specialized raw materials.
          </p>
        </div>

        {/* Itemized Schedule Table */}
        <div className="mb-5">
          <h3 className="font-bold text-[11px] uppercase tracking-wider mb-1.5">
            2. Itemized Cancellation Expense Schedule
          </h3>
          <p className="text-[9px] text-gray-600 mb-2">
            In the event of a client-initiated cancellation, the 50% deposit will be applied to cover all completed labor, materials, and services accrued to date according to the schedule below:
          </p>

          <table className="w-full border-collapse border border-gray-400 text-[10px]">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border border-gray-400 p-1.5 font-bold uppercase">Component / Service</th>
                <th className="border border-gray-400 p-1.5 font-bold uppercase w-32">Standard Rate</th>
                <th className="border border-gray-400 p-1.5 font-bold uppercase">Policy Terms</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-400 p-1.5 font-bold">3D CAD Modeling & Engineering</td>
                <td className="border border-gray-400 p-1.5 font-mono">From $100.00</td>
                <td className="border border-gray-400 p-1.5">Non-refundable once digital 3D sculpting has commenced.</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-400 p-1.5 font-bold">3D Wax Prints & Prototype Molds</td>
                <td className="border border-gray-400 p-1.5 font-mono">$30.00 / mold</td>
                <td className="border border-gray-400 p-1.5">Applies to all high-resolution resin prints and sizing models.</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-1.5 font-bold">Casting & Flask Kiln Operations</td>
                <td className="border border-gray-400 p-1.5 font-mono">From $50.00</td>
                <td className="border border-gray-400 p-1.5">Covers investment plaster, burnout cycle, and kiln cast runs.</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-400 p-1.5 font-bold">Master Artisan Bench Labor</td>
                <td className="border border-gray-400 p-1.5 font-mono">$40.00 / hour</td>
                <td className="border border-gray-400 p-1.5">Accrued time for fabrication, assembly, soldering, setting, prep.</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-1.5 font-bold">Master Alloy Formulations</td>
                <td className="border border-gray-400 p-1.5 font-mono">$20.00 / gram</td>
                <td className="border border-gray-400 p-1.5">Deoxidizers, karat refiners, and alloying metals blended.</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-400 p-1.5 font-bold">Precious Metals (Gold / Platinum)</td>
                <td className="border border-gray-400 p-1.5 font-mono">Market Spot Rate</td>
                <td className="border border-gray-400 p-1.5">Billed at purchase/casting date market price for committed grams.</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-1.5 font-bold text-red-900">Special Gemstone & Diamond Orders</td>
                <td className="border border-gray-400 p-1.5 font-mono text-red-900">Non-Refundable</td>
                <td className="border border-gray-400 p-1.5 text-red-900">Diamonds & gems purchased for custom order cannot be returned.</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Settlement & Finality */}
        <div className="space-y-2 mb-6 text-[9.5px] text-gray-800 leading-normal">
          <p>
            <strong>3. Settlement of Balances:</strong> If accrued labor and materials are less than the 50% deposit, the remaining balance will be refunded within 7-10 business days. If accrued costs exceed the deposit, the client is responsible for settling the outstanding balance before any materials or unmounted stones are released.
          </p>
          <p>
            <strong>4. Completed Custom Work:</strong> Finished custom jewelry pieces, personalized engravings, and completed repair jobs are strictly final sale and non-refundable once casting and final assembly are concluded.
          </p>
          <p>
            <strong>5. Craftsmanship Guarantee:</strong> All custom commissions include a 1-year master warranty against structural defects under normal wear and one complimentary sizing within 30 days of delivery.
          </p>
        </div>

        {/* Client Acceptance Signature Section */}
        <div className="border-t-2 border-black pt-4 mt-6">
          <p className="text-[9px] uppercase font-bold text-gray-600 mb-3">
            Client Acknowledgment & Agreement
          </p>
          <div className="grid grid-cols-2 gap-8 items-end">
            <div>
              <div className="border-b border-black h-10"></div>
              <p className="text-[9px] text-gray-500 mt-1 uppercase">Client Signature</p>
            </div>
            <div>
              <div className="border-b border-black h-10"></div>
              <p className="text-[9px] text-gray-500 mt-1 uppercase">Date</p>
            </div>
          </div>
          <p className="text-[8px] text-gray-500 italic mt-3 text-center">
            By signing above or providing the 50% deposit, client acknowledges and accepts the terms outlined in this Custom Order & Cancellation Policy.
          </p>
        </div>
      </div>

    </div>
  );
}
