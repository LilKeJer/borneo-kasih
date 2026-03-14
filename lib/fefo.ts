export interface FefoBatchSnapshot {
  id: number;
  medicineId: number;
  remainingQuantity: number;
  expiryDate: string | Date;
}

export interface FefoAllocation {
  stockId: number;
  quantity: number;
  expiryDate: string | Date;
}

export interface FefoAllocationPlan {
  allocations: FefoAllocation[];
  totalAvailableQuantity: number;
  remainingRequiredQuantity: number;
}

export function allocateStockByFEFO(
  batches: FefoBatchSnapshot[],
  requiredQuantity: number
): FefoAllocationPlan {
  const sortedBatches = [...batches].sort((left, right) => {
    const leftExpiry = new Date(left.expiryDate).getTime();
    const rightExpiry = new Date(right.expiryDate).getTime();

    if (leftExpiry !== rightExpiry) {
      return leftExpiry - rightExpiry;
    }

    return left.id - right.id;
  });

  let remainingRequiredQuantity = requiredQuantity;
  let totalAvailableQuantity = 0;
  const allocations: FefoAllocation[] = [];

  for (const batch of sortedBatches) {
    const availableQuantity = Math.max(0, Number(batch.remainingQuantity) || 0);
    totalAvailableQuantity += availableQuantity;

    if (remainingRequiredQuantity <= 0 || availableQuantity === 0) {
      continue;
    }

    const quantity = Math.min(availableQuantity, remainingRequiredQuantity);
    allocations.push({
      stockId: batch.id,
      quantity,
      expiryDate: batch.expiryDate,
    });
    remainingRequiredQuantity -= quantity;
  }

  return {
    allocations,
    totalAvailableQuantity,
    remainingRequiredQuantity,
  };
}

export function groupRequestedMedicineQuantities(
  items: Array<{ medicineId: number; quantity: number }>
) {
  const grouped = new Map<number, number>();

  for (const item of items) {
    grouped.set(
      item.medicineId,
      (grouped.get(item.medicineId) ?? 0) + item.quantity
    );
  }

  return grouped;
}
