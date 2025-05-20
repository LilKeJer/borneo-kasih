// components/receptionist/walk-in-registration-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

// Schema validasi untuk form
const walkInSchema = z.object({
  patientId: z.string().min(1, "Pasien wajib dipilih"),
  doctorId: z.string().min(1, "Dokter wajib dipilih"),
  scheduleId: z.string().min(1, "Jadwal wajib dipilih"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof walkInSchema>;

interface Patient {
  id: string;
  name: string;
}

interface Doctor {
  id: string;
  name: string;
  scheduleId: number;
  sessionName: string;
  currentPatients: number;
  maxPatients: number;
  remainingCapacity: number;
  available: boolean;
}

interface WalkInRegistrationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function WalkInRegistrationForm({
  onSuccess,
  onCancel,
}: WalkInRegistrationFormProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(walkInSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      scheduleId: "",
      notes: "",
    },
  });

  useEffect(() => {
    fetchAvailableDoctors();
    fetchAllPatients();
  }, []);

  // Filter pasien berdasarkan search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredPatients(patients);
    } else {
      const filtered = patients.filter((patient) =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPatients(filtered);
    }
  }, [searchTerm, patients]);

  const fetchAllPatients = async () => {
    try {
      setLoadingPatients(true);
      const response = await fetch("/api/patients?limit=100");

      if (!response.ok) {
        throw new Error("Failed to fetch patients");
      }

      const data = await response.json();
      const apiPatients = data.data as Array<{
        id: number;
        name: string;
      }>;
      const convertedPatients: Patient[] = apiPatients.map((p) => ({
        id: String(p.id), // Konversi ID number ke string
        name: p.name,
      }));

      setPatients(convertedPatients);
      setFilteredPatients(convertedPatients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast.error("Gagal memuat daftar pasien");
    } finally {
      setLoadingPatients(false);
    }
  };

  const fetchAvailableDoctors = async () => {
    try {
      setLoadingDoctors(true);
      const response = await fetch("/api/doctors/available-now");

      if (!response.ok) {
        throw new Error("Failed to fetch available doctors");
      }

      const data = await response.json();
      setAvailableDoctors(data);
    } catch (error) {
      console.error("Error fetching available doctors:", error);
      toast.error("Gagal memuat daftar dokter yang tersedia");
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleDoctorChange = (doctorId: string) => {
    form.setValue("doctorId", doctorId);

    // Cari dokter yang dipilih
    const selectedDoctor = availableDoctors.find((d) => d.id === doctorId);

    // Set scheduleId dari dokter yang dipilih
    if (selectedDoctor) {
      form.setValue("scheduleId", selectedDoctor.scheduleId.toString());
    } else {
      form.setValue("scheduleId", "");
    }
  };

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    try {
      const response = await fetch("/api/queue/walk-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to register walk-in patient");
      }

      const result = await response.json();
      toast.success(
        `Pendaftaran walk-in berhasil dengan nomor antrian ${result.queueNumber}`
      );

      form.reset();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Gagal mendaftarkan pasien walk-in"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <FormLabel>Cari Pasien</FormLabel>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-primary text-sm"
              >
                + Daftar Pasien Baru
              </Button>
            </div>
            <div className="mt-2">
              <Input
                placeholder="Cari pasien berdasarkan nama"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-2"
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name="patientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pilih Pasien</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={loadingPatients}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pasien" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {loadingPatients ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Memuat pasien...</span>
                      </div>
                    ) : filteredPatients.length === 0 ? (
                      <div className="p-2 text-center text-muted-foreground">
                        Tidak ada pasien ditemukan
                      </div>
                    ) : (
                      filteredPatients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="doctorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pilih Dokter</FormLabel>
                <Select
                  onValueChange={handleDoctorChange}
                  defaultValue={field.value}
                  disabled={loadingDoctors}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih dokter" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {loadingDoctors ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Memuat dokter...</span>
                      </div>
                    ) : availableDoctors.length === 0 ? (
                      <div className="p-2 text-center text-muted-foreground">
                        Tidak ada dokter yang tersedia saat ini
                      </div>
                    ) : (
                      availableDoctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name} ({doctor.sessionName}) - Tersisa{" "}
                          {doctor.remainingCapacity} slot
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Catatan (Opsional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Catatan tambahan"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={submitting || !availableDoctors.length}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Daftarkan Pasien"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
