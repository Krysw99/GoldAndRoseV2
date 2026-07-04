/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CategoryType, JewelryItem, QuoteSession, ScrapItem, AppSettings, ScrapTransaction } from './types';
import { DENSITIES, FANCY_SHAPES, ROUND_MELEE, TROY_ONCE_GRAMS } from './constants';

export function genId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function getEmptyRing(category: CategoryType): JewelryItem {
  const base: JewelryItem = {
    id: genId(),
    category,
    stoneSource: 'our',
    custCenterCt: '',
    custMeleeCount: '',
    material: 'gold',
    metalColor: 'Yellow',
    goldKarat: 14,
    fancy: [],
    melee: [],
    clientStones: [],
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
    referencePhotos: []
  };

  if (category === 'mensBand') {
    return {
      ...base,
      mbSize: '',
      mbWidth: '',
      mbThickness: '',
      goldGrams: ''
    };
  }
  if (category === 'pendant') {
    return {
      ...base,
      pDimensions: '',
      centerStone: { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' }
    };
  }
  if (category === 'tennisBracelet') {
    return {
      ...base,
      tbLength: 7.0,
      tbShape: 'Round',
      tbSizeRound: '2.0',
      tbSizeIdx: 0,
      tbManualStones: '',
      tbManualGrams: '',
      tbManualCarats: ''
    };
  }
  if (category === 'earrings') {
    return {
      ...base,
      backingType: 'Push backs',
      centerStone: { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' },
      centerStone2: { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' }
    };
  }

  // customRing or weddingBand
  return {
    ...base,
    cRingSize: '',
    cBandWidth: '',
    cBandThickness: '',
    centerStone: { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' }
  };
}

export function upgradeRingData(r: any): JewelryItem {
  const base = { ...r };
  if (!base.addons) {
    base.addons = (base.customAddon || base.customAddonDesc) 
      ? [{ fee: String(base.customAddon || ''), desc: String(base.customAddonDesc || '') }] 
      : [];
  }
  if (base.showEngraving === undefined) base.showEngraving = !!base.engravingText;
  if (base.engravingText === undefined) base.engravingText = '';
  if (!base.engravingFont) base.engravingFont = "'Times New Roman', Times, serif";
  if (base.discount === undefined) base.discount = '';
  if (!base.discountType) base.discountType = '$';
  if (!base.stoneSource) base.stoneSource = 'our';
  if (base.applyDesignFee === undefined) base.applyDesignFee = false;
  if (!base.clientStones) base.clientStones = [];
  
  if (!base.designNotes) {
    base.designNotes = [];
    if (base.ringNotes) {
      base.designNotes.push({ text: base.ringNotes });
      base.ringNotes = '';
    }
  }
  if (!base.fancy) base.fancy = [];
  if (!base.melee) base.melee = [];
  if (!base.metalColor) base.metalColor = 'Yellow';
  if (!base.centerStone && ['customRing', 'weddingBand', 'pendant', 'earrings'].includes(base.category)) {
    base.centerStone = { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' };
  } else if (base.centerStone) {
    if (!base.centerStone.type) base.centerStone.type = 'Diamond';
    if (!base.centerStone.origin) base.centerStone.origin = 'Lab';
  }
  if (base.category === 'earrings') {
    if (!base.backingType) base.backingType = 'Push backs';
    if (!base.centerStone2) {
      base.centerStone2 = { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' };
    } else {
      if (!base.centerStone2.type) base.centerStone2.type = 'Diamond';
      if (!base.centerStone2.origin) base.centerStone2.origin = 'Lab';
    }
  }
  if (!base.referenceSketches) {
    base.referenceSketches = base.referenceSketch ? [base.referenceSketch] : [];
  }
  if (!base.referencePhotos) {
    base.referencePhotos = base.referencePhoto ? [base.referencePhoto] : [];
  }
  return base as JewelryItem;
}

export function getEmptyQuoteSession(): QuoteSession {
  const r1 = getEmptyRing('customRing');
  return {
    id: genId(),
    cName: '',
    cPhone: '',
    cEmail: '',
    jobNum: '',
    jobDesc: '',
    applyTax: false,
    notes: '',
    activeSubTab: r1.id,
    rings: [r1],
    scrapCredit: 0,
    signatureImg: null,
    referenceSketch: null,
    referencePhoto: null
  };
}

export interface TennisEstimateResult {
  estStones: number;
  estGrams: number;
  caratPerStone: number;
}

export function getTennisEstimates(r: JewelryItem): TennisEstimateResult {
  let smm = 0;
  let cps = 0;
  if (r.tbShape === 'Round') {
    smm = Number(r.tbSizeRound) || 2.0;
    cps = ROUND_MELEE[String(r.tbSizeRound)] || 0.03;
  } else {
    const shape = r.tbShape || 'Princess';
    const aF = FANCY_SHAPES[shape] || FANCY_SHAPES['Princess'];
    const fd = aF[r.tbSizeIdx || 0] || aF[0];
    smm = parseFloat(fd.label) || 2.0;
    cps = fd.carat || 0.05;
  }
  
  if (!smm) return { estStones: 0, estGrams: 0, caratPerStone: 0 };
  
  // formulas based on user's original logic
  const bs = Math.round(177.8 / (smm + 0.4));
  const bg = (smm * 5) + 1;
  const lm = Number(r.tbLength || 7.0) / 7.0;
  
  let dm = 1.0;
  if (r.material === 'gold') {
    const densitiesGold = DENSITIES.gold as Record<number, number>;
    dm = (densitiesGold[r.goldKarat] || 13.1) / 13.1;
  } else if (r.material === 'platinum') {
    dm = DENSITIES.platinum / 13.1;
  } else if (r.material === 'silver') {
    dm = DENSITIES.silver / 13.1;
  }
  
  return {
    estStones: Math.round(bs * lm),
    estGrams: Number((bg * lm * dm).toFixed(2)),
    caratPerStone: cps
  };
}

export function calculateBandWeight(r: JewelryItem): string {
  if (r.category === 'mensBand') {
    const sz = Number(r.mbSize) || 0;
    const w = Number(r.mbWidth) || 0;
    const tk = Number(r.mbThickness) || 0;
    
    if (sz && w && tk) {
      const d = 11.63 + (0.8128 * sz);
      let v = (w * tk * Math.PI * (d + tk)) / 1000;
      
      // Apply profile volume multiplier
      const profile = r.mbProfile || 'Flat';
      let multiplier = 1.0;
      if (profile === 'Dome') {
        multiplier = 0.75;
      } else if (profile === 'HalfRound') {
        multiplier = 0.70;
      } else if (profile === 'Comfort') {
        multiplier = 0.85;
      } else if (profile === 'Beveled') {
        multiplier = 0.90;
      } else if (profile === 'KnifeEdge') {
        multiplier = 0.55;
      } else if (profile === 'Concave') {
        multiplier = 0.80;
      } else if (profile === 'StepEdge') {
        multiplier = 0.88;
      } else if (profile === 'Inlay') {
        multiplier = 0.82;
      }
      
      v = v * multiplier;

      let den = 13.1;
      if (r.material === 'gold') {
        const densitiesGold = DENSITIES.gold as Record<number, number>;
        den = densitiesGold[r.goldKarat] || 13.1;
      } else if (r.material === 'silver') {
        den = DENSITIES.silver;
      } else if (r.material === 'platinum') {
        den = DENSITIES.platinum;
      }
      return (v * den).toFixed(2);
    }
  } else if (r.category === 'customRing' || r.category === 'weddingBand') {
    const sz = Number(r.cRingSize) || 6.5;
    const w = Number(r.cBandWidth) || 2.0;
    const tk = Number(r.cBandThickness) || 1.5;
    
    if (sz && w && tk) {
      const d = 11.63 + (0.8128 * sz);
      let v = (w * tk * Math.PI * (d + tk)) / 1000;
      
      if (r.category === 'customRing') {
        v += 0.12; // head volume
      }
      
      const bandStyle = r.bandStyle || 'ChannelSet';
      let multiplier = 1.0;
      if (bandStyle === 'ChannelSet') multiplier = 1.00;
      else if (bandStyle === 'FrenchPave') multiplier = 1.02;
      else if (bandStyle === 'HoneycombPave') multiplier = 1.10;
      else if (bandStyle === 'ProngBasket') multiplier = 0.98;
      else if (bandStyle === 'SingleRowPave') multiplier = 1.04;
      else if (bandStyle === 'UCutPave') multiplier = 0.96;
      else if (bandStyle === 'ThreadGrain') multiplier = 1.05;
      
      v = v * multiplier;

      let den = 13.1;
      if (r.material === 'gold') {
        const densitiesGold = DENSITIES.gold as Record<number, number>;
        den = densitiesGold[r.goldKarat] || 13.1;
      } else if (r.material === 'silver') {
        den = DENSITIES.silver;
      } else if (r.material === 'platinum') {
        den = DENSITIES.platinum;
      }
      return (v * den).toFixed(2);
    }
  }
  return r.goldGrams;
}

export function hasRingData(r: JewelryItem): boolean {
  return !!(
    Number(r.goldGrams) > 0 ||
    Number(r.centerStone?.carats) > 0 ||
    Number(r.centerStone2?.carats) > 0 ||
    r.fancy.some(f => Number(f.qty) > 0) ||
    r.melee.some(m => Number(m.qty) > 0) ||
    r.addons.some(a => Number(a.fee) > 0) ||
    r.clientStones.some(c => Number(c.qty) > 0) ||
    Number(r.tbManualStones) > 0
  );
}

export function calculateWholesaleRingCost(r: JewelryItem, settings: AppSettings, spotPrices: { gold: number, silver: number, platinum: number }, overridePrices?: { gold?: number, silver?: number, platinum?: number }): number {
  let c = 0;
  const w = settings.wholesale;
  let g = Number(r.goldGrams) || 0;
  if (r.category === 'tennisBracelet' && !g) {
    g = getTennisEstimates(r).estGrams;
  }
  
  const sPGold = Number(overridePrices?.gold ?? spotPrices.gold);
  const sPPlat = Number(overridePrices?.platinum ?? spotPrices.platinum);
  const sPSilv = Number(overridePrices?.silver ?? spotPrices.silver);
  
  if (r.material === 'gold') {
    c += g * (((sPGold + Number(w.goldSpotPremium)) / TROY_ONCE_GRAMS) * (Number(r.goldKarat) / 24));
  } else if (r.material === 'platinum') {
    c += g * (((sPPlat + Number(w.goldSpotPremium)) / TROY_ONCE_GRAMS) * 0.95);
  } else if (r.material === 'silver') {
    c += g * (((sPSilv + Number(w.goldSpotPremium)) / TROY_ONCE_GRAMS) * 0.925);
  }
  
  // fab labor
  c += g * Number(w.laborPerGram);
  
  if (r.category === 'tennisBracelet') {
    const est = getTennisEstimates(r);
    const fs = Number(r.tbManualStones) || est.estStones;
    const fc = Number(r.tbManualCarats) || (fs * est.caratPerStone);
    
    const ppc = r.tbShape === 'Round' 
      ? (settings.wholesale.meleeRates?.[r.tbSizeRound || '2.0'] ?? settings.rawCostRates.melee ?? 350) 
      : (settings.wholesale.fancyRates?.[r.tbShape || 'Princess'] ?? settings.rawCostRates.fancy ?? 450);
      
    const settingFee = r.tbShape === 'Round'
      ? Number(w.settingMelee || 5)
      : Number(w.settingFancy || 8);
      
    if (r.stoneSource !== 'customer') {
      c += (fc * ppc) + (fs * settingFee);
    }
  } else {
    // setting & supplying melee stones
    let mQ = 0;
    let mC = 0;
    r.melee.forEach(m => {
      const q = Number(m.qty) || 0;
      const rate = Number(w.meleeRates?.[m.size] ?? 400);
      mQ += q;
      mC += q * Number(m.carat) * rate;
    });
    c += (mQ * Number(w.settingMelee)) + mC;
    
    // setting & supplying fancy stones
    let fQ = 0;
    let fC = 0;
    r.fancy.forEach(f => {
      const aF = FANCY_SHAPES[f.shape] || [];
      const fd = aF[f.sizeIdx] || { carat: 0, label: '' };
      const q = Number(f.qty) || 0;
      const key = fd.label ? `${f.shape}-${fd.label}` : '';
      const rate = Number((key && w.fancyRates?.[key]) ?? w.fancyRates?.[f.shape] ?? 500);
      fQ += q;
      fC += q * Number(fd.carat) * rate;
    });
    c += (fQ * Number(w.settingFancy)) + fC;
  }
  
  // Client Stones setting fee
  r.clientStones.forEach(cs => {
    const q = Number(cs.qty) || 0;
    if (cs.type === 'Center') {
      c += q * Number(w.settingCenter);
    } else if (cs.type === 'Fancy') {
      c += q * Number(w.settingFancy);
    } else {
      c += q * Number(w.settingMelee);
    }
  });
  
  if (r.applyDesignFee) {
    c += Number(w.designFee);
  }
  
  r.addons.forEach(a => {
    c += Number(a.fee) || 0;
  });
  
  return c;
}

export function calculateRingCost(r: JewelryItem, settings: AppSettings, spotPrices: { gold: number, silver: number, platinum: number }, mode: 'retail' | 'wholesale' = 'retail', overridePrices?: { gold?: number, silver?: number, platinum?: number }): number {
  if (!r) return 0;
  if (mode === 'wholesale') {
    return calculateWholesaleRingCost(r, settings, spotPrices, overridePrices);
  }
  
  let cM = 0;
  let g = Number(r.goldGrams) || 0;
  if (r.category === 'tennisBracelet' && !g) {
    g = getTennisEstimates(r).estGrams;
  }
  const aS = r.addons.reduce((acc, a) => acc + (Number(a.fee) || 0), 0);
  
  const sPGold = Number(overridePrices?.gold ?? spotPrices.gold);
  const sPPlat = Number(overridePrices?.platinum ?? spotPrices.platinum);
  const sPSilv = Number(overridePrices?.silver ?? spotPrices.silver);

  const rGoldPrem = Number(settings.retailGoldPremium !== undefined ? settings.retailGoldPremium : 100);
  const rSilverPrem = Number(settings.retailSilverPremium !== undefined ? settings.retailSilverPremium : 20);
  const rPlatPrem = Number(settings.retailPlatinumPremium !== undefined ? settings.retailPlatinumPremium : 100);

  if (r.material === 'gold') {
    const karat = Number(r.goldKarat) || 14;
    cM = g * (((sPGold + rGoldPrem) / 31.1034768) * (karat / 24));
  } else if (r.material === 'platinum') {
    cM = g * (((sPPlat + rPlatPrem) / 31.1034768) * 0.95);
  } else if (r.material === 'silver') {
    cM = g * (((sPSilv + rSilverPrem) / 31.1034768) * 0.925);
  }

  if (r.category === 'tennisBracelet') {
    let smm = 0;
    if (r.tbShape === 'Round') {
      smm = Number(r.tbSizeRound) || 2.0;
    } else {
      const shape = r.tbShape || 'Princess';
      const aF = FANCY_SHAPES[shape] || FANCY_SHAPES['Princess'];
      const fd = aF[r.tbSizeIdx || 0] || aF[0];
      smm = parseFloat(fd.label) || 2.0;
    }

    const multipliers = settings.tennisMultipliers || [
      { minWidth: 1.0, maxWidth: 1.9, multiplier: 1.6 },
      { minWidth: 2.0, maxWidth: 4.0, multiplier: 1.4 }
    ];

    const sortedRanges = [...multipliers].sort((a, b) => a.minWidth - b.minWidth);
    const match = sortedRanges.find(m => smm >= m.minWidth && smm <= m.maxWidth);
    let tennisMult = 1.0;
    if (match) {
      tennisMult = match.multiplier;
    } else if (sortedRanges.length > 0) {
      if (smm < sortedRanges[0].minWidth) {
        tennisMult = sortedRanges[0].multiplier;
      } else if (smm > sortedRanges[sortedRanges.length - 1].maxWidth) {
        tennisMult = sortedRanges[sortedRanges.length - 1].multiplier;
      }
    }
    cM = cM * tennisMult;
  }
  
  let cS = 0;
  if (r.category === 'tennisBracelet') {
    const est = getTennisEstimates(r);
    const fs = Number(r.tbManualStones) || est.estStones;
    const fc = Number(r.tbManualCarats) || (fs * est.caratPerStone);
    const ppc = settings.tennisDiamondPricePerCt !== undefined
      ? Number(settings.tennisDiamondPricePerCt)
      : (r.tbShape === 'Round' 
          ? Number(settings.tennisMeleePricePerCt) 
          : Number(settings.tennisFancyPricePerCt));
      
    if (r.stoneSource !== 'customer') {
      cS = (fc * ppc) + (fs * Number(settings.tennisLaborRetail || 0));
    }
  } else {
    const mR = r.category === 'earrings' 
      ? Number(settings.earringMeleePricePerCt) 
      : Number(settings.meleePricePerCt);
    const fR = r.category === 'earrings' 
      ? Number(settings.earringFancyPricePerCt) 
      : Number(settings.fancyPricePerCt);
      
    let mc = 0;
    r.melee.forEach(m => {
      mc += (Number(m.qty) || 0) * Number(m.carat);
    });
    const cMc = mc * mR;
    
    let fc = 0;
    r.fancy.forEach(f => {
      const aF = FANCY_SHAPES[f.shape] || [];
      const fd = aF[f.sizeIdx] || { carat: 0 };
      fc += (Number(f.qty) || 0) * Number(fd.carat) * fR;
    });
    
    let cC = 0;
    if (['customRing', 'pendant', 'earrings'].includes(r.category) && r.centerStone?.carats) {
      const cts = Number(r.centerStone.carats);
      if (r.centerStone.type && r.centerStone.origin) {
        cC = cts * Number(settings.centerStoneRates[r.centerStone.type]?.[r.centerStone.origin] ?? 1000);
      }
    }
    
    let cC2 = 0;
    if (r.category === 'earrings' && r.centerStone2?.carats) {
      const cts = Number(r.centerStone2.carats);
      if (r.centerStone2.type && r.centerStone2.origin) {
        cC2 = cts * Number(settings.centerStoneRates[r.centerStone2.type]?.[r.centerStone2.origin] ?? 1000);
      }
    }
    
    cS = cMc + (fc) + cC + cC2;
  }
  
  let cCF = 0;
  r.clientStones.forEach(c => {
    if (c.type === 'Center') {
      cCF += (Number(c.carats) || 0) * Number(settings.settingFeeCenterPerCt);
    } else {
      cCF += (Number(c.qty) || 0) * Number(settings.settingFeeMeleePerSt);
    }
  });
  
  return cM + cS + cCF + aS;
}

export function calculateRawCost(r: JewelryItem, settings: AppSettings, spotPrices: { gold: number, silver: number, platinum: number }): number {
  if (!r) return 0;
  const s = Number(spotPrices[r.material]) / TROY_ONCE_GRAMS;
  const pf = r.material === 'gold' 
    ? (Number(r.goldKarat) / 24) 
    : (r.material === 'silver' ? 0.925 : 0.950);
  let g = Number(r.goldGrams) || 0;
  if (r.category === 'tennisBracelet' && !g) {
    g = getTennisEstimates(r).estGrams;
  }
  const rM = g * s * pf;
  
  if (r.stoneSource === 'customer') return rM;
  
  if (r.category === 'tennisBracelet') {
    const est = getTennisEstimates(r);
    const fs = Number(r.tbManualStones) || est.estStones;
    const fc = Number(r.tbManualCarats) || (fs * est.caratPerStone);
    const ppcr = r.tbShape === 'Round' 
      ? Number(settings.tennisMeleePricePerCtRaw || settings.rawCostRates.melee) 
      : Number(settings.tennisFancyPricePerCtRaw || settings.rawCostRates.fancy);
    return (fs > 0 && fc > 0) ? (fc * ppcr) + rM : rM;
  }
  
  let rMc = 0;
  r.melee.forEach(m => {
    const q = Number(m.qty) || 0;
    const rate = Number(settings.rawMeleeRates?.[m.size] ?? settings.rawCostRates.melee);
    rMc += q * Number(m.carat) * rate;
  });
  
  let fc = 0;
  r.fancy.forEach(f => {
    const aF = FANCY_SHAPES[f.shape] || [];
    const fd = aF[f.sizeIdx] || { carat: 0, label: '' };
    const q = Number(f.qty) || 0;
    const key = fd.label ? `${f.shape}-${fd.label}` : '';
    const rate = Number((key && settings.rawFancyRates?.[key]) ?? settings.rawFancyRates?.[f.shape] ?? settings.rawCostRates.fancy);
    fc += q * Number(fd.carat) * rate;
  });
  
  let rC = 0;
  if (['customRing', 'pendant', 'earrings'].includes(r.category) && r.centerStone?.carats) {
    const cts = Number(r.centerStone.carats);
    if (r.centerStone.type && r.centerStone.origin) {
      rC = cts * Number(settings.centerStoneRawRates[r.centerStone.type]?.[r.centerStone.origin] ?? 500);
    } else {
      rC = cts * Number(settings.rawCostRates.center);
    }
  }
  
  let rC2 = 0;
  if (r.category === 'earrings' && r.centerStone2?.carats) {
    const cts = Number(r.centerStone2.carats);
    if (r.centerStone2.type && r.centerStone2.origin) {
      rC2 = cts * Number(settings.centerStoneRawRates[r.centerStone2.type]?.[r.centerStone2.origin] ?? 500);
    } else {
      rC2 = cts * Number(settings.rawCostRates.center);
    }
  }
  
  return rMc + fc + rC + rC2 + rM;
}

export function calculateScrapItemValue(item: ScrapItem, spotPrices: { gold: number, silver: number, platinum: number }): number {
  const w = Number(item.weight) || 0;
  const r = Number(item.rate) || 0;
  if (!w) return 0;
  const s = (spotPrices[item.material] || 0) / TROY_ONCE_GRAMS;
  const pf = item.material === 'gold' ? item.purity / 24 : item.purity;
  return w * pf * s * (r / 100);
}

export function calculateScrapTotal(scrapItems: ScrapItem[], spotPrices: { gold: number, silver: number, platinum: number }, stoneRemovalQty: string): number {
  const payout = scrapItems.reduce((total, item) => total + calculateScrapItemValue(item, spotPrices), 0);
  return Math.max(0, payout - (Number(stoneRemovalQty || 0) * 5));
}
