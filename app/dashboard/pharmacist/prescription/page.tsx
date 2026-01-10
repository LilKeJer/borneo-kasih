// app/dashboard/pharmacist/prescriptions/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ClipboardList,
  Search,
  CheckCircle,
  PackageCheck,
  Loader2,
  Eye,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { formatDate } from "@/lib/utils/date";
import { useEncryption } from "@/hooks/use-encryption"; // Asumsi hook enkripsi sudah ada

interface MedicineInPrescription {
  prescriptionMedicineId: number;
  medicineId: number;
  medicineName: string;
  encryptedDosage: string | null;
  encryptedFrequency: string | null;
  encryptedDuration: string | null;
  encryptionIv: string | null;
  quantityUsed: number;
  stockId: number;
  isDispensed: boolean; // Untuk menandai apakah obat ini sudah diserahkan
}

type PrescriptionStatus = "Pending" | "Processed" | "Dispensed";

interface Prescription {
  id: number;
  medicalHistoryId: number;
  patientName: string;
  doctorName: string;
  prescriptionDate: string;
  status: PrescriptionStatus; // Status resep keseluruhan
  medicines: MedicineInPrescription[];
  hasPayment: boolean;
}

interface DecryptedMedicine
  extends Omit<
    MedicineInPrescription,
    | "encryptedDosage"
    | "encryptedFrequency"
    | "encryptedDuration"
    | "encryptionIv"
  > {
  dosage: string;
  frequency: string;
  duration: string;
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] =
    useState<Prescription | null>(null);
  const [decryptedMedicines, setDecryptedMedicines] = useState<
    DecryptedMedicine[]
  >([]);
  const [processing, setProcessing] = useState(false);

  const { decrypt, isInitialized: encryptionInitialized } = useEncryption();

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: searchTerm, limit: "50" }); // Ambil lebih banyak untuk filtering client-side jika perlu
      const response = await fetch(`/api/prescriptions?${params.toString()}`);
      if (!response.ok) throw new Error("Gagal memuat data resep");
      const data = await response.json();
      setPrescriptions(data.data || []);
    } catch (error) {
      toast.error("Gagal memuat data resep.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const decryptPrescriptionDetails = async (prescription: Prescription) => {
    if (!encryptionInitialized || !prescription) return;
    setLoading(true);
    try {
      const decrypted: DecryptedMedicine[] = await Promise.all(
        prescription.medicines.map(async (med) => {
          if (
            med.encryptedDosage &&
            med.encryptedFrequency &&
            med.encryptedDuration &&
            med.encryptionIv
          ) {
            return {
              ...med,
              dosage: await decrypt(med.encryptedDosage, med.encryptionIv),
              frequency: await decrypt(
                med.encryptedFrequency,
                med.encryptionIv
              ),
              duration: await decrypt(med.encryptedDuration, med.encryptionIv),
            };
          }
          return { ...med, dosage: "-", frequency: "-", duration: "-" }; // Fallback
        })
      );
      setDecryptedMedicines(decrypted);
    } catch (error) {
      console.error("Gagal mendekripsi detail resep:", error);
      toast.error("Gagal mendekripsi detail resep.");
      setDecryptedMedicines(
        prescription.medicines.map((m) => ({
          ...m,
          dosage: "Error",
          frequency: "Error",
          duration: "Error",
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setIsDetailOpen(true);
    if (encryptionInitialized) {
      await decryptPrescriptionDetails(prescription);
    } else {
      // Handle case where encryption is not yet ready (e.g., show a message or retry)
      toast.info("Menyiapkan enkripsi, silakan coba lagi sebentar.");
      // Optionally, you can trigger initialization here if needed, though useEncryption should handle it.
    }
  };

  const handleDispensePrescription = async (prescriptionId: number) => {
    setProcessing(true);
    try {
      const response = await fetch(
        `/api/prescriptions/${prescriptionId}/dispense`,
        {
          method: "POST",
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal menyerahkan resep");
      }
      toast.success("Resep berhasil diserahkan dan stok diperbarui.");
      fetchPrescriptions(); // Refresh list
      setIsDetailOpen(false); // Close dialog
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Terjadi kesalahan."
      );
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: Prescription["status"]) => {
    switch (status) {
      case "Pending":
        return <Badge variant="outline">Pending</Badge>;
      case "Processed":
      case "Dispensed":
        return (
          <Badge variant="secondary" className="bg-green-600 text-white">
            Sudah Diserahkan
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Resep"
        description="Kelola resep obat dari dokter"
      >
        <Button
          variant="outline"
          onClick={fetchPrescriptions}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </PageHeader>

      <div className="flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari nama pasien, dokter, atau ID resep..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Daftar Resep Obat
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && prescriptions.length === 0 ? (
            <div className="p-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" /> Memuat...
            </div>
          ) : !loading && prescriptions.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Tidak ada resep yang perlu diproses.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Resep</TableHead>
                  <TableHead>Pasien</TableHead>
                  <TableHead>Dokter</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status Pembayaran</TableHead>
                  <TableHead>Status Resep</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((prescription) => (
                  <TableRow key={prescription.id}>
                    <TableCell>#{prescription.id}</TableCell>
                    <TableCell className="font-medium">
                      {prescription.patientName}
                    </TableCell>
                    <TableCell>{prescription.doctorName}</TableCell>
                    <TableCell>
                      {formatDate(prescription.prescriptionDate)}
                    </TableCell>
                    <TableCell>
                      {prescription.hasPayment ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700"
                        >
                          Sudah Dibayar
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-yellow-100 text-yellow-700"
                        >
                          Belum Dibayar
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(prescription.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(prescription)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Lihat Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Resep Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Resep #{selectedPrescription?.id}</DialogTitle>
            {selectedPrescription && (
              <DialogDescription>
                Pasien: {selectedPrescription.patientName} | Dokter:{" "}
                {selectedPrescription.doctorName} | Tanggal:{" "}
                {formatDate(selectedPrescription.prescriptionDate)}
              </DialogDescription>
            )}
          </DialogHeader>
          {loading ? (
            <div className="py-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin" /> Memuat detail...
            </div>
          ) : selectedPrescription && decryptedMedicines.length > 0 ? (
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {!selectedPrescription.hasPayment && (
                <Alert
                  variant="destructive"
                  className="bg-yellow-50 border-yellow-400 text-yellow-700"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Pembayaran untuk resep ini belum diselesaikan. Obat tidak
                    dapat diserahkan sebelum pembayaran lunas.
                  </AlertDescription>
                </Alert>
              )}
              <div className="font-semibold text-sm">Daftar Obat:</div>
              <ul className="space-y-3">
                {decryptedMedicines.map((med) => (
                  <li
                    key={med.medicineId}
                    className="p-3 border rounded-md bg-muted/50"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{med.medicineName}</h4>
                      <Badge
                        variant={med.isDispensed ? "secondary" : "outline"}
                      >
                        {med.isDispensed
                          ? "Sudah Diberikan"
                          : "Belum Diberikan"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Jumlah: {med.quantityUsed}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Dosis: {med.dosage}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Frekuensi: {med.frequency}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Durasi: {med.duration}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              Gagal memuat detail obat atau enkripsi belum siap.
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Tutup
            </Button>
            {selectedPrescription &&
              selectedPrescription.status === "Pending" &&
              selectedPrescription.hasPayment && (
                <Button
                  onClick={() =>
                    selectedPrescription &&
                    handleDispensePrescription(selectedPrescription.id)
                  }
                  disabled={processing || !selectedPrescription.hasPayment}
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <PackageCheck className="h-4 w-4 mr-2" />
                  )}
                  Serahkan Obat & Update Stok
                </Button>
              )}
            {selectedPrescription &&
              (selectedPrescription.status === "Processed" ||
                selectedPrescription.status === "Dispensed") && (
                <Badge
                  variant="secondary"
                  className="bg-green-600 text-white text-sm p-2"
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" /> Semua obat telah
                  diserahkan
                </Badge>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
