export interface PackSizeParseResult {
  packQty: number | null;
  innerSize: number | null;
  innerUnit: string | null;
  totalBaseUnits: number | null;
  parseSuccess: boolean;
  parseError?: string;
}

export interface CostCalculations {
  caseCost: number;
  perPieceCost: number | null;
  perBaseUnitCost: number | null;
  costMismatch?: boolean;
  costMismatchPercent?: number;
}

export interface ConversionData {
  piecesPerLb?: number | null;
  ozPerPiece?: number | null;
  ozPerCup?: number | null;
  cupsPerGa?: number | null;
  yieldPct?: number | null;
  gradeLow?: number | null;
  gradeHigh?: number | null;
}

const CAN_SIZES: Record<string, number> = {
  '#10': 109,
  '#5': 51,
  '#303': 16,
  '#2.5': 28,
  '#2': 20,
  '#1': 11,
};

const UOM_MAPPINGS: Record<string, string> = {
  'CS': 'case',
  'CA': 'case',
  'CASE': 'case',
  'BX': 'box',
  'BOX': 'box',
  'BG': 'bag',
  'BAG': 'bag',
  'EA': 'each',
  'EACH': 'each',
  'CT': 'count',
  'COUNT': 'count',
  'PK': 'pack',
  'PACK': 'pack',
};

const UNIT_NORMALIZATIONS: Record<string, string> = {
  'OZ': 'oz',
  'OUNCE': 'oz',
  'OUNCES': 'oz',
  'LB': 'lb',
  'LBS': 'lb',
  'POUND': 'lb',
  'POUNDS': 'lb',
  'GAL': 'gal',
  'GA': 'gal',
  'GALLON': 'gal',
  'GALLONS': 'gal',
  'QT': 'qt',
  'QUART': 'qt',
  'QUARTS': 'qt',
  'PT': 'pt',
  'PINT': 'pt',
  'PINTS': 'pt',
  'ML': 'ml',
  'L': 'l',
  'LITER': 'l',
  'LITERS': 'l',
  'G': 'g',
  'GRAM': 'g',
  'GRAMS': 'g',
  'KG': 'kg',
  'KILO': 'kg',
  'KILOGRAM': 'kg',
  'KILOGRAMS': 'kg',
  'CT': 'count',
  'COUNT': 'count',
};

export function normalizeUnit(unit: string): string {
  const upper = unit.toUpperCase().trim();
  return UNIT_NORMALIZATIONS[upper] || unit.toLowerCase();
}

export function detectConversions(description: string, innerUnit: string | null): ConversionData {
  const conversion: ConversionData = {};
  const desc = description || "";
  
  // Detect "5-8 count average" or "5-8 count avg"
  const countRange = desc.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:count|ct)\s*(?:avg|average)?/i);
  
  // Detect grade like "16/20"
  const grade = desc.match(/(\d+)\s*\/\s*(\d+)\b/);
  
  if (countRange) {
    const lo = Number(countRange[1]);
    const hi = Number(countRange[2]);
    if (lo && hi && lo > 0 && hi > 0) {
      conversion.gradeLow = lo;
      conversion.gradeHigh = hi;
      conversion.piecesPerLb = (lo + hi) / 2;
    }
  } else if (grade) {
    const lo = Number(grade[1]);
    const hi = Number(grade[2]);
    if (lo && hi && lo > 0 && hi > 0) {
      conversion.gradeLow = lo;
      conversion.gradeHigh = hi;
      conversion.piecesPerLb = (lo + hi) / 2;
    }
  }
  
  // Liquids default helpers (if purchased in GA/gal)
  if (innerUnit?.toLowerCase() === "gal" || innerUnit?.toLowerCase() === "ga") {
    conversion.ozPerCup = conversion.ozPerCup ?? 8;
    conversion.cupsPerGa = conversion.cupsPerGa ?? 16;
  }
  
  // Default yield to 100%
  conversion.yieldPct = 100;
  
  return conversion;
}

export function normalizePurchaseUom(uom: string): string {
  const upper = uom.toUpperCase().trim();
  return UOM_MAPPINGS[upper] || uom.toLowerCase();
}

export function parsePackSize(packSizeStr: string): PackSizeParseResult {
  if (!packSizeStr || typeof packSizeStr !== 'string') {
    return {
      packQty: null,
      innerSize: null,
      innerUnit: null,
      totalBaseUnits: null,
      parseSuccess: false,
      parseError: 'Empty or invalid pack size',
    };
  }

  const cleaned = packSizeStr.trim().toUpperCase();

  if (cleaned === 'EA' || cleaned === 'EACH') {
    return {
      packQty: 1,
      innerSize: 1,
      innerUnit: 'each',
      totalBaseUnits: 1,
      parseSuccess: true,
    };
  }

  const patterns = [
    /(\d+)\s*[xX*]\s*(\d+(?:\.\d+)?)\s*([A-Z]+)/,
    /(\d+)\s*\/\s*(\d+(?:\.\d+)?)\s*([A-Z]+)/,
    /(\d+)\s*\/\s*(#\d+)/,
    /(\d+)\s*[xX*]\s*(#\d+)/,
    /(\d+)\s+([A-Z]+)/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const packQty = parseInt(match[1], 10);
      
      if (match[2] && match[2].startsWith('#')) {
        const canSize = match[2];
        const ozPerCan = CAN_SIZES[canSize];
        
        if (!ozPerCan) {
          return {
            packQty,
            innerSize: null,
            innerUnit: canSize,
            totalBaseUnits: null,
            parseSuccess: false,
            parseError: `Unknown can size: ${canSize}`,
          };
        }
        
        return {
          packQty,
          innerSize: ozPerCan,
          innerUnit: 'oz',
          totalBaseUnits: packQty * ozPerCan,
          parseSuccess: true,
        };
      }
      
      if (match[2] && match[3]) {
        const innerSize = parseFloat(match[2]);
        const innerUnit = normalizeUnit(match[3]);
        
        return {
          packQty,
          innerSize,
          innerUnit,
          totalBaseUnits: packQty * innerSize,
          parseSuccess: true,
        };
      }
      
      if (match[2]) {
        const innerUnit = normalizeUnit(match[2]);
        
        return {
          packQty,
          innerSize: 1,
          innerUnit,
          totalBaseUnits: packQty,
          parseSuccess: true,
        };
      }
    }
  }

  const simpleNumberMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*([A-Z]+)$/);
  if (simpleNumberMatch) {
    const size = parseFloat(simpleNumberMatch[1]);
    const unit = normalizeUnit(simpleNumberMatch[2]);
    
    return {
      packQty: 1,
      innerSize: size,
      innerUnit: unit,
      totalBaseUnits: size,
      parseSuccess: true,
    };
  }

  const justNumberMatch = cleaned.match(/^(\d+)$/);
  if (justNumberMatch) {
    const qty = parseInt(justNumberMatch[1], 10);
    return {
      packQty: qty,
      innerSize: 1,
      innerUnit: 'count',
      totalBaseUnits: qty,
      parseSuccess: true,
    };
  }

  return {
    packQty: null,
    innerSize: null,
    innerUnit: null,
    totalBaseUnits: null,
    parseSuccess: false,
    parseError: `Could not parse pack size: ${packSizeStr}`,
  };
}

export function calculateCosts(
  caseCost: number,
  packQty: number | null,
  totalBaseUnits: number | null,
  vendorPerUnitCost?: number
): CostCalculations {
  const result: CostCalculations = {
    caseCost,
    perPieceCost: null,
    perBaseUnitCost: null,
  };

  if (packQty && packQty > 0) {
    result.perPieceCost = caseCost / packQty;
  }

  if (totalBaseUnits && totalBaseUnits > 0) {
    result.perBaseUnitCost = caseCost / totalBaseUnits;
  }

  if (vendorPerUnitCost && result.perPieceCost) {
    const diff = Math.abs(result.perPieceCost - vendorPerUnitCost);
    const percentDiff = (diff / vendorPerUnitCost) * 100;
    
    if (percentDiff > 1) {
      result.costMismatch = true;
      result.costMismatchPercent = percentDiff;
    }
  }

  return result;
}

function findColumnValue(row: any, ...possibleNames: string[]): string {
  const lowerRow: Record<string, any> = {};
  Object.keys(row).forEach(key => {
    lowerRow[key.toLowerCase().trim()] = row[key];
  });
  
  for (const name of possibleNames) {
    const lowerName = name.toLowerCase().trim();
    if (lowerRow[lowerName] !== undefined && lowerRow[lowerName] !== null) {
      return String(lowerRow[lowerName]);
    }
  }
  return '';
}

export function parseVendorCsvRow(row: any, debug = false): {
  parsed: PackSizeParseResult;
  costs: CostCalculations;
  conversion: ConversionData;
  itemName: string;
  vendorSku: string;
  purchaseUom: string;
  rawPackSize: string;
  caseCost: number;
  vendorPerUnitCost?: number;
} | null {
  if (debug) {
    console.log(`🔍 CSV Row columns: ${Object.keys(row).join(', ')}`);
  }
  
  const itemName = findColumnValue(row, 
    'Product Description', 'product description', 'description',
    'Company Product ID Brand', 'product name', 'item name', 'name', 
    'product', 'item'
  );
  
  const vendorSku = findColumnValue(row,
    'Product Number', 'product number', 'StateOfOri Product Number', 
    'stateoforipro product number', 'Stock/Product Number', 'stock number', 
    'sku', 'item number', 'code', 'product code', 'item#', 'stock#'
  );
  
  const rawPackSize = findColumnValue(row,
    'Pack Size', 'pack size', 'packsize', 'size', 'pack', 
    'pkg size', 'package size'
  );
  
  const purchaseUomRaw = findColumnValue(row,
    'UOM', 'uom', 'UnitOfMeasure', 'unitofmeasure', 'Unit of Measure', 
    'unit of measure', 'u/m', 'um', 'sell uom', 'sell um', 'u of m', 'unit', 'measure'
  );
  
  const priceStr = findColumnValue(row,
    'Price', 'price', 'cost', 'unit price', 'case price', 
    'net unit', 'net price', 'unit cost', 'case cost'
  );
  
  const perUnitCostStr = findColumnValue(row,
    'Per Unit Cost', 'per unit cost', 'unit cost', 'piece cost', 
    'each cost', 'ea cost', 'per piece', 'per each'
  );

  if (debug) {
    console.log(`   Found: itemName="${itemName}", packSize="${rawPackSize}", price="${priceStr}"`);
  }

  if (!itemName || !rawPackSize) {
    if (debug) {
      console.log(`   ❌ Missing required fields`);
    }
    return null;
  }

  const caseCost = typeof priceStr === 'string' 
    ? parseFloat(priceStr.replace(/[$,]/g, ''))
    : parseFloat(priceStr);
  
  const vendorPerUnitCost = perUnitCostStr 
    ? (typeof perUnitCostStr === 'string' 
        ? parseFloat(perUnitCostStr.replace(/[$,]/g, ''))
        : parseFloat(perUnitCostStr))
    : undefined;

  if (isNaN(caseCost)) {
    return null;
  }

  const parsed = parsePackSize(rawPackSize);
  const purchaseUom = normalizePurchaseUom(purchaseUomRaw);
  const costs = calculateCosts(caseCost, parsed.packQty, parsed.totalBaseUnits, vendorPerUnitCost);
  const conversion = detectConversions(itemName, parsed.innerUnit);

  return {
    parsed,
    costs,
    conversion,
    itemName,
    vendorSku,
    purchaseUom,
    rawPackSize,
    caseCost,
    vendorPerUnitCost,
  };
}
