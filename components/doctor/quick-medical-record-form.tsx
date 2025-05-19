// components/doctor/quick-medical-record-form.tsx
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { doctorNotesSchema } from "@/lib/validations/medical-record";

type FormValues = z.infer<typeof doctorNotesSchema>;

interface QuickMedicalRecordFormProps {
  patientId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function QuickMedicalRecordForm({
  patientId,
  onSuccess,
  onCancel,
}: QuickMedicalRecordFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(doctorNotesSchema),
    defaultValues: {
      patientId,
      condition: "",
      description: "",
      treatment: "",
      doctorNotes: "",
    },
  });

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    try {
      const response = await fetch("/api/medical-records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create medical record");
      }

      const result = await response.json();

      // Pesan yang lebih informatif tergantung apakah reservasi berhasil diperbarui
      if (result.reservationUpdated) {
        toast.success("Rekam medis berhasil dibuat dan pemeriksaan selesai");
      } else {
        toast.success("Rekam medis berhasil dibuat");
      }

      form.reset();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal membuat catatan medis"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="condition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kondisi/Diagnosis</FormLabel>
              <FormControl>
                <Input placeholder="Kondisi/Diagnosis pasien" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deskripsi</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Jelaskan kondisi pasien secara lengkap"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="treatment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Penanganan/Perawatan</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Penanganan yang diberikan"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="doctorNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catatan Tambahan (Opsional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Catatan tambahan" rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Menyimpan..." : "Simpan Rekam Medis"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
