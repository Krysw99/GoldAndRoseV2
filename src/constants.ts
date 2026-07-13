/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaterialType } from './types';

export const TROY_ONCE_GRAMS = 31.1034768;

export const DENSITIES = {
  gold: {
    1: 8.7,
    2: 9.0,
    3: 9.3,
    4: 9.6,
    5: 9.9,
    6: 10.2,
    7: 10.5,
    8: 10.8,
    9: 11.1,
    10: 11.4,
    11: 11.8,
    12: 12.3,
    13: 12.7,
    14: 13.1,
    15: 13.7,
    16: 14.3,
    17: 14.9,
    18: 15.5,
    19: 16.1,
    20: 16.6,
    21: 17.1,
    22: 17.7,
    23: 18.5,
    24: 19.3
  } as Record<number, number>,
  platinum: 20.1,
  silver: 10.4
};

export const ROUND_MELEE: Record<string, number> = {
  '0.9': 0.004,
  '1.0': 0.005,
  '1.2': 0.008,
  '1.3': 0.010,
  '1.5': 0.015,
  '1.6': 0.017,
  '1.7': 0.020,
  '1.8': 0.025,
  '2.0': 0.030,
  '2.2': 0.040,
  '2.3': 0.045,
  '2.4': 0.050,
  '2.5': 0.060,
  '2.6': 0.065,
  '2.7': 0.070,
  '2.8': 0.080,
  '3.0': 0.100,
  '3.2': 0.120,
  '3.5': 0.170,
  '4.0': 0.250
};

export interface FancyShapeSize {
  label: string;
  carat: number;
}

export const FANCY_SHAPES: Record<string, FancyShapeSize[]> = {
  'Princess': [
    { label: '1.5x1.5mm', carat: 0.015 },
    { label: '2.0x2.0mm', carat: 0.050 },
    { label: '2.5x2.5mm', carat: 0.100 },
    { label: '3.0x3.0mm', carat: 0.160 },
    { label: '3.5x3.5mm', carat: 0.240 },
    { label: '4.0x4.0mm', carat: 0.330 }
  ],
  'Oval': [
    { label: '3.0x2.0mm', carat: 0.070 },
    { label: '3.5x2.5mm', carat: 0.110 },
    { label: '4.0x3.0mm', carat: 0.150 },
    { label: '4.5x3.5mm', carat: 0.220 },
    { label: '5.0x3.0mm', carat: 0.250 },
    { label: '5.0x4.0mm', carat: 0.350 }
  ],
  'Pear': [
    { label: '3.0x2.0mm', carat: 0.050 },
    { label: '3.5x2.5mm', carat: 0.080 },
    { label: '4.0x3.0mm', carat: 0.150 },
    { label: '4.5x3.5mm', carat: 0.210 },
    { label: '5.0x3.0mm', carat: 0.250 },
    { label: '5.0x4.0mm', carat: 0.330 }
  ],
  'Emerald': [
    { label: '3.0x2.0mm', carat: 0.080 },
    { label: '3.5x2.5mm', carat: 0.120 },
    { label: '4.0x3.0mm', carat: 0.200 },
    { label: '4.5x3.5mm', carat: 0.300 },
    { label: '5.0x3.5mm', carat: 0.380 },
    { label: '5.0x4.0mm', carat: 0.450 }
  ],
  'Marquise': [
    { label: '3.0x1.5mm', carat: 0.030 },
    { label: '3.5x2.0mm', carat: 0.050 },
    { label: '4.0x2.0mm', carat: 0.070 },
    { label: '4.5x2.5mm', carat: 0.120 },
    { label: '5.0x2.5mm', carat: 0.150 },
    { label: '5.0x3.0mm', carat: 0.220 }
  ],
  'Cushion': [
    { label: '1.5x1.5mm', carat: 0.020 },
    { label: '2.0x2.0mm', carat: 0.060 },
    { label: '2.5x2.5mm', carat: 0.110 },
    { label: '3.0x3.0mm', carat: 0.180 },
    { label: '3.5x3.5mm', carat: 0.260 },
    { label: '4.0x4.0mm', carat: 0.360 }
  ],
  'Radiant': [
    { label: '3.0x2.0mm', carat: 0.080 },
    { label: '3.5x2.5mm', carat: 0.130 },
    { label: '4.0x3.0mm', carat: 0.210 },
    { label: '4.5x3.5mm', carat: 0.310 },
    { label: '5.0x3.5mm', carat: 0.400 },
    { label: '5.0x4.0mm', carat: 0.480 }
  ]
};

export const CENTER_SHAPES = ['Round', 'Princess', 'Oval', 'Pear', 'Emerald', 'Marquise', 'Cushion', 'Radiant'];
export const SETTING_STYLES = ['Round Prongs', 'Sharp Prongs', 'Shortened Sharp', 'Bezel Set'];

export const PURITY_OPTIONS: Record<MaterialType, number[]> = {
  gold: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  silver: [0.999, 0.958, 0.925, 0.900, 0.800, 0.500],
  platinum: [0.999, 0.950, 0.900, 0.850, 0.500]
};

export const DEFAULT_SETTINGS = {
  settingFeeCenterPerCt: 250,
  settingFeeMeleePerSt: 15,
  settingFeeFancyPerSt: 25,
  meleePricePerCt: 1500,
  fancyPricePerCt: 3000,
  earringMeleePricePerCt: 2400,
  earringFancyPricePerCt: 700,
  tennisMeleePricePerCt: 2600,
  tennisFancyPricePerCt: 800,
  tennisLaborRetail: 0,
  
  centerStoneRates: {
    Diamond: { Natural: 6000, Lab: 1250 },
    Sapphire: { Natural: 2000, Lab: 1250 },
    Emerald: { Natural: 3000, Lab: 1250 },
    Topaz: { Natural: 300, Lab: 1250 }
  },
  centerStoneRawRates: {
    Diamond: { Natural: 4000, Lab: 800 },
    Sapphire: { Natural: 1000, Lab: 200 },
    Emerald: { Natural: 1500, Lab: 300 },
    Topaz: { Natural: 100, Lab: 30 }
  },
  rawCostRates: { melee: 300, fancy: 380, center: 400 },
  goldPricesPerGram: { 10: 200, 14: 230, 18: 280, 19: 300, 22: 320, 24: 350 },
  platinumPricePerGram: 380,
  silverPricePerGram: 100,
  
  earringGoldPricesPerGram: { 10: 200, 14: 230, 18: 280, 19: 300, 22: 320, 24: 350 },
  earringPlatinumPricePerGram: 380,
  earringSilverPricePerGram: 100,
  
  tennisGoldPricesPerGram: { 10: 210, 14: 245, 18: 295, 19: 305, 22: 335, 24: 370 },
  tennisPlatinumPricePerGram: 400,
  tennisSilverPricePerGram: 110,
  tennisMeleePricePerCtRaw: 350,
  tennisFancyPricePerCtRaw: 420,
  tennisDiamondPricePerCt: 600,
  tennisMultipliers: [
    { minWidth: 1.0, maxWidth: 1.9, multiplier: 1.6 },
    { minWidth: 2.0, maxWidth: 4.0, multiplier: 1.4 }
  ],
  showRawCostOnQuoteTab: false,
  
  storeName: "Gold & Rose",
  storeSubName: "Jewellery Corporation",
  storeAddress: "4501 North Rd #209, Burnaby, BC V3N 4J5",
  storeContact: "info@goldandrosejewellery.com | (604) 420-9077",
  
  wixStoreUrl: "https://www.goldandrosejewellery.com",
  wixAccessToken: "",
  wixIntegrationMode: "deeplink",
  wixWebhookUrl: "",
  
  retailGoldPremium: 100,
  retailSilverPremium: 20,
  retailPlatinumPremium: 100,
  
  rawMeleeRates: {},
  rawFancyRates: {},
  cubanMultipliers: [
    { minWidth: 5, maxWidth: 7.9, multiplier: 1.8 },
    { minWidth: 8, maxWidth: 10.9, multiplier: 1.6 },
    { minWidth: 11, maxWidth: 13.9, multiplier: 1.5 },
    { minWidth: 14, maxWidth: 24, multiplier: 1.4 }
  ],
  
  wholesale: {
    goldSpotPremium: 100,
    laborPerGram: 40,
    settingMelee: 5,
    settingFancy: 7,
    settingCenter: 35,
    designFee: 50,
    stoneCenterPerCt: 800,
    meleeRates: { '1.0': 400 },
    fancyRates: { 'Princess': 500 },
    repairPricing: {
      resizeUp14kThin_base: 50,
      resizeUp14kThin_extra: 70,
      resizeUp14kThick_base: 60,
      resizeUp14kThick_extra: 80,
      resizeUp18k_base: 80,
      resizeUp18k_extra: 100,
      resizeUp22k_base: 100,
      resizeUp22k_extra: 120,
      resizeDownFlat: 40,
      stretchRing: 25,
      resetMelee: 5,
      resetCenter: 35,
      laserEngravingSimple: 30,
      laserEngravingAdvanced: 40,
      prongRetip: 30,
      replatingBase: 50,
      replatingOptionRhodium: 0,
      replatingOption14kYellow: 0,
      replatingOption24k: 0,
      replatingOptionBlackRuthenium: 0,
      replatingOptionNickel: 0,
      replatingOptionRose: 0,
      laserChainRepair: 20,
      simplePolishCleanup: 20,
      heavyCleanupPolishMin: 50,
      heavyCleanupPolishMax: 150
    }
  },
  wholesaleProfiles: []
};
