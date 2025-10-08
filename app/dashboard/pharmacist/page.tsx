// app/dashboard/pharmacist/page.tsx
"use client";

import { useState, useEffect } from "react";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  Package,
  Clock,
  ShoppingCart,
  Pill,
  Layers,
  CalendarOff,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge"; // Added Badge import

interface LowStockMedicine {
  id: number;
  name: string;
  totalStock: number;
  minimumStock: number;
  thresholdStock: number;
}

interface DashboardStats {
  pendingPrescriptions: number;
  readyForPickup: number;
  medicineInventoryCount: number;
  transactionsToday: number;
  totalSalesToday: number;
  lowStockCount: number;
}

export default function PharmacistDashboardPage() {
  const [lowStockMedicines, setLowStockMedicines] = useState<
    LowStockMedicine[]
  >([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null
  );
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingLowStock, setLoadingLowStock] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
    fetchLowStockMedicines();
  }, []);

  const fetchDashboardStats = async () => {
    setLoadingStats(true);
    try {
      // --- Mock Data ---
      // In a real application, you would fetch this from an API endpoint
      // e.g., const response = await fetch("/api/pharmacist/dashboard-stats");
      // if (!response.ok) throw new Error("Failed to fetch dashboard stats");
      // const data = await response.json();
      // setDashboardStats(data);
      await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate network delay
      setDashboardStats({
        pendingPrescriptions: 5,
        readyForPickup: 2,
        medicineInventoryCount: 480,
        transactionsToday: 12,
        totalSalesToday: 975000,
        lowStockCount: 4,
      });
      // --- End Mock Data ---
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      toast.error("Gagal memuat statistik dashboard.");
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchLowStockMedicines = async () => {
    setLoadingLowStock(true);
    try {
      const response = await fetch("/api/medicines/low-stock");
      if (!response.ok) throw new Error("Failed to fetch low stock medicines");
      const data = await response.json();
      setLowStockMedicines(data.data || []);
    } catch (error) {
      console.error("Error fetching low stock medicines:", error);
      toast.error("Gagal memuat data stok rendah.");
    } finally {
      setLoadingLowStock(false);
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Resep Pending"
          value={dashboardStats?.pendingPrescriptions ?? 0}
          icon={<Clock className="h-4 w-4" />}
          description={`${dashboardStats?.readyForPickup ?? 0} siap diambil`}
          loading={loadingStats}
        />
        <DashboardCard
          title="Total Item Obat"
          value={dashboardStats?.medicineInventoryCount ?? 0}
          icon={<Package className="h-4 w-4" />}
          description="Item dalam stok"
          loading={loadingStats}
        />
        <DashboardCard
          title="Transaksi Hari Ini"
          value={dashboardStats?.transactionsToday ?? 0}
          icon={<ShoppingCart className="h-4 w-4" />}
          description={formatRupiah(dashboardStats?.totalSalesToday ?? 0)}
          loading={loadingStats}
        />
        <DashboardCard
          title="Peringatan Stok Rendah"
          value={dashboardStats?.lowStockCount ?? 0}
          icon={<AlertCircle className="h-4 w-4" />}
          description="Item perlu restock"
          loading={loadingStats}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Peringatan Stok Rendah</CardTitle>
            <CardDescription>
              Daftar obat yang stoknya di bawah batas aman.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingLowStock ? (
              <p>Memuat data stok rendah...</p>
            ) : lowStockMedicines.length === 0 ? (
              <p className="text-muted-foreground">
                Tidak ada obat dengan stok rendah saat ini.
              </p>
            ) : (
              <ul className="space-y-2">
                {lowStockMedicines.slice(0, 5).map((medicine) => (
                  <li
                    key={medicine.id}
                    className="flex justify-between items-center text-sm"
                  >
                    <span>{medicine.name}</span>
                    <Badge variant="destructive">
                      Sisa: {medicine.totalStock} (Min: {medicine.minimumStock},
                      Thres: {medicine.thresholdStock.toFixed(0)})
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            {lowStockMedicines.length > 5 && (
              <Button variant="link" asChild className="mt-2 p-0 h-auto">
                <Link href="/dashboard/pharmacist/inventory?filter=low_stock">
                  Lihat Semua
                </Link>
              </Button>
            )}
            {lowStockMedicines.length === 0 && !loadingLowStock && (
              <Button variant="outline" asChild className="mt-2">
                <Link href="/dashboard/pharmacist/inventory">
                  Kelola Inventaris
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manajemen Cepat</CardTitle>
            <CardDescription>
              Akses cepat ke fitur penting farmasi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/pharmacist/prescriptions">
                <Pill className="mr-2 h-4 w-4" /> Lihat Semua Resep
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/pharmacist/inventory">
                <Layers className="mr-2 h-4 w-4" /> Kelola Inventaris Obat
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/pharmacist/inventory?filter=expiring">
                <CalendarOff className="mr-2 h-4 w-4" /> Cek Obat Akan
                Kadaluarsa
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
