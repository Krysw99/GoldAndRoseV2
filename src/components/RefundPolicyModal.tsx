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
import { DEFAULT_CANCELLATION_POLICY } from '../constants';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'legal' | 'stoneWaiver' | 'calculator'>('overview');
  const [copied, setCopied] = useState(false);

  // Client-Owned Stone Intake Details (optional, populates printable waiver)
  const [waiverStoneType, setWaiverStoneType] = useState('');
  const [waiverStoneSpecs, setWaiverStoneSpecs] = useState('');
  const [waiverCertNumber, setWaiverCertNumber] = useState('');
  const [waiverConditionNotes, setWaiverConditionNotes] = useState('');

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

  // Resolve Deposit & Cancellation Policy rates from settings (with defaults)
  const policy = {
    ...DEFAULT_CANCELLATION_POLICY,
    ...(settings?.cancellationPolicy || {})
  };
  const resolveNum = (val: any, fallback: number) => {
    if (val === '' || val === undefined || val === null) return fallback;
    const n = Number(val);
    return isNaN(n) ? fallback : n;
  };
  const depositPercent = resolveNum(policy.depositPercent, DEFAULT_CANCELLATION_POLICY.depositPercent);
  const cadDesignFee = resolveNum(policy.cadDesignFee, DEFAULT_CANCELLATION_POLICY.cadDesignFee);
  const waxMoldFee = resolveNum(policy.waxMoldFee, DEFAULT_CANCELLATION_POLICY.waxMoldFee);
  const castingFee = resolveNum(policy.castingFee, DEFAULT_CANCELLATION_POLICY.castingFee);
  const benchLaborPerHour = resolveNum(policy.benchLaborPerHour, DEFAULT_CANCELLATION_POLICY.benchLaborPerHour);
  const alloyPerGram = resolveNum(policy.alloyPerGram, DEFAULT_CANCELLATION_POLICY.alloyPerGram);
  const refundProcessingDays = (policy.refundProcessingDays && String(policy.refundProcessingDays).trim()) || '7-10';
  const warrantyMonths = resolveNum(policy.warrantyMonths, DEFAULT_CANCELLATION_POLICY.warrantyMonths ?? 12);
  const complimentarySizingDays = resolveNum(policy.complimentarySizingDays, DEFAULT_CANCELLATION_POLICY.complimentarySizingDays ?? 30);

  // Calculator computations
  const cadUnits = parseFloat(estCadHours) || 0;
  const cadCost = cadUnits > 0 ? Math.max(cadDesignFee, cadUnits * cadDesignFee) : 0;
  const waxCost = (parseFloat(estWaxCount) || 0) * waxMoldFee;
  const castCost = Math.max(0, (parseFloat(estCastingCount) || 0) * castingFee);
  const benchCost = (parseFloat(estBenchHours) || 0) * benchLaborPerHour;
  const alloyCost = (parseFloat(estAlloyGrams) || 0) * alloyPerGram;
  const goldCost = parseFloat(estGoldCost) || 0;
  const stonesCost = parseFloat(estStonesCost) || 0;
  const totalIncurred = cadCost + waxCost + castCost + benchCost + alloyCost + goldCost + stonesCost;
  const depositPaidNum = parseFloat(estDepositPaid) || 0;
  const netDifference = depositPaidNum - totalIncurred;

  const handlePrint = () => {
    if (activeTab === 'stoneWaiver') {
      printElement('stone-waiver-printable-sheet');
    } else {
      printElement('refund-policy-printable-sheet');
    }
  };

  const handlePrintWaiver = () => {
    printElement('stone-waiver-printable-sheet');
  };

  const copyPolicyText = () => {
    const text = activeTab === 'stoneWaiver'
      ? `${storeName.toUpperCase()} — CLIENT-OWNED GEMSTONE & DIAMOND LIABILITY WAIVER AND RELEASE AGREEMENT
----------------------------------------------------------------------
Date: ${new Date().toLocaleDateString()}${clientName ? ` | Client: ${clientName}` : ''}${quoteRef ? ` | Ref #: ${quoteRef}` : ''}
${waiverStoneType || waiverStoneSpecs || waiverCertNumber || waiverConditionNotes ? `
CLIENT-SUPPLIED STONE INTAKE RECORD:
- Stone Type / Species: ${waiverStoneType || 'As presented at intake'}
- Shape / Est. Carat / Dimensions: ${waiverStoneSpecs || 'As presented at intake'}
- Lab Report / Laser Inscription #: ${waiverCertNumber || 'None provided / Unverified'}
- Pre-Existing Condition Notes: ${waiverConditionNotes || 'Visual intake only; subsurface condition unverified'}
` : ''}
1. ACKNOWLEDGMENT OF OWNERSHIP & UNVERIFIED CONDITION
The undersigned Client represents that they are the lawful owner (or authorized agent of the owner) of all loose or mounted diamonds, colored gemstones, or heirloom jewelry delivered to ${storeName} ("Studio") for unsetting, resetting, mounting, repair, sizing, retipping, cleaning, or modification ("Client-Owned Stones"). Client acknowledges that the Studio is not acting as a certified gemological testing laboratory and that standard visual magnification at intake cannot detect all subsurface fractures, cleavage planes, internal strain, thin/feathered girdles, clarity enhancements, glass/resin fracture fillings, oil/dye/heat/irradiation treatments, or hidden structural weaknesses.

2. INHERENT RISKS OF BENCH WORK, SETTING & UNSETTING
Client expressly understands and acknowledges that fine jewelry bench procedures — including prying/unsetting stones from existing mountings, prong/bezel/channel/flush/pavé setting, tightening, retipping, torch or laser soldering, steam or ultrasonic cleaning, rhodium/gold plating, and high-speed polishing — subject gemstones to unavoidable mechanical stress, pressure, vibration, thermal shock, and chemical exposure. Client acknowledges that even when performed with master-level skill and standard industry care, any stone (and particularly brittle, heavily included, sharp-cornered, antique, or treated stones such as emerald, opal, tanzanite, pearl, turquoise, tourmaline, topaz, zircon, kunzite, apatite, and clarity-enhanced/fracture-filled diamonds) may chip, crack, cleave, fracture, shift color, lose treatment/filling, or break completely during work.

3. VOLUNTARY ASSUMPTION OF RISK & FULL RELEASE OF LIABILITY
Client voluntarily assumes one hundred percent (100%) of all risk of damage, chipping, cracking, loss of clarity enhancement, color alteration, or total destruction of Client-Owned Stones during handling, unsetting, mounting, setting, repair, or finishing. To the fullest extent permitted by applicable law, Client hereby unconditionally releases, waives, discharges, and agrees to indemnify and hold harmless ${storeName}, its owners, officers, master goldsmiths, stone setters, contractors, and employees from any and all claims, demands, replacement costs, financial losses, sentimental value claims, or causes of action arising out of or relating to damage to Client-Owned Stones, except in cases of proven gross negligence or willful misconduct.

4. EXCLUSION FROM WARRANTY & CLIENT INSURANCE RESPONSIBILITY
Any Studio workmanship warranty covers solely metal fabrication and mounting components supplied by ${storeName} and expressly excludes damage, loosening, or loss attributable to pre-existing stone flaws, irregular cuts or thin girdles, or Client-Owned Stones. Client acknowledges that the Studio does not insure Client-Owned Stones against setting, unsetting, or bench-processing breakage and that Client bears sole responsibility for maintaining adequate personal jewelry insurance prior to drop-off and throughout production. Client waives all rights of subrogation by any insurer against ${storeName}.

5. DISCRETION TO PAUSE, MODIFY, OR DECLINE WORK
The Studio's master bench artisans reserve the right, in their sole professional judgment, to refuse, halt, or require protective design modifications (such as V-prongs, protective bezels, or CAD adjustments) if a Client-Owned Stone is determined to pose an unacceptable risk of failure. Should work be paused or cancelled under such circumstances, all completed CAD modeling, wax prints, casting, metal, and accrued bench labor remain billable in accordance with the Studio Deposit & Cancellation Policy.

6. STONE IDENTIFICATION, AUTHENTICITY & PICKUP VERIFICATION
${storeName} makes no warranty or representation as to the authenticity, natural vs. lab-grown origin, grade, carat weight, or market value of any Client-Owned Stone unless verified by an independent GIA/IGI/AGS certificate matched via laser inscription at intake. Client is responsible for inspecting and verifying all returned or mounted stones at pickup; signature or acceptance at delivery constitutes final acknowledgment that the correct stone(s) were returned in acceptable condition.

7. SEVERABILITY & BINDING EFFECT
If any provision of this Waiver is found unenforceable under applicable law, all remaining provisions shall remain in full force and effect. This Agreement is binding upon Client, Client's heirs, executors, legal representatives, assigns, and insurers.

By signing this waiver or authorizing bench work on Client-Owned Stones, Client affirms that they have read, understood, and voluntarily accepted all terms above.`
      : `${storeName} - CUSTOM ORDER, DEPOSIT & CANCELLATION REFUND POLICY
----------------------------------------------------------------------
1. ${depositPercent}% NON-REFUNDABLE PRODUCTION DEPOSIT
All custom design commissions, 3D CAD modeling, and bespoke jewelry work require a mandatory ${depositPercent}% deposit upon authorization prior to project commencement.

2. CANCELLATION DEDUCTION SCHEDULE
In the event of a client-initiated cancellation, the ${depositPercent}% deposit will be applied against all accrued labor, materials, and specialized services completed to date:
- CAD Design & 3D Engineering: Starting at $${cadDesignFee.toFixed(2)}
- 3D Wax Prototype Molds: $${waxMoldFee.toFixed(2)} per mold
- Casting & Flask Operation: Starting at $${castingFee.toFixed(2)} per cast
- Master Bench Artisan Labor: $${benchLaborPerHour.toFixed(2)} per hour
- Master Alloy Formulation: $${alloyPerGram.toFixed(2)} per gram
- Precious Metals (Gold/Platinum): Billed at purchase-date market spot price
- Special Gemstone/Diamond Orders: Strictly Non-Refundable (cannot be returned to wholesale cutters)

3. SETTLEMENT OF BALANCE
- If accumulated costs are less than the ${depositPercent}% deposit, the remaining balance will be returned within ${refundProcessingDays} business days.
- If accumulated costs exceed the ${depositPercent}% deposit, the client is responsible for settling the outstanding balance before any materials are released.
- Completed custom pieces, alterations, and engraved items are final sale.

4. CLIENT-OWNED STONE LIABILITY WAIVER
All client-supplied loose or mounted gemstones and diamonds are accepted strictly at the client's sole risk. ${storeName} assumes no liability for chipping, cracking, cleaving, treatment loss, or breakage of client-owned stones during unsetting, setting, soldering, cleaning, or repair.`;

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
                  {depositPercent}% Deposit
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
              title={activeTab === 'stoneWaiver' ? 'Print Official Stone Liability Waiver' : 'Print Official Policy Document'}
            >
              <Printer size={14} />
              <span className="hidden sm:inline">{activeTab === 'stoneWaiver' ? 'Print Stone Waiver' : 'Print Policy'}</span>
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
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-brand-100/70 rounded-xl border border-brand-200/70">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === 'legal'
                  ? 'bg-white text-brand-950 shadow-sm'
                  : 'text-brand-700 hover:text-brand-950 hover:bg-white/40'
              }`}
            >
              Formal Agreement
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stoneWaiver')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'stoneWaiver'
                  ? 'bg-white text-rose-950 shadow-sm ring-1 ring-rose-200'
                  : 'text-brand-700 hover:text-rose-900 hover:bg-white/40'
              }`}
            >
              <Gem size={13} className="text-rose-600" />
              <span>Stone Liability Waiver</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('calculator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all flex items-center gap-1 cursor-pointer ${
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
            title={activeTab === 'stoneWaiver' ? 'Copy stone liability waiver to clipboard' : 'Copy policy terms to clipboard'}
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            <span>{copied ? 'Copied to Clipboard' : (activeTab === 'stoneWaiver' ? 'Copy Waiver' : 'Copy Text')}</span>
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
                    {depositPercent}% Mandatory Production Deposit
                  </h3>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    Because bespoke jewelry is custom-tailored to unique client specifications, our studio requires a 
                    <strong> {depositPercent}% non-refundable deposit</strong> to begin work. This deposit locks in precious metal spot market rates, 
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
                        From ${cadDesignFee.toFixed(2)}
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
                        ${waxMoldFee.toFixed(2)} / mold
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
                        From ${castingFee.toFixed(2)}
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
                        ${benchLaborPerHour.toFixed(2)} / hour
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
                        ${alloyPerGram.toFixed(2)} / gram
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
                    If the total accrued expenses (as calculated above) are less than the {depositPercent}% deposit paid, 
                    the unexpended funds will be refunded to the client within {refundProcessingDays} business days.
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

              {/* Client-Owned Stone Liability Quick Banner */}
              <div className="bg-rose-50/70 border border-rose-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                    <Gem size={18} />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-rose-950">
                      Supplying Your Own Diamond or Gemstone?
                    </h5>
                    <p className="text-[11px] text-rose-900/80 mt-0.5 leading-snug">
                      All client-owned stones accepted for setting, unsetting, or repair require review and acknowledgment of our formal Stone Liability Waiver & Release Agreement.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('stoneWaiver')}
                  className="px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold uppercase tracking-wider shrink-0 transition-colors cursor-pointer shadow-xs"
                >
                  Open Stone Waiver
                </button>
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
                    2. {depositPercent}% Production Deposit
                  </h4>
                  <p>
                    A non-refundable deposit equal to {depositPercent}% of the estimated total commission cost is mandatory prior to the commencement of 3D CAD modeling, digital rendering, wax printing, metal acquisition, or stone procurement. Receipt of deposit or authorized signature constitutes formal client approval to begin the manufacturing workflow.
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    3. Itemized Cancellation Expense Schedule
                  </h4>
                  <p>
                    Should the client elect to cancel, pause, or substantially alter the project after authorization, the {depositPercent}% deposit shall be applied against all accrued materials, bench labor, and vendor commitments according to the following schedule:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 mt-1 font-mono text-[11px] text-slate-800">
                    <li><strong>3D CAD & Digital Modeling:</strong> Billed at a minimum initial design charge of ${cadDesignFee.toFixed(2)}.</li>
                    <li><strong>Prototype Resin & Wax Molds:</strong> Billed at ${waxMoldFee.toFixed(2)} per mold or wax print generated.</li>
                    <li><strong>Casting & Tree Setup Operations:</strong> Billed starting at ${castingFee.toFixed(2)} per flask pour.</li>
                    <li><strong>Master Bench Artisan Labor:</strong> Billed at exactly ${benchLaborPerHour.toFixed(2)} per hour for all bench, assembly, soldering, setting, and polishing time.</li>
                    <li><strong>Master Alloy Formulations:</strong> Billed at ${alloyPerGram.toFixed(2)} per gram of alloy consumed in formulation.</li>
                    <li><strong>Precious Metal Bullion:</strong> Billed at the official market spot price on the purchase/casting date for all raw gold, platinum, or silver committed to the piece.</li>
                    <li><strong>Special-Order Gemstones & Diamonds:</strong> 100% non-refundable once sourced or cut. Unset gems will be released to the client upon final settlement.</li>
                  </ul>
                </section>

                <section className="space-y-1">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    4. Reconciliation of Balance
                  </h4>
                  <p>
                    In the event that total incurred charges under Section 3 are less than the {depositPercent}% deposit paid, the excess balance shall be remitted to the client within {refundProcessingDays} business days. Should accrued costs exceed the deposit, the client shall remain obligated to satisfy the net outstanding balance prior to the release of any physical materials.
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    5. Final Sale & Warranty
                  </h4>
                  <p>
                    Completed custom jewelry, sized pieces, and completed repair jobs are strictly final sale. Workmanship is backed by our studio guarantee against structural defects under normal wear for {warrantyMonths} months from delivery date.
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-bold text-rose-900 uppercase tracking-wider text-[11px]">
                    6. Client-Owned Gemstone & Diamond Liability Waiver
                  </h4>
                  <p>
                    Any loose or mounted gemstone, diamond, or heirloom piece supplied by the client is accepted for unsetting, mounting, setting, soldering, cleaning, or repair strictly at the client's sole risk. Because pre-existing subsurface fractures, cleavage planes, internal strain, and prior treatments cannot always be detected through standard intake inspection, {storeName} assumes no financial or replacement liability for chipping, cracking, cleaving, treatment loss, or breakage of client-supplied stones during bench operations, except in cases of proven gross negligence or willful misconduct. See the standalone <strong>Client-Owned Stone Liability Waiver</strong> tab for full legal release terms and printable sign-off.
                  </p>
                </section>
              </div>
            </div>
          )}

          {/* TAB 3: CLIENT-OWNED STONE LIABILITY WAIVER & RELEASE AGREEMENT */}
          {activeTab === 'stoneWaiver' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Risk Warning Header Banner */}
              <div className="bg-gradient-to-br from-rose-50 to-amber-50/70 border border-rose-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                    <Gem className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif italic font-bold text-base text-rose-950">
                        Client-Owned Stone Liability Waiver & Release
                      </h3>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-full">
                        Legal Release
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-900/80 mt-0.5 leading-relaxed">
                      Formal assumption-of-risk and release agreement for client-supplied diamonds, colored gemstones, and heirloom stones submitted for setting, unsetting, or bench servicing.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePrintWaiver}
                  className="px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-sm transition-colors cursor-pointer"
                >
                  <Printer size={13} />
                  Print Waiver
                </button>
              </div>

              {/* Optional Stone Intake Details (populates printable waiver) */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-brand-900 flex items-center gap-1.5">
                    <FileText size={13} className="text-brand-gold" />
                    Client-Supplied Stone Intake Record (Optional — Prints on Waiver)
                  </h4>
                  <span className="text-[10px] text-slate-400 italic">Leave blank for handwritten counter intake</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Stone Type / Species
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Natural Diamond, Emerald, Blue Sapphire"
                      value={waiverStoneType}
                      onChange={(e) => setWaiverStoneType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-brand-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Shape, Est. Carat & Dimensions
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Oval 2.15ct, 9.4 x 7.1 mm (loose / mounted)"
                      value={waiverStoneSpecs}
                      onChange={(e) => setWaiverStoneSpecs(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-brand-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Lab Report / Laser Inscription #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GIA #2141438171 (or None / Unverified)"
                      value={waiverCertNumber}
                      onChange={(e) => setWaiverCertNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-brand-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Observed Pre-Existing Conditions / Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Minor girdle chip at 4 o'clock, visible feather"
                      value={waiverConditionNotes}
                      onChange={(e) => setWaiverConditionNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-brand-gold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Full Legal Waiver Document */}
              <div className="space-y-4 text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-6 rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-serif italic font-bold text-base text-brand-950">
                      Client-Owned Gemstone & Diamond Liability Waiver and Release Agreement
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Effective Date: {new Date().toLocaleDateString()} • {storeName}
                    </p>
                  </div>
                  {clientName && (
                    <span className="text-[11px] font-bold text-brand-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                      Client: {clientName}
                    </span>
                  )}
                </div>

                <div className="space-y-4 text-justify">
                  <section className="space-y-1">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Article 1. Acknowledgment of Ownership & Unverified Condition
                    </h4>
                    <p>
                      The undersigned Client represents and warrants that they are the lawful owner (or duly authorized agent of the lawful owner) of all loose or mounted diamonds, colored gemstones, pearls, or heirloom jewelry delivered to <strong>{storeName}</strong> ("Studio") for unsetting, resetting, custom mounting, stone setting, ring sizing, prong retipping, soldering, cleaning, or repair ("Client-Owned Stones"). Client acknowledges that the Studio is not acting as a certified gemological testing or appraisal laboratory, and that standard visual magnification at intake cannot detect all subsurface fractures, internal cleavage planes, crystalline strain, ultra-thin or feathered girdles, laser-drilled channels, fracture fillings (glass, lead-glass, resin, or oil), clarity enhancements, or prior heat/irradiation treatments.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Article 2. Inherent Risks of Jewelry Bench Work, Setting & Unsetting
                    </h4>
                    <p>
                      Client expressly understands and acknowledges that fine jewelry bench procedures — including prying or unsetting stones from existing mountings, prong, bezel, flush, channel, or micro-pavé setting, tightening loose stones, prong retipping, torch or laser soldering, rhodium or gold plating, steam or ultrasonic cleaning, and high-speed wheel polishing — subject gemstones to unavoidable mechanical pressure, direct tool contact, vibration, thermal shock, and chemical exposure. Even when performed with master-level craftsmanship and standard industry care, any stone may chip, crack, cleave, abrade, shift color, lose clarity enhancement/filling, or suffer complete breakage. Client acknowledges elevated inherent fragility in heat-sensitive, brittle, heavily included, antique, sharp-cornered (including princess, marquise, pear, and trillion cuts), and treated gemstones, including but not limited to emerald, opal, tanzanite, pearl, turquoise, tourmaline, kunzite, apatite, zircon, topaz, and clarity-enhanced diamonds.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-rose-950 uppercase tracking-wider text-[11px]">
                      Article 3. Voluntary Assumption of Risk & Full Release of Liability
                    </h4>
                    <p>
                      Client voluntarily assumes <strong>one hundred percent (100%) of the risk</strong> of any chipping, cracking, cleaving, scratching, color alteration, loss of fracture filling or enhancement, or total destruction of any Client-Owned Stone during intake, storage, unsetting, custom fabrication, stone setting, repair, or finishing. To the fullest extent permitted by applicable law, Client hereby unconditionally releases, waives, discharges, and agrees to indemnify and hold harmless <strong>{storeName}</strong>, its owners, officers, directors, master goldsmiths, stone setters, contractors, and employees from any and all claims, demands, replacement obligations, diminution-in-value claims, sentimental or heirloom damages, or financial liability arising out of or relating to damage to Client-Owned Stones, except to the extent caused solely by proven gross negligence or willful misconduct.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Article 4. Exclusion from Studio Warranty & Client Insurance Obligation
                    </h4>
                    <p>
                      Any Studio workmanship warranty covers solely metal fabrication and mounting components supplied by {storeName} and expressly excludes any damage, loosening, or loss of Client-Owned Stones resulting from pre-existing structural weaknesses, irregular cuts, thin girdles, or inherent material characteristics. Client acknowledges that <strong>{storeName} does not insure Client-Owned Stones against setting, unsetting, or bench-processing breakage</strong>. Client bears sole responsibility for maintaining personal jewelry insurance (such as scheduled personal property coverage) prior to drop-off and throughout production, and Client hereby waives all rights of subrogation by any insurer against {storeName}.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Article 5. Studio Right to Refuse, Pause, or Require Protective Modifications
                    </h4>
                    <p>
                      Master bench artisans reserve sole professional discretion to refuse, pause, or require protective design adjustments (including V-tip prongs, protective bezel settings, or modified gallery/CAD specifications) if a Client-Owned Stone is determined during bench work to pose an unacceptable risk of structural failure. If Client declines recommended safety modifications or elects to cancel the commission, all completed CAD modeling, wax molds, casting, committed metal, and accrued bench labor remain payable under the Studio Deposit & Cancellation Policy.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Article 6. Stone Identification, Authenticity & Final Pickup Inspection
                    </h4>
                    <p>
                      {storeName} makes no representation, certification, or guarantee regarding the authenticity, natural versus laboratory-grown origin, quality grade, exact carat weight, or market value of any Client-Owned Stone unless verified at intake against an independent GIA, IGI, or AGS grading report matched by microscopic laser inscription. Client agrees to inspect and verify all mounted or returned stones at pickup; signature or acceptance of the completed piece constitutes final, conclusive acknowledgment that the correct stone(s) have been returned in satisfactory condition.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Article 7. Severability, Waiver of Subrogation & Binding Effect
                    </h4>
                    <p>
                      If any clause or portion of this Waiver is held invalid or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect. This Agreement constitutes the entire understanding regarding Client-Owned Stone liability, supersedes any prior oral statements, and is legally binding upon the Client and Client's heirs, executors, personal representatives, assigns, and insurers.
                    </p>
                  </section>
                </div>
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
                        CAD Design Units (${cadDesignFee} min)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={estCadHours}
                        onChange={(e) => setEstCadHours(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 font-mono text-xs focus:ring-1 focus:ring-brand-gold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Wax Molds (${waxMoldFee}/ea)
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
                        Casting Pours (${castingFee}/ea)
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
                        Bench Labor Hours (${benchLaborPerHour}/hr)
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
                        Alloy Grams (${alloyPerGram}/g)
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
                        {depositPercent}% Deposit Paid ($)
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
                        <span>CAD Design Fee ({estCadHours}x @ ${cadDesignFee}):</span>
                        <span>${cadCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>Wax Prints ({estWaxCount}x @ ${waxMoldFee}):</span>
                        <span>${waxCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>Casting Setup ({estCastingCount}x @ ${castingFee}):</span>
                        <span>${castCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>Bench Labor ({estBenchHours}h @ ${benchLaborPerHour}):</span>
                        <span>${benchCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>Alloy ({estAlloyGrams}g @ ${alloyPerGram}):</span>
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
            <span>Standard {storeName} Custom Terms • {depositPercent}% Non-Refundable Production Deposit</span>
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab !== 'stoneWaiver' && (
              <button
                type="button"
                onClick={handlePrintWaiver}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Print standalone Client-Owned Stone Liability Waiver"
              >
                <Gem size={13} className="text-rose-600" />
                Print Stone Waiver
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-brand-900 hover:bg-brand-950 text-brand-gold font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={13} />
              {activeTab === 'stoneWaiver' ? 'Print Stone Waiver' : 'Print Policy'}
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
            1. Mandatory {depositPercent}% Production Deposit
          </h3>
          <p className="text-[10px] text-gray-700 leading-relaxed">
            All custom jewelry pieces and CAD modeling commissions require a mandatory <strong>{depositPercent}% deposit</strong> upon design approval and quote authorization. This deposit serves to secure production scheduling, lock in precious metal market rates, commission custom 3D CAD modeling, and acquire specialized raw materials.
          </p>
        </div>

        {/* Itemized Schedule Table */}
        <div className="mb-5">
          <h3 className="font-bold text-[11px] uppercase tracking-wider mb-1.5">
            2. Itemized Cancellation Expense Schedule
          </h3>
          <p className="text-[9px] text-gray-600 mb-2">
            In the event of a client-initiated cancellation, the {depositPercent}% deposit will be applied to cover all completed labor, materials, and services accrued to date according to the schedule below:
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
                <td className="border border-gray-400 p-1.5 font-mono">From ${cadDesignFee.toFixed(2)}</td>
                <td className="border border-gray-400 p-1.5">Non-refundable once digital 3D sculpting has commenced.</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-400 p-1.5 font-bold">3D Wax Prints & Prototype Molds</td>
                <td className="border border-gray-400 p-1.5 font-mono">${waxMoldFee.toFixed(2)} / mold</td>
                <td className="border border-gray-400 p-1.5">Applies to all high-resolution resin prints and sizing models.</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-1.5 font-bold">Casting & Flask Kiln Operations</td>
                <td className="border border-gray-400 p-1.5 font-mono">From ${castingFee.toFixed(2)}</td>
                <td className="border border-gray-400 p-1.5">Covers investment plaster, burnout cycle, and kiln cast runs.</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-400 p-1.5 font-bold">Master Artisan Bench Labor</td>
                <td className="border border-gray-400 p-1.5 font-mono">${benchLaborPerHour.toFixed(2)} / hour</td>
                <td className="border border-gray-400 p-1.5">Accrued time for fabrication, assembly, soldering, setting, prep.</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-1.5 font-bold">Master Alloy Formulations</td>
                <td className="border border-gray-400 p-1.5 font-mono">${alloyPerGram.toFixed(2)} / gram</td>
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
            <strong>3. Settlement of Balances:</strong> If accrued labor and materials are less than the {depositPercent}% deposit, the remaining balance will be refunded within {refundProcessingDays} business days. If accrued costs exceed the deposit, the client is responsible for settling the outstanding balance before any materials or unmounted stones are released.
          </p>
          <p>
            <strong>4. Completed Custom Work:</strong> Finished custom jewelry pieces, personalized engravings, and completed repair jobs are strictly final sale and non-refundable once casting and final assembly are concluded.
          </p>
          <p>
            <strong>5. Craftsmanship Guarantee:</strong> All custom commissions include a {warrantyMonths}-month master warranty against structural defects under normal wear and one complimentary sizing within {complimentarySizingDays} days of delivery.
          </p>
          <p>
            <strong>6. Client-Owned Stone Liability:</strong> Client-supplied diamonds and gemstones submitted for unsetting, setting, soldering, cleaning, or repair are accepted strictly at client's sole risk. {storeName} assumes no liability for chipping, cracking, cleaving, treatment loss, or breakage arising from inherent stone fragility or pre-existing subsurface flaws.
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
            By signing above or providing the {depositPercent}% deposit, client acknowledges and accepts the terms outlined in this Custom Order & Cancellation Policy.
          </p>
        </div>
      </div>

      {/* HIDDEN HIGH-FIDELITY PRINTABLE CLIENT-OWNED STONE LIABILITY WAIVER (Targeted by printElement) */}
      <div id="stone-waiver-printable-sheet" className="hidden print:block p-7 bg-white text-black font-sans text-xs">
        {/* Printable Letterhead */}
        <div className="border-b-2 border-black pb-3 mb-4 flex justify-between items-start">
          <div>
            <h1 className="font-serif italic font-black text-2xl uppercase tracking-wider">
              {storeName}
            </h1>
            <p className="text-[9.5px] uppercase tracking-widest font-mono text-gray-600">
              Luxury Fine Jewellery • CAD Atelier • Master Goldsmithing
            </p>
            <p className="text-[9px] text-gray-500 mt-0.5">
              {storeContact} • {storeAddress}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block border border-black px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider mb-1">
              Official Stone Liability Waiver
            </span>
            <p className="text-[9px] text-gray-600 font-mono">Date: {new Date().toLocaleDateString()}</p>
            {clientName && <p className="text-[9px] font-bold text-gray-800">Client: {clientName}</p>}
            {quoteRef && <p className="text-[9px] text-gray-600 font-mono">Ref #: {quoteRef}</p>}
          </div>
        </div>

        {/* Document Title */}
        <div className="mb-3.5 text-center">
          <h2 className="text-[15px] font-bold uppercase tracking-wider font-serif">
            Client-Owned Gemstone & Diamond Liability Waiver and Release Agreement
          </h2>
          <p className="text-[9.5px] text-gray-600 italic">
            Assumption of Risk, Unverified Intake Condition & Release of Liability for Client-Supplied Stones
          </p>
        </div>

        {/* Client-Supplied Stone Intake Table */}
        <div className="mb-4">
          <h3 className="font-bold text-[10px] uppercase tracking-wider mb-1">
            Client-Supplied Stone Intake Record
          </h3>
          <table className="w-full border-collapse border border-gray-400 text-[9.5px]">
            <tbody>
              <tr>
                <td className="border border-gray-400 p-1.5 font-bold bg-gray-100 w-36">Client Name</td>
                <td className="border border-gray-400 p-1.5">{clientName || ' '}</td>
                <td className="border border-gray-400 p-1.5 font-bold bg-gray-100 w-36">Order / Quote Ref #</td>
                <td className="border border-gray-400 p-1.5 font-mono">{quoteRef || ' '}</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-1.5 font-bold bg-gray-100">Stone Type / Species</td>
                <td className="border border-gray-400 p-1.5">{waiverStoneType || ' '}</td>
                <td className="border border-gray-400 p-1.5 font-bold bg-gray-100">Shape / Ct / Dimensions</td>
                <td className="border border-gray-400 p-1.5">{waiverStoneSpecs || ' '}</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-1.5 font-bold bg-gray-100">Lab Cert / Inscription #</td>
                <td className="border border-gray-400 p-1.5 font-mono">{waiverCertNumber || ' '}</td>
                <td className="border border-gray-400 p-1.5 font-bold bg-gray-100">Pre-Existing Notes</td>
                <td className="border border-gray-400 p-1.5">{waiverConditionNotes || ' '}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legal Articles */}
        <div className="space-y-2.5 text-[9.2px] text-gray-800 leading-snug text-justify mb-4">
          <p>
            <strong>1. Ownership & Unverified Intake Condition:</strong> The undersigned Client represents that they are the lawful owner (or authorized agent of the owner) of all loose or mounted diamonds, colored gemstones, pearls, or heirloom items ("Client-Owned Stones") delivered to <strong>{storeName}</strong> ("Studio") for unsetting, resetting, custom mounting, setting, sizing, retipping, soldering, cleaning, or repair. Client acknowledges that the Studio is not acting as a certified gemological laboratory and that visual intake inspection under standard magnification cannot detect all subsurface fractures, cleavage planes, internal strain, ultra-thin or feathered girdles, laser-drilled channels, fracture fillings (glass, resin, or oil), clarity enhancements, or prior heat/irradiation treatments.
          </p>
          <p>
            <strong>2. Inherent Risks of Bench Operations:</strong> Client expressly acknowledges that jewelry bench work — including prying/unsetting stones, prong/bezel/channel/flush/pavé setting, tightening, retipping, torch or laser soldering, rhodium/gold plating, ultrasonic/steam cleaning, and polishing — involves unavoidable mechanical pressure, vibration, thermal shock, and chemical exposure. Even with master-level care, any stone (especially brittle, heavily included, sharp-cornered fancy cuts, antique, or treated stones such as emerald, opal, tanzanite, pearl, turquoise, tourmaline, topaz, zircon, kunzite, apatite, and clarity-enhanced diamonds) may chip, crack, cleave, shift color, lose treatment/filling, or break completely.
          </p>
          <p>
            <strong>3. Voluntary Assumption of Risk & Release of Liability:</strong> Client voluntarily assumes <strong>100% of the risk</strong> of any damage, chipping, cracking, cleaving, treatment loss, or destruction of Client-Owned Stones during handling, unsetting, setting, fabrication, repair, or finishing. To the fullest extent permitted by law, Client unconditionally releases, waives, discharges, and agrees to indemnify and hold harmless <strong>{storeName}</strong>, its owners, officers, master goldsmiths, stone setters, contractors, and employees from any and all claims, replacement costs, diminution-in-value claims, sentimental damages, or financial liability arising from damage to Client-Owned Stones, except in cases of proven gross negligence or willful misconduct.
          </p>
          <p>
            <strong>4. No Warranty on Client Stones & Insurance Responsibility:</strong> Studio workmanship warranty applies solely to metal fabrication and mounting components supplied by {storeName} and expressly excludes damage, loosening, or loss attributable to pre-existing flaws, irregular cuts/girdles, or Client-Owned Stones. <strong>{storeName} does not insure Client-Owned Stones against setting, unsetting, or bench-processing breakage.</strong> Client is solely responsible for maintaining personal jewelry insurance prior to drop-off and throughout production, and waives all insurer rights of subrogation against {storeName}.
          </p>
          <p>
            <strong>5. Discretion to Pause or Modify Work:</strong> Master bench artisans reserve sole professional discretion to decline, halt, or require protective design adjustments (e.g., V-prongs, protective bezels, or CAD revisions) if a Client-Owned Stone is deemed structurally unsafe. Completed CAD, wax, casting, metal, and accrued labor remain billable under the Studio Deposit & Cancellation Policy.
          </p>
          <p>
            <strong>6. Stone Identification & Pickup Verification:</strong> {storeName} makes no guarantee regarding authenticity, natural vs. lab-grown origin, grade, weight, or value unless matched via laser inscription to an independent GIA/IGI/AGS certificate at intake. Client agrees to inspect and verify all returned or mounted stones at pickup; signature or acceptance at delivery constitutes final acknowledgment of satisfactory return.
          </p>
          <p>
            <strong>7. Severability & Binding Effect:</strong> If any provision herein is found unenforceable, remaining provisions shall remain in full force. This Agreement supersedes prior oral statements and binds Client, Client's heirs, personal representatives, assigns, and insurers.
          </p>
        </div>

        {/* Client Initials Confirmation Box */}
        <div className="border border-gray-400 bg-gray-50 p-2.5 rounded mb-4 text-[9px] space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block w-8 border-b border-black text-center font-mono">&nbsp;</span>
            <span><strong>Client Initials:</strong> I acknowledge that my stone(s) are accepted strictly at my own risk and are not insured by {storeName} against bench breakage.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-8 border-b border-black text-center font-mono">&nbsp;</span>
            <span><strong>Client Initials:</strong> I have read, understood, and voluntarily release {storeName} from liability for chipping, cracking, or breakage as set forth above.</span>
          </div>
        </div>

        {/* Dual Signature Block */}
        <div className="border-t-2 border-black pt-3 mt-4">
          <p className="text-[8.5px] uppercase font-bold text-gray-600 mb-3">
            Client Execution & Studio Intake Verification
          </p>
          <div className="grid grid-cols-2 gap-8 items-end mb-4">
            <div>
              <div className="border-b border-black h-9"></div>
              <p className="text-[8.5px] text-gray-600 mt-1 uppercase">Client Signature</p>
            </div>
            <div>
              <div className="border-b border-black h-9"></div>
              <p className="text-[8.5px] text-gray-600 mt-1 uppercase">Client Printed Name & Date</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 items-end">
            <div>
              <div className="border-b border-black h-8"></div>
              <p className="text-[8.5px] text-gray-600 mt-1 uppercase">Studio Intake Representative ({storeName})</p>
            </div>
            <div>
              <div className="border-b border-black h-8"></div>
              <p className="text-[8.5px] text-gray-600 mt-1 uppercase">Date & Intake Time</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
