// app/dashboard/patient/appointments/new/page.tsx
"use client";
import React from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
}

interface TimeSlot {
  scheduleId: number;
  sessionId: number;
  sessionName: string;
  time: string;
  available: boolean;
}

export default function NewAppointmentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [complaint, setComplaint] = useState<string>("");

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoadingDoctors(true);
      const response = await fetch("/api/appointments/doctors");

      if (!response.ok) {
        throw new Error("Gagal memuat daftar dokter");
      }

      const data = await response.json();
      setDoctors(data);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      toast.error("Gagal memuat daftar dokter");
    } finally {
      setLoadingDoctors(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const fetchTimeSlots = useCallback(async () => {
    if (!selectedDoctor || !selectedDate) return;

    try {
      setLoadingSlots(true);
      const response = await fetch(
        `/api/appointments/slots?doctorId=${selectedDoctor}&date=${selectedDate}`
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
  }, [selectedDoctor, selectedDate]);

  useEffect(() => {
    if (step === 3 && selectedDoctor && selectedDate) {
      fetchTimeSlots();
    }
  }, [step, selectedDoctor, selectedDate, fetchTimeSlots]);

  const handleNextStep = () => {
    if (step === 1 && !selectedDoctor) {
      toast.error("Silakan pilih dokter terlebih dahulu");
      return;
    }

    if (step === 2 && !selectedDate) {
      toast.error("Silakan pilih tanggal terlebih dahulu");
      return;
    }

    if (step === 3 && !selectedSlot) {
      toast.error("Silakan pilih waktu terlebih dahulu");
      return;
    }

    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      toast.error("Mohon lengkapi semua data");
      return;
    }

    try {
      setIsSubmitting(true);

      const [year, month, day] = selectedDate
        .split("-")
        .map((value) => Number(value));
      const appointmentDate = new Date(year, month - 1, day);
      const timeComponents = new Date(selectedSlot.time);

      // Mengambil jam dan menit dari time slot
      appointmentDate.setHours(
        timeComponents.getHours(),
        timeComponents.getMinutes(),
        0,
        0
      );

      const response = await fetch("/api/appointments/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorId: parseInt(selectedDoctor),
          scheduleId: selectedSlot.scheduleId,
          appointmentDate: appointmentDate.toISOString(),
          complaint,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal membuat janji temu");
      }

      const result = await response.json();

      toast.success(
        `Janji temu berhasil dibuat dengan nomor antrian ${result.queueNumber}`
      );

      // Redirect ke halaman appointment
      router.push("/dashboard/patient/appointments");
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal membuat janji temu"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format tanggal untuk input date (YYYY-MM-DD)
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat Janji Temu Baru"
        description={`Langkah ${step} dari 4`}
      />

      <Card>
        <CardContent className="py-6">
          {/* Step 1: Pilih Dokter */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Pilih Dokter</h2>
              <div className="space-y-2">
                <Label htmlFor="doctor">Dokter</Label>
                {loadingDoctors ? (
                  <p>Memuat daftar dokter...</p>
                ) : (
                  <Select
                    value={selectedDoctor}
                    onValueChange={setSelectedDoctor}
                  >
                    <SelectTrigger id="doctor">
                      <SelectValue placeholder="Pilih dokter" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name} - {doctor.specialization || "Umum"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Pilih Tanggal */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Pilih Tanggal</h2>
              <div className="space-y-2">
                <Label htmlFor="date">Tanggal</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={minDate}
                  max={maxDateStr}
                />
                <p className="text-sm text-muted-foreground">
                  Pilih tanggal dalam 30 hari ke depan
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Pilih Waktu */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Pilih Waktu</h2>
              {loadingSlots ? (
                <p>Memuat jadwal tersedia...</p>
              ) : timeSlots.length === 0 ? (
                <p>Tidak ada jadwal tersedia untuk tanggal ini</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {timeSlots.map((slot, index) => (
                    <Button
                      key={index}
                      variant={
                        selectedSlot?.time === slot.time ? "default" : "outline"
                      }
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {formatTimeDisplay(slot.time)} ({slot.sessionName})
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Masukkan Keluhan */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Masukkan Keluhan</h2>
              <div className="space-y-2">
                <Label htmlFor="complaint">Keluhan</Label>
                <Textarea
                  id="complaint"
                  placeholder="Deskripsikan keluhan Anda"
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  rows={5}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={step === 1 || isSubmitting}
            >
              Kembali
            </Button>
            <Button onClick={handleNextStep} disabled={isSubmitting}>
              {step < 4
                ? "Selanjutnya"
                : isSubmitting
                ? "Menyimpan..."
                : "Buat Janji Temu"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
