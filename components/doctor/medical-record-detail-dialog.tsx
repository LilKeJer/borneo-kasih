"use client";

import { useCallback, useEffect, useState } from "react";
import { useEncryption } from "@/hooks/use-encryption";
import { formatDate } from "@/lib/utils/date";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, User, Stethoscope, Activity } from "lucide-react";

interface MedicalRecordDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: number | null;
}

interface MedicalRecordDetail {
  id: number;
  patientName: string | null;
  doctorName: string | null;
  condition: string | null;
  description: string | null;
  treatment: string | null;
  doctorNotes: string | null;
  encryptionIvDoctor: string | null;
  dateOfDiagnosis: string | null;
  createdAt: string | null;
}

export function MedicalRecordDetailDialog({
  open,
  onOpenChange,
  recordId,
}: MedicalRecordDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<MedicalRecordDetail | null>(null);
  const { decrypt, initialize } = useEncryption();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const resolveIv = useCallback((ivString: string | null, key: string) => {
    if (!ivString) return null;

    try {
      const parsed = JSON.parse(ivString) as Record<string, string>;
      return parsed[key] ?? null;
    } catch {
      return ivString;
    }
  }, []);

  const decryptField = useCallback(
    async (value: string | null, ivString: string | null, key: string) => {
      if (!value) return null;

      const resolvedIv = resolveIv(ivString, key);
      if (!resolvedIv) return value;

      try {
        return await decrypt(value, resolvedIv);
      } catch (error) {
        console.error("Decrypt medical record field error:", error);
        return "Data terenkripsi";
      }
    },
    [decrypt, resolveIv]
  );

  useEffect(() => {
    if (!open || !recordId) {
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/medical-records/${recordId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Gagal memuat detail rekam medis");
        }

        const data = await response.json();
        const encryptionIvDoctor = data.encryptionIvDoctor || null;

        const [condition, description, treatment, doctorNotes] =
          await Promise.all([
            decryptField(data.condition || null, encryptionIvDoctor, "condition"),
            decryptField(
              data.description || null,
              encryptionIvDoctor,
              "description"
            ),
            decryptField(data.treatment || null, encryptionIvDoctor, "treatment"),
            decryptField(
              data.doctorNotes || null,
              encryptionIvDoctor,
              "doctorNotes"
            ),
          ]);

        setRecord({
          id: data.id,
          patientName: data.patientName || null,
          doctorName: data.doctorName || null,
          condition,
          description,
          treatment,
          doctorNotes,
          encryptionIvDoctor,
          dateOfDiagnosis: data.dateOfDiagnosis || null,
          createdAt: data.createdAt || null,
        });
      } catch (error) {
        console.error("Error fetching doctor medical record detail:", error);
        setRecord(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchDetail();
  }, [decryptField, open, recordId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detail Rekam Medis</DialogTitle>
          <DialogDescription>
            Ringkasan pemeriksaan pasien yang dapat ditinjau dokter.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : record ? (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border p-3">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Tanggal
                </p>
                <p className="mt-1 font-medium">
                  {formatDate(record.dateOfDiagnosis || record.createdAt || "")}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  Pasien
                </p>
                <p className="mt-1 font-medium">
                  {record.patientName || "Pasien"}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Stethoscope className="h-4 w-4" />
                  Dokter
                </p>
                <p className="mt-1 font-medium">
                  {record.doctorName || "Dokter"}
                </p>
              </div>
            </div>

            <div className="rounded-md border p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Activity className="h-4 w-4" />
                Diagnosis
              </p>
              <Badge variant="secondary">
                {record.condition || "Tidak ada diagnosis"}
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="rounded-md border p-4">
                <p className="text-sm font-medium">Deskripsi Pemeriksaan</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {record.description || "Tidak ada deskripsi pemeriksaan"}
                </p>
              </div>

              <div className="rounded-md border p-4">
                <p className="text-sm font-medium">Penanganan</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {record.treatment || "Tidak ada penanganan"}
                </p>
              </div>

              <div className="rounded-md border p-4">
                <p className="text-sm font-medium">Catatan Dokter</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {record.doctorNotes || "Tidak ada catatan dokter"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Detail rekam medis tidak tersedia.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
