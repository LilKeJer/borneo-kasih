// components/patient/appointment-status-card.tsx
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { Clock, Calendar, User, CheckCircle, InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Appointment {
  id: string;
  date: string;
  doctor: string;
  queueNumber: number | null;
  status: string;
  examinationStatus: string | null;
  canCheckInNow?: boolean;
  uiStatusHint?:
    | "NO_SHOW_PENDING_AUTO_CANCEL"
    | "CHECK_IN_WINDOW_CLOSED"
    | "CHECK_IN_NOT_OPENED"
    | null;
  checkInWindowStartsAt?: string;
  checkInWindowEndsAt?: string;
  noShowDeadline?: string;
  isAwaitingAutoCancel?: boolean;
}

export function AppointmentStatusCard() {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAppointmentTime, setIsAppointmentTime] = useState(false);

  const fetchTodayAppointment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/patients/today-appointment");
      if (!response.ok) {
        throw new Error("Failed to fetch appointment");
      }

      const data = await response.json();

      if (data.nextAppointment && data.nextAppointment.status !== "Cancelled") {
        setAppointment({
          id: data.nextAppointment.id || "",
          date: data.nextAppointment.date || "",
          doctor: data.nextAppointment.doctor || "",
          queueNumber: data.nextAppointment.queueNumber || null,
          status: data.nextAppointment.status || "",
          examinationStatus:
            data.nextAppointment.examinationStatus || "Not Started",
          canCheckInNow: data.nextAppointment.canCheckInNow,
          uiStatusHint: data.nextAppointment.uiStatusHint ?? null,
          checkInWindowStartsAt: data.nextAppointment.checkInWindowStartsAt,
          checkInWindowEndsAt: data.nextAppointment.checkInWindowEndsAt,
          noShowDeadline: data.nextAppointment.noShowDeadline,
          isAwaitingAutoCancel: data.nextAppointment.isAwaitingAutoCancel,
        });
      } else {
        setAppointment(null);
      }
    } catch (error) {
      console.error("Error fetching today's appointment:", error);
      toast.error("Gagal memuat data janji temu hari ini");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayAppointment();
  }, [fetchTodayAppointment]);

  // Check if current time is within 1 hour of appointment time
  useEffect(() => {
    if (!appointment?.date) return;

    const checkAppointmentTime = () => {
      const appointmentDate = new Date(appointment.date);
      const now = new Date();

      // Is appointment time within 1 hour (before or after)
      const timeDifferenceMs = Math.abs(
        appointmentDate.getTime() - now.getTime()
      );
      const oneHourInMs = 60 * 60 * 1000;

      setIsAppointmentTime(timeDifferenceMs <= oneHourInMs);
    };

    checkAppointmentTime();

    // Check every minute
    const intervalId = setInterval(checkAppointmentTime, 60000);

    return () => clearInterval(intervalId);
  }, [appointment?.date]);


  const handleCheckIn = async () => {
    if (!appointment) return;

    try {
      const response = await fetch("/api/queue/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationId: appointment.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to check in");
      }

      toast.success("Check-in berhasil");
      fetchTodayAppointment(); // Refresh data
    } catch (error) {
      console.error("Error checking in:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal melakukan check-in"
      );
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

  const formatTime = (dateString: string) => {
    if (!dateString) return "-";

    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return "-";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return "-";
    }
  };

  const blockedCheckInStatuses = new Set([
    "In Progress",
    "Waiting for Payment",
    "Completed",
    "Cancelled",
  ]);

  const showCheckInButton = Boolean(
    appointment &&
      (typeof appointment.canCheckInNow === "boolean"
        ? appointment.canCheckInNow
        : (appointment.status === "Confirmed" ||
            appointment.status === "Pending") &&
          !blockedCheckInStatuses.has(
            appointment.examinationStatus || "Not Started"
          ))
  );

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "-";
    return `${formatDate(dateString)} ${formatTime(dateString)}`;
  };

  const getDisplayStatusBadge = (current: Appointment) => {
    if (current.uiStatusHint === "NO_SHOW_PENDING_AUTO_CANCEL") {
      return <Badge variant="destructive">No-show (Menunggu Batal Otomatis)</Badge>;
    }
    if (current.uiStatusHint === "CHECK_IN_WINDOW_CLOSED") {
      return <Badge variant="destructive">Lewat Batas Check-in</Badge>;
    }
    if (current.uiStatusHint === "CHECK_IN_NOT_OPENED") {
      return <Badge variant="outline">Belum Masuk Waktu Check-in</Badge>;
    }

    return getExaminationStatusBadge(current.examinationStatus);
  };

  const getQueueHintAlert = () => {
    if (!appointment) return null;

    if (appointment.uiStatusHint === "NO_SHOW_PENDING_AUTO_CANCEL") {
      return (
        <Alert variant="destructive">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Waktu janji temu sudah lewat. Sistem menunggu job auto-cancel untuk
            mengubah status menjadi dibatalkan. Deadline:{" "}
            {formatDateTime(appointment.noShowDeadline)}.
          </AlertDescription>
        </Alert>
      );
    }

    if (appointment.uiStatusHint === "CHECK_IN_WINDOW_CLOSED") {
      return (
        <Alert variant="destructive">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Waktu check-in sudah lewat (batas:{" "}
            {formatDateTime(appointment.checkInWindowEndsAt)}).
          </AlertDescription>
        </Alert>
      );
    }

    if (appointment.uiStatusHint === "CHECK_IN_NOT_OPENED") {
      return (
        <Alert variant="default" className="bg-blue-50 border-blue-200">
          <InfoIcon className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-sm text-blue-700">
            Check-in dibuka mulai {formatDateTime(appointment.checkInWindowStartsAt)}.
          </AlertDescription>
        </Alert>
      );
    }

    if (showCheckInButton) {
      return (
        <Alert variant="default" className="bg-blue-50 border-blue-200">
          <InfoIcon className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-sm text-blue-700">
            {isAppointmentTime
              ? "Sudah saatnya check-in! Silakan tekan tombol check-in ketika Anda sudah tiba di klinik."
              : "Ingat untuk melakukan check-in saat Anda tiba di klinik sesuai waktu janji temu."}
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Status Antrian Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-muted-foreground">Memuat data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!appointment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Status Antrian Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-muted-foreground">Tidak ada janji temu hari ini</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/patient/appointments/new">
              Buat Janji Temu
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Status Antrian Hari Ini
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Tanggal & Waktu
            </p>
            <p>
              {formatDate(appointment.date)} <br />{" "}
              {formatTime(appointment.date)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              Dokter
            </p>
            <p>{appointment.doctor}</p>
          </div>
        </div>

        <div className="bg-muted p-3 rounded-md flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">Nomor Antrian</p>
            <p className="text-2xl font-bold">
              {appointment.queueNumber || "-"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            {getDisplayStatusBadge(appointment)}
          </div>
        </div>

        {/* Status Flow Indicator */}
        <div className="pt-2">
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
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  appointment.status === "Pending" ||
                  appointment.status === "Confirmed"
                    ? "bg-primary text-white"
                    : "bg-gray-200"
                } text-xs`}
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
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  appointment.examinationStatus === "Waiting"
                    ? "bg-primary text-white"
                    : "bg-gray-200"
                } text-xs`}
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
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  appointment.examinationStatus === "In Progress"
                    ? "bg-primary text-white"
                    : "bg-gray-200"
                } text-xs`}
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
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  appointment.examinationStatus === "Completed" ||
                  appointment.examinationStatus === "Waiting for Payment"
                    ? "bg-primary text-white"
                    : "bg-gray-200"
                } text-xs`}
              >
                4
              </div>
              <span className="text-xs mt-1">Selesai</span>
            </div>
          </div>
        </div>

        {getQueueHintAlert()}

        <div className="flex items-center justify-between mt-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/patient/appointments/${appointment.id}`}>
              Lihat Detail
            </Link>
          </Button>

          {showCheckInButton && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={handleCheckIn}
                    className={isAppointmentTime ? "animate-pulse" : ""}
                  >
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Check-in
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tekan tombol ini saat Anda sudah tiba di klinik</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
