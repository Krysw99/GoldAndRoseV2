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
      mbSize: '8.0',
      mbWidth: '5.0',
      mbThickness: '1.7',
      mbProfile: 'Flat',
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
  if (base.category === 'mensBand') {
    if (base.mbSize === undefined || base.mbSize === '') base.mbSize = '8.0';
    if (base.mbWidth === undefined || base.mbWidth === '') base.mbWidth = '5.0';
    if (base.mbThickness === undefined || base.mbThickness === '') base.mbThickness = '1.7';
    if (base.mbProfile === undefined || base.mbProfile === '') base.mbProfile = 'Flat';
  }
  return base as JewelryItem;
}

export function getEmptyQuoteSession(): QuoteSession {
  return {
    id: genId(),
    cName: '',
    cPhone: '',
    cEmail: '',
    jobNum: '',
    jobDesc: '',
    applyTax: false,
    notes: '',
    activeSubTab: '',
    rings: [],
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
    const sz = Number(r.mbSize) || 8.0;
    const w = Number(r.mbWidth) || 5.0;
    const tk = Number(r.mbThickness) || 1.7;
    
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

  if (['mensBand', 'customRing', 'weddingBand', 'pendant'].includes(r.category)) {
    if (r.material === 'gold') {
      const karat = Number(r.goldKarat) || 14;
      const rate = Number(settings.goldPricesPerGram?.[karat] ?? (((sPGold + rGoldPrem) / 31.1034768) * (karat / 24)));
      cM = g * rate;
    } else if (r.material === 'platinum') {
      const rate = Number(settings.platinumPricePerGram ?? (((sPPlat + rPlatPrem) / 31.1034768) * 0.95));
      cM = g * rate;
    } else if (r.material === 'silver') {
      const rate = Number(settings.silverPricePerGram ?? (((sPSilv + rSilverPrem) / 31.1034768) * 0.925));
      cM = g * rate;
    }
  } else {
    if (r.material === 'gold') {
      const karat = Number(r.goldKarat) || 14;
      cM = g * (((sPGold + rGoldPrem) / 31.1034768) * (karat / 24));
    } else if (r.material === 'platinum') {
      cM = g * (((sPPlat + rPlatPrem) / 31.1034768) * 0.95);
    } else if (r.material === 'silver') {
      cM = g * (((sPSilv + rSilverPrem) / 31.1034768) * 0.925);
    }
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
    } else if (c.type === 'Fancy') {
      cCF += (Number(c.qty) || 0) * Number(settings.settingFeeFancyPerSt !== undefined ? settings.settingFeeFancyPerSt : 25);
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

export function getDemoQuoteSession(): QuoteSession {
  const engId = genId();
  const wedId = genId();
  const menId = genId();

  // 1. Engagement Ring
  const engagementRing: JewelryItem = {
    id: engId,
    category: 'customRing',
    stoneSource: 'our',
    custCenterCt: '1.50',
    custMeleeCount: '16',
    material: 'gold',
    metalColor: 'White',
    goldKarat: 18,
    goldGrams: '4.8',
    cRingSize: '6.5',
    cBandWidth: '2.2',
    cBandThickness: '1.8',
    bandStyle: 'Pavé Accent Shank (6 Claw Solitaire)',
    fancy: [],
    melee: [{ qty: '16', carat: '0.015', size: '1.5' }],
    clientStones: [],
    addons: [{ fee: '250', desc: 'Custom 3D CAD modeling and wax printing fee' }],
    showEngraving: true,
    engravingText: 'Forever Yours',
    engravingFont: "'Times New Roman', Times, serif",
    designNotes: [
      { text: 'Center: 1.50ct Round Lab Diamond (Excellent cut, VVS2, E colour).' },
      { text: 'Setting: Extra secure 6-claw wire basket prongs, low-profile.' },
      { text: 'Ensure perfect contour match with companion wedding band.' }
    ],
    discount: '',
    discountType: '$',
    applyDesignFee: true,
    referenceSketches: [
      `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%25" height="100%25" style="background:%230b0f19"><circle cx="100" cy="115" r="45" fill="none" stroke="%2338bdf8" stroke-width="2" stroke-dasharray="3,3" opacity="0.6"/><circle cx="100" cy="115" r="40" fill="none" stroke="%23e2e8f0" stroke-width="4"/><path d="M100 75 L85 45 L100 25 L115 45 Z" fill="none" stroke="%23fbbf24" stroke-width="2"/><line x1="85" y1="45" x2="115" y2="45" stroke="%23fbbf24" stroke-width="1"/><line x1="100" y1="75" x2="100" y2="25" stroke="%2338bdf8" stroke-width="1" stroke-dasharray="2,2"/><circle cx="100" cy="115" r="4" fill="none" stroke="%23f43f5e" stroke-width="1.5"/><text x="100" y="180" fill="%2364748b" font-size="10" font-family="monospace" text-anchor="middle">CAD: ORTHO_FRONT_1</text></svg>`
    ],
    referencePhotos: [
      `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%25" height="100%25" style="background:%230f172a"><circle cx="100" cy="115" r="42" fill="none" stroke="%23475569" stroke-width="6"/><circle cx="100" cy="115" r="39" fill="none" stroke="%23f8fafc" stroke-width="1.5"/><path d="M100 73 L90 52 L100 35 L110 52 Z" fill="%23f8fafc" stroke="%2338bdf8" stroke-width="1"/><circle cx="100" cy="115" r="5" fill="%23f43f5e" opacity="0.5"/><text x="100" y="180" fill="%23e2e8f0" font-size="9" font-family="sans-serif" text-anchor="middle">3D RENDERING: MODEL_V1</text></svg>`
    ],
    centerStone: { carats: '1.50', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' }
  };

  // 2. Wedding Band
  const weddingBand: JewelryItem = {
    id: wedId,
    category: 'weddingBand',
    stoneSource: 'our',
    custCenterCt: '',
    custMeleeCount: '20',
    material: 'gold',
    metalColor: 'White',
    goldKarat: 18,
    goldGrams: '3.5',
    cRingSize: '6.5',
    cBandWidth: '2.0',
    cBandThickness: '1.6',
    bandStyle: 'Contoured Curved Eternity (Half-Loop)',
    fancy: [],
    melee: [{ qty: '20', carat: '0.01', size: '1.3' }],
    clientStones: [],
    addons: [],
    showEngraving: true,
    engravingText: '04.07.2026',
    engravingFont: "'Times New Roman', Times, serif",
    designNotes: [
      { text: 'Contoured slight bend of 1.2mm depth in center to nest neatly under engagement ring basket.' },
      { text: 'U-cut micro-pave setting on the accent stones.' },
      { text: 'Ensure heights match perfectly with Engagement shank.' }
    ],
    discount: '',
    discountType: '$',
    applyDesignFee: false,
    referenceSketches: [
      `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%25" height="100%25" style="background:%230b0f19"><path d="M50 115 C50 115 100 135 150 115" fill="none" stroke="%23e2e8f0" stroke-width="4"/><path d="M48 114 C48 114 100 137 152 114" fill="none" stroke="%2338bdf8" stroke-width="1.5" stroke-dasharray="2,2"/><circle cx="100" cy="126" r="3" fill="%23fbbf24"/><circle cx="85" cy="124" r="2.5" fill="%23fbbf24"/><circle cx="115" cy="124" r="2.5" fill="%23fbbf24"/><circle cx="70" cy="121" r="2.5" fill="%23fbbf24"/><circle cx="130" cy="121" r="2.5" fill="%23fbbf24"/><text x="100" y="180" fill="%2364748b" font-size="10" font-family="monospace" text-anchor="middle">CAD: MATCHING_BAND</text></svg>`
    ],
    referencePhotos: [],
    centerStone: { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' }
  };

  // 3. Men's Beveled Band
  const mensBand: JewelryItem = {
    id: menId,
    category: 'mensBand',
    stoneSource: 'our',
    custCenterCt: '',
    custMeleeCount: '',
    material: 'gold',
    metalColor: 'Yellow',
    goldKarat: 14,
    goldGrams: '7.2',
    mbSize: '10.0',
    mbWidth: '6.0',
    mbThickness: '2.0',
    mbProfile: 'Beveled',
    bandStyle: 'Step Edge Beveled - Comfort Fit Dual Finish',
    fancy: [],
    melee: [],
    clientStones: [],
    addons: [],
    showEngraving: true,
    engravingText: 'A.R. & J.L. Forever',
    engravingFont: "'Times New Roman', Times, serif",
    designNotes: [
      { text: 'Dual finish style: high-polished beveled edges with heavy sandblast matte center portion.' },
      { text: 'Shank interior must be Comfort-Fit with generous rounded corners.' },
      { text: 'Inner engraving centered on back of shank.' }
    ],
    discount: '',
    discountType: '$',
    applyDesignFee: false,
    referenceSketches: [
      `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%25" height="100%25" style="background:%230b0f19"><rect x="50" y="80" width="100" height="40" rx="3" fill="none" stroke="%2338bdf8" stroke-width="1.5" stroke-dasharray="2,2"/><path d="M50 84 L150 84 M50 116 L150 116" stroke="%23fbbf24" stroke-width="1.5"/><rect x="55" y="88" width="90" height="24" fill="%231e293b" opacity="0.8"/><text x="100" y="103" fill="%2394a3b8" font-size="8" font-family="sans-serif" text-anchor="middle" letter-spacing="1">MATTE CENTER</text><text x="100" y="180" fill="%2364748b" font-size="10" font-family="monospace" text-anchor="middle">CAD: MENS_BEVEL_6MM</text></svg>`
    ],
    referencePhotos: [],
    centerStone: { carats: '', shape: 'Round', setting: 'Round Prongs', type: 'Diamond', origin: 'Lab' }
  };

  return {
    id: 'demo-set-wedding-quote',
    cName: 'Alexander Ross',
    cPhone: '604-555-0145',
    cEmail: 'alexander.ross@gmail.com',
    jobNum: 'GR-2026-904',
    jobDesc: 'Custom 3-Piece Wedding Set: 1.5ct Solitaire Engagement Ring, Matching Contoured Wave Wedding Band & Men\'s Comfort Bevel Step Band',
    applyTax: true,
    notes: 'Premium custom order. Specially prepared for CAD production blueprint evaluation.',
    activeSubTab: engId,
    rings: [engagementRing, weddingBand, mensBand],
    scrapCredit: 0,
    signatureImg: null,
    referenceSketch: null,
    referencePhoto: null
  };
}
