// app/dashboard/doctor/medical-records/create/page.tsx
"use client";

import Link from "next/link";
import { useState, useEffect, Suspense, useCallback } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { FullMedicalRecordForm } from "@/components/doctor/full-medical-record-form"; // Komponen form baru
import { MedicalRecordDetailDialog } from "@/components/doctor/medical-record-detail-dialog";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { type Service as ApiServiceType } from "@/types/payment";
import { type Medicine as ApiMedicineType } from "@/types/pharmacy";
import { useEncryption } from "@/hooks/use-encryption";
import { formatDate, formatDateTime } from "@/lib/utils/date";

interface PatientData {
  id: string;
  name: string;
  // Tambahkan field lain jika perlu ditampilkan
}

interface PreviousMedicalRecord {
  id: number;
  patientId: number;
  patientName: string;
  doctorName: string;
  diagnosis: string;
  encryptionIvDoctor?: string | null;
  date: string;
}

function CreateMedicalRecordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdParam = searchParams.get("patientId");
  const reservationIdParam = searchParams.get("reservationId");

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [availableServices, setAvailableServices] = useState<ApiServiceType[]>(
    []
  );
  const [availableMedicines, setAvailableMedicines] = useState<
    ApiMedicineType[]
  >([]);

  const [loadingPatient, setLoadingPatient] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingMedicines, setLoadingMedicines] = useState(true);
  const [loadingNurseNotes, setLoadingNurseNotes] = useState(false);
  const [loadingPreviousRecords, setLoadingPreviousRecords] = useState(false);
  const [nurseNotes, setNurseNotes] = useState<string | null>(null);
  const [nurseCheckupTimestamp, setNurseCheckupTimestamp] = useState<
    string | null
  >(null);
  const [previousRecords, setPreviousRecords] = useState<
    PreviousMedicalRecord[]
  >([]);
  const [selectedHistoryRecordId, setSelectedHistoryRecordId] = useState<
    number | null
  >(null);
  const [isHistoryDetailOpen, setIsHistoryDetailOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { decrypt, initialize } = useEncryption();

  useEffect(() => {
    initialize();
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
    async (value: string, ivString: string | null, key: string) => {
      const resolvedIv = resolveIv(ivString, key);
      if (!resolvedIv) {
        return value;
      }

      try {
        return await decrypt(value, resolvedIv);
      } catch (error) {
        console.error("Gagal mendekripsi data rekam medis:", error);
        return "Data terenkripsi";
      }
    },
    [decrypt, resolveIv]
  );

  useEffect(() => {
    if (!patientIdParam) {
      setError("ID Pasien tidak ditemukan di URL.");
      setLoadingPatient(false);
      setLoadingServices(false);
      setLoadingMedicines(false);
      return;
    }

    async function fetchData() {
      try {
        // Fetch Patient Data
        setLoadingPatient(true);
        const patientRes = await fetch(`/api/patients/${patientIdParam}`);
        if (!patientRes.ok) throw new Error("Gagal memuat data pasien.");
        const patientData = await patientRes.json();
        setPatient(patientData);
        setLoadingPatient(false);

        // Fetch Available Services
        setLoadingServices(true);
        const servicesRes = await fetch("/api/services?limit=1000&active=true");
        if (!servicesRes.ok) throw new Error("Gagal memuat daftar layanan.");
        const servicesData = await servicesRes.json();
        setAvailableServices(servicesData.data || []);
        setLoadingServices(false);

        // Fetch Available Medicines
        setLoadingMedicines(true);
        const medicinesRes = await fetch("/api/medicines?limit=1000&isActive=true");
        if (!medicinesRes.ok) throw new Error("Gagal memuat daftar obat.");
        const medicinesData = await medicinesRes.json();
        setAvailableMedicines(medicinesData.data || []);
        setLoadingMedicines(false);

        if (reservationIdParam) {
          setLoadingNurseNotes(true);
          const nurseRes = await fetch(
            `/api/nurse/checkups?reservationId=${reservationIdParam}`
          );
          if (nurseRes.ok) {
            const nurseData = await nurseRes.json();
            if (nurseData.exists) {
              if (nurseData.nurseNotes && nurseData.encryptionIvNurse) {
                try {
                  const decrypted = await decrypt(
                    nurseData.nurseNotes,
                    nurseData.encryptionIvNurse
                  );
                  setNurseNotes(decrypted);
                } catch (error) {
                  console.error("Gagal mendekripsi catatan perawat:", error);
                  setNurseNotes("Data terenkripsi");
                }
              } else {
                setNurseNotes(nurseData.nurseNotes || "");
              }
              setNurseCheckupTimestamp(
                nurseData.nurseCheckupTimestamp || null
              );
            }
          }
          setLoadingNurseNotes(false);
        }
      } catch (err) {
        console.error("Fetch data error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memuat data."
        );
        setLoadingPatient(false);
        setLoadingServices(false);
        setLoadingMedicines(false);
        setLoadingNurseNotes(false);
      }
    }
    fetchData();
  }, [patientIdParam, reservationIdParam, decrypt]);

  useEffect(() => {
    if (!patientIdParam) {
      setPreviousRecords([]);
      setLoadingPreviousRecords(false);
      return;
    }

    let isMounted = true;

    async function fetchPreviousRecords() {
      try {
        setLoadingPreviousRecords(true);
        const params = new URLSearchParams({
          patientId: patientIdParam ?? "",
          limit: "5",
        });

        if (reservationIdParam) {
          params.set("excludeReservationId", reservationIdParam);
        }

        const response = await fetch(
          `/api/doctor/medical-records?${params.toString()}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Gagal memuat riwayat rekam medis pasien");
        }

        const result = await response.json();
        const records = Array.isArray(result.data) ? result.data : [];
        const decryptedRecords = await Promise.all(
          records.map(async (record: PreviousMedicalRecord) => ({
            ...record,
            diagnosis: await decryptField(
              record.diagnosis,
              record.encryptionIvDoctor || null,
              "condition"
            ),
          }))
        );

        if (isMounted) {
          setPreviousRecords(decryptedRecords);
        }
      } catch (error) {
        console.error("Error fetching previous medical records:", error);
        if (isMounted) {
          setPreviousRecords([]);
        }
      } finally {
        if (isMounted) {
          setLoadingPreviousRecords(false);
        }
      }
    }

    void fetchPreviousRecords();

    return () => {
      isMounted = false;
    };
  }, [decryptField, patientIdParam, reservationIdParam]);

  const handleSuccess = (medicalRecordId: number, prescriptionId?: number) => {
    // Tampilkan notifikasi sukses
    toast.success(
      `Rekam medis berhasil dibuat. ID: ${medicalRecordId}${
        prescriptionId ? `, Resep ID: ${prescriptionId}` : ""
      }`
    );
    // Jika ada ID resep, bisa juga menampilkan notifikasi khusus
    // Notifikasi sudah ditangani di dalam form
    // Redirect kembali ke halaman antrian dokter atau halaman detail pasien
    router.push("/dashboard/doctor/queue");
  };

  const isLoadingInitialData =
    loadingPatient || loadingServices || loadingMedicines;

  if (isLoadingInitialData) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Memuat data pendukung...</p>
      </div>
    );
  }

  if (error || !patientIdParam) {
    return (
      <div className="space-y-6">
        <PageHeader title="Buat Rekam Medis" />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "Parameter tidak lengkap."}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
      </div>
    );
  }

  if (!patient && !loadingPatient) {
    return (
      <div className="space-y-6">
        <PageHeader title="Buat Rekam Medis" />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Data pasien dengan ID {patientIdParam} tidak ditemukan.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat Rekam Medis Baru"
        description={`Untuk pasien: ${patient?.name || "Loading..."}`}
      >
        <Button variant="outline" onClick={() => router.back()} size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Antrian
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Form Pemeriksaan Dokter</CardTitle>
          <CardDescription>
            Lengkapi detail pemeriksaan, layanan, dan resep jika diperlukan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingNurseNotes && (
            <div className="mb-6 text-sm text-muted-foreground">
              Memuat catatan perawat...
            </div>
          )}
          {nurseNotes && (
            <Card className="mb-6 border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="text-base">Catatan Perawat</CardTitle>
                {nurseCheckupTimestamp && (
                  <CardDescription>
                    Diperbarui{" "}
                    {formatDateTime(nurseCheckupTimestamp)}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{nurseNotes}</p>
              </CardContent>
            </Card>
          )}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    Riwayat Rekam Medis Sebelumnya
                  </CardTitle>
                  <CardDescription>
                    Dokter dapat meninjau hasil pemeriksaan terdahulu sebelum
                    mengisi pemeriksaan baru.
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/doctor/medical-records">
                    Lihat Semua Rekam Medis
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPreviousRecords ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat riwayat rekam medis...
                </div>
              ) : previousRecords.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Belum ada riwayat rekam medis sebelumnya untuk pasien ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {previousRecords.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => {
                        setSelectedHistoryRecordId(record.id);
                        setIsHistoryDetailOpen(true);
                      }}
                      className="w-full rounded-md border p-4 text-left transition-colors hover:bg-accent/40"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{record.patientName}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(record.date)}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {record.doctorName}
                        </p>
                      </div>
                      <p className="mt-2 text-sm">
                        Diagnosis:{" "}
                        <span className="font-medium">{record.diagnosis}</span>
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          {patient && (
            <FullMedicalRecordForm
              patientId={patientIdParam}
              reservationId={
                reservationIdParam ? parseInt(reservationIdParam) : undefined
              }
              availableServices={availableServices}
              availableMedicines={availableMedicines}
              onSuccess={handleSuccess}
              onCancel={() => router.back()}
            />
          )}
        </CardContent>
      </Card>

      <MedicalRecordDetailDialog
        open={isHistoryDetailOpen}
        onOpenChange={setIsHistoryDetailOpen}
        recordId={selectedHistoryRecordId}
      />
    </div>
  );
}

export default function CreateMedicalRecordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Memuat halaman...</p>
        </div>
      }
    >
      <CreateMedicalRecordContent />
    </Suspense>
  );
}
