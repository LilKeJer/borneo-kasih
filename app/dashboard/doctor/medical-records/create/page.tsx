// app/dashboard/doctor/medical-records/create/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { QuickMedicalRecordForm } from "@/components/doctor/quick-medical-record-form";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Patient {
  id: string;
  name: string;
  dateOfBirth?: string;
  gender?: string;
  // informasi lain jika diperlukan
}

export default function CreateMedicalRecordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId");

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) {
      setError("ID Pasien tidak ditemukan");
      setLoading(false);
      return;
    }

    const fetchPatient = async () => {
      try {
        const response = await fetch(`/api/patients/${patientId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch patient");
        }
        const data = await response.json();
        setPatient(data);
        setError(null);
      } catch (error) {
        console.error("Error fetching patient:", error);
        setError("Gagal memuat data pasien");
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [patientId]);

  const handleSuccess = () => {
    // Update antrian jika berhasil dibuat
    const updateQueueStatus = async () => {
      try {
        if (!patientId) return;

        const response = await fetch(`/api/queue/${patientId}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            examinationStatus: "Completed",
          }),
        });

        if (!response.ok) {
          console.error("Failed to update queue status");
        }
      } catch (error) {
        console.error("Error updating queue status:", error);
      }
    };

    updateQueueStatus();

    // Redirect kembali ke halaman antrian
    router.push("/dashboard/doctor/queue");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Buat Rekam Medis"
          description="Tambahkan rekam medis baru untuk pasien"
        />
        <Card>
          <CardContent className="py-6">
            <div className="text-center text-muted-foreground">
              {error || "Pasien tidak ditemukan"}
            </div>
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/doctor/queue")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke Antrian
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat Rekam Medis"
        description={`Tambahkan rekam medis untuk ${patient.name}`}
      />

      <Card>
        <CardContent className="py-6">
          <div className="mb-6">
            <div className="text-lg font-semibold">{patient.name}</div>
            {patient.gender && patient.dateOfBirth && (
              <div className="text-sm text-muted-foreground">
                {patient.gender === "L" ? "Laki-laki" : "Perempuan"},{" "}
                {new Date(patient.dateOfBirth).toLocaleDateString("id-ID")}
              </div>
            )}
          </div>

          <QuickMedicalRecordForm
            patientId={patientId || ""}
            onSuccess={handleSuccess}
            onCancel={() => router.push("/dashboard/doctor/queue")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
