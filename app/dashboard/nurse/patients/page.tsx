// app/dashboard/nurse/patients/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { useEncryption } from "@/hooks/use-encryption";

interface QueueItem {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: string;
  doctorName: string;
  queueNumber: number | null;
  reservationDate: string;
  status: string;
  examinationStatus: string;
  complaint?: string | null;
  hasNurseCheckup?: boolean;
}

interface QueueGroup {
  doctorId: string;
  doctorName: string;
  queues: Omit<QueueItem, "doctorId" | "doctorName">[];
}

export default function NursePatientsPage() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<QueueItem | null>(null);
  const [nurseNotes, setNurseNotes] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastCheckupAt, setLastCheckupAt] = useState<string | null>(null);
  const { encrypt, decrypt, initialize } = useEncryption();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const fetchQueueData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/queue/date?date=${selectedDate}`);
      if (!response.ok) {
        throw new Error("Failed to fetch queue data");
      }
      const data = await response.json();
      const groups: QueueGroup[] = Array.isArray(data.data) ? data.data : [];
      const flattened = groups.flatMap((group) =>
        group.queues.map((queue) => ({
          ...queue,
          doctorId: group.doctorId,
          doctorName: group.doctorName,
        }))
      );

      const filteredByStatus = flattened.filter((queue) =>
        ["Waiting", "Not Started"].includes(queue.examinationStatus)
      );

      const filteredBySearch = filteredByStatus.filter((queue) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          queue.patientName.toLowerCase().includes(term) ||
          String(queue.queueNumber || "").includes(term) ||
          queue.doctorName.toLowerCase().includes(term)
        );
      });

      filteredBySearch.sort((a, b) => {
        const aNumber = a.queueNumber ?? 0;
        const bNumber = b.queueNumber ?? 0;
        if (aNumber !== bNumber) return aNumber - bNumber;
        return a.patientName.localeCompare(b.patientName);
      });

      setQueueItems(filteredBySearch);
    } catch (error) {
      console.error("Error fetching nurse queue:", error);
      toast.error("Gagal memuat data antrian.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedDate]);

  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Waiting":
        return <Badge variant="secondary">Menunggu</Badge>;
      case "In Progress":
        return <Badge variant="default">Sedang Diperiksa</Badge>;
      case "Completed":
        return <Badge variant="default">Selesai</Badge>;
      case "Cancelled":
        return <Badge variant="destructive">Dibatalkan</Badge>;
      case "Not Started":
        return <Badge variant="outline">Belum Check-in</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleOpenCheckup = async (queue: QueueItem) => {
    setSelectedQueue(queue);
    setIsDialogOpen(true);
    setNurseNotes("");
    setLastCheckupAt(null);

    try {
      setNotesLoading(true);
      const response = await fetch(
        `/api/nurse/checkups?reservationId=${queue.id}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.exists) {
          if (data.nurseNotes && data.encryptionIvNurse) {
            try {
              const decrypted = await decrypt(
                data.nurseNotes,
                data.encryptionIvNurse
              );
              setNurseNotes(decrypted);
            } catch (error) {
              console.error("Gagal mendekripsi catatan perawat:", error);
              setNurseNotes("Data terenkripsi");
            }
          } else {
            setNurseNotes(data.nurseNotes || "");
          }
          setLastCheckupAt(data.nurseCheckupTimestamp || null);
        }
      }
    } catch (error) {
      console.error("Error fetching nurse notes:", error);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleSaveCheckup = async () => {
    if (!selectedQueue) return;
    if (!nurseNotes.trim()) {
      toast.error("Catatan perawat wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      const encrypted = await encrypt(nurseNotes);
      const response = await fetch("/api/nurse/checkups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationId: selectedQueue.id,
          nurseNotes: encrypted.ciphertext,
          encryptionIvNurse: encrypted.iv,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal menyimpan catatan perawat");
      }

      toast.success("Catatan perawat berhasil disimpan.");
      setIsDialogOpen(false);
      setSelectedQueue(null);
      setNurseNotes("");
      setLastCheckupAt(null);
      fetchQueueData();
    } catch (error) {
      console.error("Error saving nurse notes:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan catatan perawat."
      );
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pemeriksaan Awal"
        description="Catat pemeriksaan awal pasien sebelum dokter."
      >
        <Button variant="outline" onClick={fetchQueueData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari pasien, dokter, atau nomor..."
            className="pl-8"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <Input
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="w-full md:w-auto"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">No.</TableHead>
              <TableHead>Pasien</TableHead>
              <TableHead>Dokter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Keluhan</TableHead>
              <TableHead>Catatan Perawat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : queueItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  Tidak ada antrian untuk tanggal ini.
                </TableCell>
              </TableRow>
            ) : (
              queueItems.map((queue) => (
                <TableRow key={queue.id}>
                  <TableCell className="font-medium">
                    {queue.queueNumber || "-"}
                  </TableCell>
                  <TableCell>{queue.patientName}</TableCell>
                  <TableCell>{queue.doctorName}</TableCell>
                  <TableCell>{getStatusBadge(queue.examinationStatus)}</TableCell>
                  <TableCell className="max-w-[240px] text-sm text-muted-foreground">
                    {queue.complaint || "Tidak ada keluhan"}
                  </TableCell>
                  <TableCell>
                    {queue.hasNurseCheckup ? (
                      <Badge variant="secondary">Sudah Dicatat</Badge>
                    ) : (
                      <Badge variant="outline">Belum</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleOpenCheckup(queue)}
                    >
                      {queue.hasNurseCheckup ? "Perbarui" : "Catat"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Catatan Pemeriksaan Awal</DialogTitle>
            <DialogDescription>
              {selectedQueue
                ? `Pasien: ${selectedQueue.patientName}`
                : "Lengkapi catatan perawat."}
            </DialogDescription>
          </DialogHeader>
          {selectedQueue && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Dokter: {selectedQueue.doctorName}
              </div>
              {lastCheckupAt && (
                <div className="text-sm text-muted-foreground">
                  Terakhir diperbarui: {formatDateTime(lastCheckupAt)}
                </div>
              )}
              <div>
                <Textarea
                  rows={5}
                  placeholder="Tulis hasil pemeriksaan awal, tanda vital, atau catatan penting..."
                  value={nurseNotes}
                  onChange={(event) => setNurseNotes(event.target.value)}
                  disabled={notesLoading || saving}
                />
                {notesLoading && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Memuat catatan sebelumnya...
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button onClick={handleSaveCheckup} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
