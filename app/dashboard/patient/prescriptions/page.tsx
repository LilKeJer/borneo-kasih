// app/dashboard/patient/prescriptions/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Pill,
  FileText,
  Calendar,
  User,
  Hash,
  Clock,
  AlertCircle,
} from "lucide-react";
import { formatDate } from "@/lib/utils/date";

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
}

interface Prescription {
  date: string;
  doctorName: string;
  diagnosis: string;
  medicines: Medicine[];
}

export default function PatientPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/patients/prescriptions");

      if (!response.ok) {
        throw new Error("Failed to fetch prescriptions");
      }

      const data = await response.json();

      setPrescriptions(data.prescriptions);
    } catch (err) {
      setError("Gagal memuat data resep. Silakan coba lagi.");
      console.error("Error loading prescriptions:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Resep Obat"
          description="Riwayat resep obat dari pemeriksaan Anda"
        />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Resep Obat"
          description="Riwayat resep obat dari pemeriksaan Anda"
        />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resep Obat"
        description="Riwayat resep obat dari pemeriksaan Anda"
      />

      {prescriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Belum ada resep obat</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {prescriptions.map((prescription, index) => (
            <Card key={index} className="overflow-hidden">
              {/* Medical Record Header */}
              <div className="bg-secondary/20 px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">Pemeriksaan Medis</h3>
                      <p className="text-sm text-muted-foreground">
                        {prescription.diagnosis}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(prescription.date)}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{prescription.doctorName}</span>
                </div>
              </div>

              {/* Medicines Content */}
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Pill className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Resep Obat</h4>
                </div>

                <div className="space-y-3">
                  {prescription.medicines?.map((medicine, medIndex) => (
                    <div
                      key={medIndex}
                      className="rounded-lg border p-4 bg-background"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-sm">
                            {medicine.name}
                          </h5>
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Pill className="h-4 w-4" />
                              <span>Dosis: {medicine.dosage}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>Frekuensi: {medicine.frequency}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>Durasi: {medicine.duration}</span>
                            </div>
                          </div>
                        </div>
                        <Badge className="ml-3">
                          <Hash className="h-3 w-3 mr-1" />
                          {medicine.quantity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
