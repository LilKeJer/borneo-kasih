// app/dashboard/nurse/medical-records/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useEncryption } from "@/hooks/use-encryption";

interface NurseCheckup {
  id: number;
  reservationId: number | null;
  patientId: number;
  patientName: string;
  doctorName: string;
  nurseNotes: string | null;
  encryptionIvNurse?: string | null;
  nurseCheckupTimestamp: string | null;
}

export default function NurseMedicalRecordsPage() {
  const [records, setRecords] = useState<NurseCheckup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<NurseCheckup | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { decrypt, initialize } = useEncryption();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/nurse/checkups/history");
      if (!response.ok) {
        throw new Error("Failed to fetch nurse checkup history");
      }
      const data = await response.json();
      const rawRecords = Array.isArray(data.data) ? data.data : [];
      const decryptedRecords = await Promise.all(
        rawRecords.map(async (record: NurseCheckup) => {
          if (record.nurseNotes && record.encryptionIvNurse) {
            try {
              const decrypted = await decrypt(
                record.nurseNotes,
                record.encryptionIvNurse
              );
              return { ...record, nurseNotes: decrypted };
            } catch (error) {
              console.error("Gagal mendekripsi catatan perawat:", error);
              return { ...record, nurseNotes: "Data terenkripsi" };
            }
          }
          return record;
        })
      );
      setRecords(decryptedRecords);
    } catch (error) {
      console.error("Error fetching nurse history:", error);
      toast.error("Gagal memuat riwayat pemeriksaan perawat.");
    } finally {
      setLoading(false);
    }
  }, [decrypt]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleView = (record: NurseCheckup) => {
    setSelectedRecord(record);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Pemeriksaan Perawat"
        description="Catatan pemeriksaan awal yang sudah dicatat."
      >
        <Button variant="outline" onClick={fetchRecords}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </PageHeader>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Pasien</TableHead>
              <TableHead>Dokter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  Belum ada catatan pemeriksaan.
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {formatDateTime(record.nurseCheckupTimestamp)}
                  </TableCell>
                  <TableCell>{record.patientName}</TableCell>
                  <TableCell>{record.doctorName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Tercatat</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleView(record)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Catatan Perawat</DialogTitle>
            <DialogDescription>
              {selectedRecord
                ? `Pasien: ${selectedRecord.patientName}`
                : "Detail catatan perawat."}
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Dokter: {selectedRecord.doctorName}
              </div>
              <div className="text-sm text-muted-foreground">
                Tanggal: {formatDateTime(selectedRecord.nurseCheckupTimestamp)}
              </div>
              <div className="rounded-md border p-3 text-sm">
                {selectedRecord.nurseNotes || "Tidak ada catatan."}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
