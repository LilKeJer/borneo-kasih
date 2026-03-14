// types/pharmacy.ts
// Definisikan tipe dasar untuk Obat jika belum ada secara spesifik untuk frontend
export interface Medicine {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  unit?: string | null;
  price: string;
  minimumStock?: number;
  reorderThresholdPercentage?: number;
  totalStock?: number;
  status?: "Normal" | "Low Stock" | "Out of Stock" | string;
  thresholdAmount?: number;
  isActive?: boolean;
}
