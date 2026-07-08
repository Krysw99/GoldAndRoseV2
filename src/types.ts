/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CategoryType = 'customRing' | 'weddingBand' | 'mensBand' | 'pendant' | 'earrings' | 'tennisBracelet';
export type MaterialType = 'gold' | 'silver' | 'platinum';
export type MetalColorType = 'Yellow' | 'White' | 'Rose';
export type StoneSourceType = 'our' | 'customer';

export interface CenterStone {
  carats: string;
  shape: string;
  setting: string;
  type: string;
  origin: string;
}

export interface MeleeItem {
  qty: string;
  carat: string;
  size: string;
}

export interface FancyItem {
  qty: string;
  shape: string;
  sizeIdx: number;
}

export interface ClientStoneItem {
  qty: string;
  carats: string;
  size?: string;
  type: 'Center' | 'Fancy' | 'Melee';
  shape?: string;
  sizeIdx?: number;
}

export interface AddonItem {
  fee: string;
  desc: string;
}

export interface DesignNote {
  text: string;
}

export interface JewelryItem {
  id: string;
  category: CategoryType;
  stoneSource: StoneSourceType;
  custCenterCt: string;
  custMeleeCount: string;
  material: MaterialType;
  metalColor: MetalColorType;
  goldKarat: number;
  fancy: FancyItem[];
  melee: MeleeItem[];
  clientStones: ClientStoneItem[];
  addons: AddonItem[];
  showEngraving: boolean;
  engravingText: string;
  engravingFont: string;
  designNotes: DesignNote[];
  discount: string;
  discountType: '%' | '$';
  applyDesignFee: boolean;
  referenceSketch?: string | null;
  referencePhoto?: string | null;
  referenceSketches?: string[];
  referencePhotos?: string[];
  
  // Mens Band specific
  mbSize?: string;
  mbWidth?: string;
  mbThickness?: string;
  mbProfile?: string;
  goldGrams: string;

  // Pendant specific
  pDimensions?: string;
  centerStone?: CenterStone;

  // Tennis Bracelet specific
  tbLength?: number;
  tbShape?: string;
  tbSizeRound?: string;
  tbSizeIdx?: number;
  tbManualStones?: string;
  tbManualGrams?: string;
  tbManualCarats?: string;

  // Earrings specific
  backingType?: string;
  centerStone2?: CenterStone;

  // Custom Ring / Wedding Band specific
  cRingSize?: string;
  cBandWidth?: string;
  cBandThickness?: string;
  bandStyle?: string;
}

export interface QuoteSession {
  id: string;
  cName: string;
  cPhone: string;
  cEmail: string;
  jobNum: string;
  jobDesc: string;
  applyTax: boolean;
  notes: string;
  activeSubTab: string; // ID of ring or 'summary'
  rings: JewelryItem[];
  scrapCredit: number;
  signatureImg: string | null;
  referenceSketch: string | null;
  referencePhoto: string | null;
  overridePrices?: { gold?: number; silver?: number; platinum?: number };
}

export interface ScrapItem {
  weight: string;
  material: MaterialType;
  purity: number; // karat for gold (10, 14, 18, 19, 22, 24), or decimal purity for others
  rate: number; // rate percentage, e.g. 85 for 85%
}

export interface ScrapTransaction {
  id: string;
  date: string;
  name: string;
  phone: string;
  address: string;
  driversLicense: string;
  stoneRemovalQty: string;
  spotPrices: {
    gold: number;
    silver: number;
    platinum: number;
  };
  items: ScrapItem[];
  summary: string;
  total: string;
  image: string | null;
}

export interface QuoteTransaction {
  id: string;
  date: string;
  name: string;
  phone: string;
  summary: string;
  total: string;
  fullData: QuoteSession;
  isWholesale: boolean;
}

export interface CenterStoneRates {
  [stoneType: string]: {
    [origin: string]: number; // Natural / Lab -> rate
  };
}

export interface WholesaleSettings {
  goldSpotPremium: number;
  laborPerGram: number;
  settingMelee: number;
  settingFancy: number;
  settingCenter: number;
  designFee: number;
  stoneCenterPerCt: number;
  meleeRates: {
    [size: string]: number;
  };
  fancyRates: {
    [shape: string]: number;
  };
}

export interface AppSettings {
  settingFeeCenterPerCt: number;
  settingFeeMeleePerSt: number;
  settingFeeFancyPerSt: number;
  meleePricePerCt: number;
  fancyPricePerCt: number;
  earringMeleePricePerCt: number;
  earringFancyPricePerCt: number;
  tennisMeleePricePerCt: number;
  tennisFancyPricePerCt: number;
  tennisLaborRetail: number;
  
  centerStoneRates: CenterStoneRates;
  centerStoneRawRates: CenterStoneRates;
  rawCostRates: {
    melee: number;
    fancy: number;
    center: number;
  };
  
  goldPricesPerGram: { [karat: number]: number };
  platinumPricePerGram: number;
  silverPricePerGram: number;
  
  earringGoldPricesPerGram: { [karat: number]: number };
  earringPlatinumPricePerGram: number;
  earringSilverPricePerGram: number;
  
  tennisGoldPricesPerGram: { [karat: number]: number };
  tennisPlatinumPricePerGram: number;
  tennisSilverPricePerGram: number;
  tennisMeleePricePerCtRaw: number;
  tennisFancyPricePerCtRaw: number;
  showRawCostOnQuoteTab: boolean;
  
  retailGoldPremium?: number;
  retailSilverPremium?: number;
  retailPlatinumPremium?: number;
  
  rawMeleeRates?: {
    [size: string]: number;
  };
  rawFancyRates?: {
    [shape: string]: number;
  };
  cubanMultipliers?: CubanMultiplierRange[];
  tennisDiamondPricePerCt?: number;
  tennisMultipliers?: TennisMultiplierRange[];
  
  wholesale: WholesaleSettings;
}

export interface CubanMultiplierRange {
  minWidth: number;
  maxWidth: number;
  multiplier: number;
}

export interface TennisMultiplierRange {
  minWidth: number;
  maxWidth: number;
  multiplier: number;
}
