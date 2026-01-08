// app/dashboard/patient/appointments/[id]/reschedule/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Clock, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

interface TimeSlot {
  scheduleId: number;
  sessionId: number;
  sessionName: string;
  time: string;
  available: boolean;
}

interface Appointment {
  id: string;
  doctor: string;
  doctorId: string;
  date: string;
  queueNumber: number;
  status: string;
}

export default function RescheduleAppointmentPage() {
  const router = useRouter();
  const params = useParams();
  const appointmentId = params.id;

  const [isLoading, setIsLoading] = useState(true);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointment = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/appointments/${appointmentId}`);

      if (!response.ok) {
        throw new Error("Gagal memuat data janji temu");
      }

      const data = await response.json();
      setAppointment(data);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      setError("Gagal memuat data janji temu, silakan coba lagi nanti");
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  const fetchTimeSlots = useCallback(async () => {
    if (!appointment || !selectedDate) return;

    try {
      setLoadingSlots(true);
      const response = await fetch(
        `/api/appointments/slots?doctorId=${appointment.doctorId}&date=${selectedDate}`
      );

      if (!response.ok) {
        throw new Error("Gagal memuat jadwal tersedia");
      }

      const data = await response.json();
      setTimeSlots(data.slots);
    } catch (error) {
      console.error("Error fetching time slots:", error);
      toast.error("Gagal memuat jadwal tersedia");
    } finally {
      setLoadingSlots(false);
    }
  }, [appointment, selectedDate]);

  useEffect(() => {
    if (selectedDate && appointment?.doctorId) {
      fetchTimeSlots();
    }
  }, [selectedDate, appointment?.doctorId, fetchTimeSlots]);

  const handleReschedule = async () => {
    if (!appointment || !selectedDate || !selectedSlot) {
      toast.error("Silakan pilih tanggal dan waktu yang baru");
      return;
    }

    try {
      setIsSubmitting(true);

      const appointmentDate = new Date(selectedDate);
      const timeComponents = new Date(selectedSlot.time);

      // Mengambil jam dan menit dari time slot
      appointmentDate.setHours(
        timeComponents.getHours(),
        timeComponents.getMinutes(),
        0,
        0
      );

      const response = await fetch(
        `/api/appointments/${appointmentId}/reschedule`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            scheduleId: selectedSlot.scheduleId,
            appointmentDate: appointmentDate.toISOString(),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal mengubah jadwal");
      }

      const result = await response.json();

      toast.success(
        `Jadwal janji temu berhasil diubah dengan nomor antrian ${result.newQueueNumber}`
      );

      // Redirect ke halaman appointment
      router.push("/dashboard/patient/appointments");
    } catch (error) {
      console.error("Error rescheduling appointment:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal mengubah jadwal"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format tanggal untuk input date (YYYY-MM-DD)
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  // Mendapatkan tanggal hari ini dan tanggal maksimal (30 hari ke depan)
  const today = new Date();
  const minDate = formatDateForInput(today);

  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 30);
  const maxDateStr = formatDateForInput(maxDate);

  // Format waktu untuk ditampilkan (HH:MM)
  const formatTimeDisplay = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format tanggal appointment saat ini
  const formatAppointmentDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatAppointmentTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Ubah Jadwal Janji Temu"
          description="Pilih jadwal baru untuk janji temu Anda"
        />

        <Alert variant="destructive" className="max-w-lg mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "Janji temu tidak ditemukan"}
          </AlertDescription>
        </Alert>

        <div className="flex justify-center">
          <Button asChild>
            <Link href="/dashboard/patient/appointments">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Daftar Janji Temu
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ubah Jadwal Janji Temu"
        description="Pilih jadwal baru untuk janji temu Anda"
      />

      <Card>
        <CardContent className="py-6">
          <div className="space-y-6">
            {/* Current Appointment Info */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Jadwal Saat Ini</h3>
              <div className="bg-muted p-4 rounded-md grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">Dokter:</div>
                <div>{appointment.doctor}</div>
                <div className="font-medium">Tanggal:</div>
                <div>{formatAppointmentDate(appointment.date)}</div>
                <div className="font-medium">Waktu:</div>
                <div>{formatAppointmentTime(appointment.date)}</div>
                <div className="font-medium">Nomor Antrian:</div>
                <div>{appointment.queueNumber}</div>
              </div>
            </div>

            <Separator />

            {/* New Schedule Selection */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Jadwal Baru</h3>

              {/* Date Selection */}
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Pilih Tanggal Baru
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={minDate}
                  max={maxDateStr}
                  disabled={isSubmitting}
                />
                <p className="text-sm text-muted-foreground">
                  Pilih tanggal dalam 30 hari ke depan
                </p>
              </div>

              {/* Time Slot Selection */}
              {selectedDate && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pilih Waktu Baru
                  </Label>

                  {loadingSlots ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memuat jadwal tersedia...
                    </div>
                  ) : timeSlots.length === 0 ? (
                    <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Tidak ada jadwal tersedia untuk tanggal ini. Silakan
                        pilih tanggal lain.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {timeSlots.map((slot, index) => (
                        <Button
                          key={index}
                          variant={
                            selectedSlot?.time === slot.time
                              ? "default"
                              : "outline"
                          }
                          onClick={() => setSelectedSlot(slot)}
                          disabled={isSubmitting}
                        >
                          {formatTimeDisplay(slot.time)} ({slot.sessionName})
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/patient/appointments")}
                disabled={isSubmitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali
              </Button>
              <Button
                onClick={handleReschedule}
                disabled={isSubmitting || !selectedDate || !selectedSlot}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Ubah Jadwal"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
