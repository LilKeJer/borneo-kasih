// app/dashboard/patient/appointments/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  ClipboardListIcon,
  ArrowLeftIcon,
  Loader2,
} from "lucide-react";

interface AppointmentDetail {
  id: string;
  date: string;
  doctorId: string;
  doctor: string;
  queueNumber: number | null;
  status: string;
  examinationStatus: string | null;
  complaint: string | null;
}

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id;

  const [appointment, setAppointment] = useState<AppointmentDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointmentDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/appointments/${appointmentId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch appointment details");
      }

      const data = await response.json();
      setAppointment(data);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      setError("Gagal memuat detail janji temu");
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    fetchAppointmentDetail();
  }, [fetchAppointmentDetail]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <Badge variant="outline">Menunggu Konfirmasi</Badge>;
      case "Confirmed":
        return <Badge variant="secondary">Terkonfirmasi</Badge>;
      case "Completed":
        return <Badge variant="default">Selesai</Badge>;
      case "Cancelled":
        return <Badge variant="destructive">Dibatalkan</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getExaminationStatusBadge = (status: string | null) => {
    switch (status) {
      case "Not Started":
        return <Badge variant="outline">Belum Check-in</Badge>;
      case "Waiting":
        return <Badge variant="secondary">Menunggu Pemeriksaan</Badge>;
      case "Waiting for Payment":
        return <Badge variant="secondary">Menunggu Pembayaran</Badge>;
      case "In Progress":
        return <Badge variant="default">Sedang Diperiksa</Badge>;
      case "Completed":
        return <Badge variant="default">Selesai Diperiksa</Badge>;
      case "Cancelled":
        return <Badge variant="destructive">Dibatalkan</Badge>;
      default:
        return <Badge variant="outline">Belum Check-in</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  // Fungsi untuk melakukan check-in
  const handleCheckIn = async () => {
    try {
      const response = await fetch("/api/queue/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationId: appointmentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal melakukan check-in");
      }

      toast.success("Check-in berhasil");
      fetchAppointmentDetail(); // Refresh data
    } catch (error) {
      console.error("Error checking in:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal melakukan check-in"
      );
    }
  };

  const getStatusMessage = (status: string | null) => {
    switch (status) {
      case "Not Started":
        return "Silakan lakukan check-in saat Anda tiba di klinik.";
      case "Waiting":
        return "Silakan tunggu giliran Anda untuk diperiksa oleh dokter.";
      case "In Progress":
        return "Dokter sedang memeriksa Anda.";
      case "Completed":
        return "Pemeriksaan telah selesai. Silakan menuju kasir untuk pembayaran.";
      case "Waiting for Payment":
        return "Pemeriksaan selesai. Silakan lakukan pembayaran di resepsionis.";
      case "Cancelled":
        return "Janji temu ini telah dibatalkan.";
      default:
        return "Silakan lakukan check-in saat Anda tiba di klinik.";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Detail Janji Temu"
          description="Informasi janji temu dengan dokter"
        />

        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">
              {error || "Janji temu tidak ditemukan"}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/dashboard/patient/appointments")}
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { date, time } = formatDateTime(appointment.date);
  const blockedCheckInStatuses = new Set([
    "In Progress",
    "Waiting for Payment",
    "Completed",
    "Cancelled",
  ]);

  const showCheckInButton =
    (appointment.status === "Confirmed" || appointment.status === "Pending") &&
    !blockedCheckInStatuses.has(appointment.examinationStatus || "Not Started");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detail Janji Temu"
        description="Informasi janji temu dengan dokter"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Janji Temu #{appointmentId}</span>
            {getStatusBadge(appointment.status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium">Tanggal & Waktu</h3>
                  <p>{date}</p>
                  <p>{time}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <UserIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium">Dokter</h3>
                  <p>{appointment.doctor}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ClipboardListIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium">Keluhan</h3>
                  <p className="text-sm text-muted-foreground">
                    {appointment.complaint || "Tidak ada keluhan"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <ClockIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium">Nomor Antrian</h3>
                  <p className="text-xl font-bold">
                    {appointment.queueNumber || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ClipboardListIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-medium">Status Pemeriksaan</h3>
                  <div className="mt-1">
                    {getExaminationStatusBadge(appointment.examinationStatus)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Message */}
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm">
              {getStatusMessage(appointment.examinationStatus)}
            </p>
          </div>

          {/* Status Flow Indicator */}
          <div className="mt-6 pt-4 border-t">
            <h3 className="font-medium mb-4">Alur Status</h3>
            <div className="relative flex justify-between">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 z-0"></div>

              <div
                className={`relative z-10 flex flex-col items-center ${
                  appointment.status === "Pending" ||
                  appointment.status === "Confirmed"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    appointment.status === "Pending" ||
                    appointment.status === "Confirmed"
                      ? "bg-primary text-white"
                      : "bg-gray-200"
                  }`}
                >
                  1
                </div>
                <span className="text-xs mt-1">Terdaftar</span>
              </div>

              <div
                className={`relative z-10 flex flex-col items-center ${
                  appointment.examinationStatus === "Waiting"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    appointment.examinationStatus === "Waiting"
                      ? "bg-primary text-white"
                      : "bg-gray-200"
                  }`}
                >
                  2
                </div>
                <span className="text-xs mt-1">Menunggu</span>
              </div>

              <div
                className={`relative z-10 flex flex-col items-center ${
                  appointment.examinationStatus === "In Progress"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    appointment.examinationStatus === "In Progress"
                      ? "bg-primary text-white"
                      : "bg-gray-200"
                  }`}
                >
                  3
                </div>
                <span className="text-xs mt-1">Diperiksa</span>
              </div>

              <div
                className={`relative z-10 flex flex-col items-center ${
                  appointment.examinationStatus === "Completed" ||
                  appointment.examinationStatus === "Waiting for Payment"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    appointment.examinationStatus === "Completed" ||
                    appointment.examinationStatus === "Waiting for Payment"
                      ? "bg-primary text-white"
                      : "bg-gray-200"
                  }`}
                >
                  4
                </div>
                <span className="text-xs mt-1">Selesai</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/patient/appointments")}
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Kembali
            </Button>

            {/* Check-in Button */}
            {showCheckInButton && (
              <Button onClick={handleCheckIn}>Check-in Sekarang</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
