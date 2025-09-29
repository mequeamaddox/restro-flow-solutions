export type InventoryItem = {
  id: string;
  name: string;
  innerUnit?: string | null;
  pricePerInnerUnit?: number | null;
  pricePerOz?: number | null;
  pricePerLb?: number | null;
  pricePerGa?: number | null;
  costPerUnit?: number | null;
};

const OZ_PER_LB = 16;
const OZ_PER_GA = 128;
const G_PER_OZ = 28.349523125;
const TBSP_PER_OZ = 2;
const TSP_PER_TBSP = 3;
const CUP_OZ = 8;

export function getPricePerOz(item: InventoryItem): number | null {
  if (item.pricePerOz != null) return item.pricePerOz;

  if (item.pricePerLb != null) return item.pricePerLb / OZ_PER_LB;
  if (item.pricePerGa != null) return item.pricePerGa / OZ_PER_GA;

  if (
    item.innerUnit &&
    item.innerUnit.toUpperCase() === "OZ" &&
    item.pricePerInnerUnit != null
  ) {
    return item.pricePerInnerUnit;
  }

  if (item.costPerUnit != null) return null;
  return null;
}

export function computeLineCost(
  item: InventoryItem,
  quantity: number,
  unit: string
): number {
  const u = (unit || "").toLowerCase();

  if (u === "piece" && item.costPerUnit != null) {
    return quantity * item.costPerUnit;
  }

  const ppo = getPricePerOz(item);

  if (ppo != null) {
    let qtyOz = 0;

    if (u === "oz") qtyOz = quantity;
    else if (u === "lb") qtyOz = quantity * OZ_PER_LB;
    else if (u === "g") qtyOz = quantity / G_PER_OZ;
    else if (u === "kg") qtyOz = (quantity * 1000) / G_PER_OZ;
    else if (u === "cup") qtyOz = quantity * CUP_OZ;
    else if (u === "tbsp") qtyOz = quantity / TBSP_PER_OZ;
    else if (u === "tsp") qtyOz = quantity / (TBSP_PER_OZ * TSP_PER_TBSP);
    else if (u === "ga") qtyOz = quantity * OZ_PER_GA;
    else if (u === "piece" && item.pricePerInnerUnit != null && (item.innerUnit || "").toUpperCase() === "CT") {
      return quantity * item.pricePerInnerUnit;
    } else {
      if (
        item.pricePerInnerUnit != null &&
        item.innerUnit &&
        item.innerUnit.toLowerCase() === u
      ) {
        return quantity * item.pricePerInnerUnit;
      }
      return 0;
    }

    return qtyOz * ppo;
  }

  if (item.pricePerLb != null && u === "lb") return quantity * item.pricePerLb;
  if (item.pricePerGa != null && u === "ga") return quantity * item.pricePerGa;
  if (
    item.pricePerInnerUnit != null &&
    item.innerUnit &&
    item.innerUnit.toLowerCase() === u
  ) {
    return quantity * item.pricePerInnerUnit;
  }

  if (item.costPerUnit != null) return quantity * item.costPerUnit;
  return 0;
}
