// app/dashboard/pharmacist/inventory/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MoreHorizontal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  PackagePlus,
  Layers,
  Edit,
  Trash,
  AlertCircle,
  PackageSearch,
  CalendarOff,
  Search,
  RefreshCw,
} from "lucide-react";
import { MedicineForm } from "@/components/pharmacist/medicines/medicine-form";
import { MedicineStockForm } from "@/components/pharmacist/inventory/medicine-stock-form";
import { formatRupiah } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import { useSearchParams } from "next/navigation";

interface MedicineWithStock {
  id: number;
  name: string;
  description?: string | null;
  price: string;
  minimumStock: number;
  reorderThresholdPercentage: number;
  totalStock: number;
  batchCount: number;
  isBelowThreshold: boolean;
  thresholdStock: number;
  stockPercentage: number;
}

interface MedicineStockItem {
  id: number;
  medicineId: number;
  medicineName: string;
  batchNumber: string | null;
  expiryDate: string; // as ISO string
  remainingQuantity: number;
  addedAt: string; // as ISO string
  daysUntilExpiry: number;
  urgency: "Critical" | "High" | "Medium" | "Low" | "Expired";
}

// Separate component that uses useSearchParams
function InventoryContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter");

  const [medicines, setMedicines] = useState<MedicineWithStock[]>([]);
  const [expiringMedicines, setExpiringMedicines] = useState<
    MedicineStockItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadingExpiring, setLoadingExpiring] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>(
    initialFilter || "all"
  ); // 'all', 'low_stock', 'expiring'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
  const [isEditMedicineDialogOpen, setIsEditMedicineDialogOpen] =
    useState(false);
  const [isDeleteMedicineDialogOpen, setIsDeleteMedicineDialogOpen] =
    useState(false);
  const [selectedMedicine, setSelectedMedicine] =
    useState<MedicineWithStock | null>(null);

  useEffect(() => {
    if (activeFilter === "expiring") {
      fetchExpiringMedicines();
    } else {
      fetchMedicines();
    }
  }, [searchTerm, page, activeFilter]);

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        page: page.toString(),
        limit: "10",
        lowStock: (activeFilter === "low_stock").toString(),
      });
      const response = await fetch(`/api/medicines?${params.toString()}`);
      if (!response.ok) throw new Error("Gagal memuat data obat");
      const data = await response.json();
      setMedicines(data.data || []);
      setTotalPages(data.pagination.totalPages || 1);
    } catch (error) {
      toast.error("Gagal memuat data obat.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiringMedicines = async () => {
    setLoadingExpiring(true);
    try {
      const response = await fetch("/api/medicines/expiring");
      if (!response.ok)
        throw new Error("Gagal memuat data obat akan kadaluarsa");
      const data = await response.json();
      setExpiringMedicines(data.data || []);
    } catch (error) {
      toast.error("Gagal memuat data obat akan kadaluarsa.");
      console.error(error);
    } finally {
      setLoadingExpiring(false);
    }
  };

  const handleRefresh = () => {
    if (activeFilter === "expiring") {
      fetchExpiringMedicines();
    } else {
      fetchMedicines();
    }
  };

  const handleOpenAddStock = (medicine: MedicineWithStock) => {
    setSelectedMedicine(medicine);
    setIsAddStockDialogOpen(true);
  };

  const handleOpenEditMedicine = (medicine: MedicineWithStock) => {
    setSelectedMedicine(medicine);
    setIsEditMedicineDialogOpen(true);
  };

  const handleOpenDeleteMedicine = (medicine: MedicineWithStock) => {
    setSelectedMedicine(medicine);
    setIsDeleteMedicineDialogOpen(true);
  };

  const handleDeleteMedicine = async () => {
    if (!selectedMedicine) return;
    setIsDeleteMedicineDialogOpen(false); // Close dialog immediately
    const originalMedicines = [...medicines];
    setMedicines(medicines.filter((m) => m.id !== selectedMedicine.id)); // Optimistic update

    try {
      const response = await fetch(`/api/medicines/${selectedMedicine.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal menghapus obat");
      }
      toast.success(`Obat "${selectedMedicine.name}" berhasil dihapus.`);
      // No need to call fetchMedicines() again due to optimistic update,
      // but you might want to refetch if there's a chance of data mismatch.
      // For now, we'll assume optimistic update is sufficient or a manual refresh is acceptable.
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menghapus obat."
      );
      setMedicines(originalMedicines); // Revert on error
      console.error(error);
    } finally {
      setSelectedMedicine(null);
    }
  };

  const getStockStatusBadge = (medicine: MedicineWithStock) => {
    if (medicine.isBelowThreshold) {
      if (medicine.totalStock === 0) {
        return (
          <Badge variant="destructive" className="bg-red-700 text-white">
            Habis
          </Badge>
        );
      }
      if (medicine.totalStock <= medicine.minimumStock) {
        return <Badge variant="destructive">Kritis</Badge>;
      }
      return (
        <Badge variant="destructive" className="bg-yellow-500 text-black">
          Stok Rendah
        </Badge>
      );
    }
    return <Badge variant="secondary">Cukup</Badge>;
  };

  const getExpiryUrgencyBadge = (urgency: MedicineStockItem["urgency"]) => {
    switch (urgency) {
      case "Critical":
        return (
          <Badge variant="destructive" className="bg-red-700 text-white">
            Kritis
          </Badge>
        );
      case "High":
        return <Badge variant="destructive">Tinggi</Badge>;
      case "Medium":
        return (
          <Badge
            variant="outline"
            className="border-yellow-500 text-yellow-700"
          >
            Sedang
          </Badge>
        );
      case "Low":
        return <Badge variant="secondary">Rendah</Badge>;
      case "Expired":
        return (
          <Badge variant="outline" className="bg-gray-500 text-white">
            Kadaluarsa
          </Badge>
        );
      default:
        return <Badge variant="outline">Tidak Diketahui</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventaris Obat"
        description="Kelola stok dan informasi obat"
      >
        <Button
          onClick={() => {
            setSelectedMedicine(null);
            setIsEditMedicineDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Tambah Obat Baru
        </Button>
      </PageHeader>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari nama obat..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-auto">
              <SelectValue placeholder="Filter Status Stok" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Stok</SelectItem>
              <SelectItem value="low_stock">Stok Rendah</SelectItem>
              <SelectItem value="expiring">Akan Kadaluarsa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={handleRefresh} className="shrink-0">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      {activeFilter === "expiring" ? (
        // Table for Expiring Medicines
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5" /> Obat Akan Kadaluarsa
            </CardTitle>
            <CardDescription>
              Daftar batch obat yang akan atau sudah kadaluarsa dalam 30 hari ke
              depan.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingExpiring ? (
              <div className="p-6 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" /> Memuat...
              </div>
            ) : expiringMedicines.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                Tidak ada obat yang akan kadaluarsa dalam waktu dekat.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Obat</TableHead>
                    <TableHead>No. Batch</TableHead>
                    <TableHead>Tgl Kadaluarsa</TableHead>
                    <TableHead>Sisa Kuantitas</TableHead>
                    <TableHead>Hari Tersisa</TableHead>
                    <TableHead>Urgensi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiringMedicines.map((item) => (
                    <TableRow
                      key={item.id}
                      className={
                        item.urgency === "Expired"
                          ? "bg-red-100 dark:bg-red-900/30"
                          : ""
                      }
                    >
                      <TableCell>{item.medicineName}</TableCell>
                      <TableCell>{item.batchNumber || "-"}</TableCell>
                      <TableCell>{formatDate(item.expiryDate)}</TableCell>
                      <TableCell>{item.remainingQuantity}</TableCell>
                      <TableCell>{item.daysUntilExpiry} hari</TableCell>
                      <TableCell>
                        {getExpiryUrgencyBadge(item.urgency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        // Table for All/Low Stock Medicines
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {activeFilter === "low_stock" ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <PackageSearch className="h-5 w-5" />
              )}
              {activeFilter === "low_stock"
                ? "Daftar Obat Stok Rendah"
                : "Daftar Semua Obat"}
            </CardTitle>
            <CardDescription>
              {activeFilter === "low_stock"
                ? "Obat yang stoknya mendekati atau di bawah batas minimum."
                : "Kelola daftar obat dan stoknya."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" /> Memuat...
              </div>
            ) : medicines.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                {activeFilter === "low_stock"
                  ? "Tidak ada obat dengan stok rendah."
                  : "Tidak ada data obat."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Obat</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Total Stok</TableHead>
                    <TableHead>Stok Min.</TableHead>
                    <TableHead>% Threshold</TableHead>
                    <TableHead>Status Stok</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medicines.map((medicine) => (
                    <TableRow
                      key={medicine.id}
                      className={
                        medicine.isBelowThreshold &&
                        medicine.totalStock <= medicine.minimumStock
                          ? "bg-red-50 dark:bg-red-900/20"
                          : medicine.isBelowThreshold
                          ? "bg-yellow-50 dark:bg-yellow-800/20"
                          : ""
                      }
                    >
                      <TableCell>
                        <div className="font-medium">{medicine.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                          {medicine.description || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatRupiah(parseFloat(medicine.price))}
                      </TableCell>
                      <TableCell>
                        {medicine.totalStock} ({medicine.batchCount} batch)
                      </TableCell>
                      <TableCell>{medicine.minimumStock}</TableCell>
                      <TableCell>
                        {medicine.reorderThresholdPercentage}%
                      </TableCell>
                      <TableCell>{getStockStatusBadge(medicine)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleOpenAddStock(medicine)}
                            >
                              <PackagePlus className="mr-2 h-4 w-4" /> Tambah
                              Stok
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenEditMedicine(medicine)}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Edit Obat
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                alert(
                                  `Lihat detail batch untuk ${medicine.name}`
                                )
                              }
                            >
                              <Layers className="mr-2 h-4 w-4" /> Lihat Batch
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleOpenDeleteMedicine(medicine)}
                            >
                              <Trash className="mr-2 h-4 w-4" /> Hapus Obat
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          {!loading && medicines.length > 0 && activeFilter !== "expiring" && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Halaman {page} dari {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Dialog Tambah Stok */}
      <Dialog
        open={isAddStockDialogOpen}
        onOpenChange={setIsAddStockDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Stok: {selectedMedicine?.name}</DialogTitle>
            <DialogDescription>
              Masukkan detail batch stok baru untuk obat ini.
            </DialogDescription>
          </DialogHeader>
          {selectedMedicine && (
            <MedicineStockForm
              medicineId={selectedMedicine.id}
              onSuccess={() => {
                setIsAddStockDialogOpen(false);
                fetchMedicines(); // Refresh data
              }}
              onCancel={() => setIsAddStockDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Edit/Tambah Obat */}
      <Dialog
        open={isEditMedicineDialogOpen}
        onOpenChange={setIsEditMedicineDialogOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedMedicine ? "Edit Obat" : "Tambah Obat Baru"}
            </DialogTitle>
            <DialogDescription>
              {selectedMedicine
                ? `Perbarui detail untuk ${selectedMedicine.name}.`
                : "Masukkan detail untuk obat baru."}
            </DialogDescription>
          </DialogHeader>
          <MedicineForm
            isEdit={!!selectedMedicine}
            initialData={
              selectedMedicine
                ? {
                    id: selectedMedicine.id,
                    name: selectedMedicine.name,
                    description: selectedMedicine.description || "",
                    price: parseFloat(selectedMedicine.price),
                    minimumStock: selectedMedicine.minimumStock,
                    reorderThresholdPercentage:
                      selectedMedicine.reorderThresholdPercentage,
                  }
                : undefined
            }
            onSuccess={() => {
              setIsEditMedicineDialogOpen(false);
              fetchMedicines();
            }}
            onCancel={() => setIsEditMedicineDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Delete Obat */}
      <Dialog
        open={isDeleteMedicineDialogOpen}
        onOpenChange={setIsDeleteMedicineDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Obat: {selectedMedicine?.name}</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus obat {selectedMedicine?.name}?
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDeleteMedicineDialogOpen(false)}
            >
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteMedicine}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Loading fallback component
function InventoryLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventaris Obat"
        description="Kelola stok dan informasi obat"
      >
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" /> Tambah Obat Baru
        </Button>
      </PageHeader>

      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    </div>
  );
}

// Main component with Suspense wrapper
export default function MedicineInventoryPage() {
  return (
    <Suspense fallback={<InventoryLoading />}>
      <InventoryContent />
    </Suspense>
  );
}
