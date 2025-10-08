// app/dashboard/doctor/medical-records/create/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
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
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { type Service as ApiServiceType } from "@/types/payment";
import { type Medicine as ApiMedicineType } from "@/types/pharmacy";

interface PatientData {
  id: string;
  name: string;
  // Tambahkan field lain jika perlu ditampilkan
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
  const [error, setError] = useState<string | null>(null);

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
        const servicesRes = await fetch("/api/services?limit=1000"); // Ambil semua layanan
        if (!servicesRes.ok) throw new Error("Gagal memuat daftar layanan.");
        const servicesData = await servicesRes.json();
        setAvailableServices(servicesData.data || []);
        setLoadingServices(false);

        // Fetch Available Medicines
        setLoadingMedicines(true);
        const medicinesRes = await fetch("/api/medicines?limit=1000"); // Ambil semua obat
        if (!medicinesRes.ok) throw new Error("Gagal memuat daftar obat.");
        const medicinesData = await medicinesRes.json();
        setAvailableMedicines(medicinesData.data || []);
        setLoadingMedicines(false);
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
      }
    }
    fetchData();
  }, [patientIdParam]);

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
