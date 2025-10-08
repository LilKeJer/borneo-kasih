// components/doctor/FullMedicalRecordForm.tsx
"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { formatRupiah } from "@/lib/utils"; // Pastikan path ini sesuai dengan struktur proyek Anda

import {
  fullMedicalRecordSchema,
  type FullMedicalRecordFormValues,
} from "@/lib/validations/medical-record"; // Sesuaikan path jika berbeda
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { type Service as ApiServiceType } from "@/types/payment"; // Asumsi tipe ini ada dan sesuai
import { type Medicine as ApiMedicineType } from "@/types/pharmacy"; // Tipe dari langkah 1.1

interface FullMedicalRecordFormProps {
  patientId: string;
  reservationId?: number;
  availableServices: ApiServiceType[];
  availableMedicines: ApiMedicineType[];
  onSuccess?: (medicalRecordId: number, prescriptionId?: number) => void;
  onCancel?: () => void;
}

export function FullMedicalRecordForm({
  patientId,
  reservationId,
  availableServices,
  availableMedicines,
  onSuccess,
  onCancel,
}: FullMedicalRecordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FullMedicalRecordFormValues>({
    resolver: zodResolver(fullMedicalRecordSchema),
    defaultValues: {
      patientId,
      reservationId,
      condition: "",
      description: "",
      treatment: "",
      doctorNotes: "",
      services: [],
      prescriptions: [],
    },
  });

  const {
    fields: serviceFields,
    append: appendService,
    remove: removeService,
  } = useFieldArray({
    control: form.control,
    name: "services",
  });

  const {
    fields: prescriptionFields,
    append: appendPrescription,
    remove: removePrescription,
  } = useFieldArray({
    control: form.control,
    name: "prescriptions",
  });

  async function onSubmit(data: FullMedicalRecordFormValues) {
    setIsSubmitting(true);
    try {
      // Pastikan data yang dikirim sesuai dengan ekspektasi API
      const payload = {
        ...data,
        services:
          data.services?.map((s) => ({ ...s, quantity: Number(s.quantity) })) ||
          [],
        prescriptions:
          data.prescriptions?.map((p) => ({
            ...p,
            quantity: Number(p.quantity),
          })) || [],
      };

      const response = await fetch("/api/medical-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Gagal menyimpan rekam medis lengkap"
        );
      }

      toast.success(
        result.message || "Rekam medis dan resep berhasil disimpan."
      );
      form.reset(); // Reset form setelah sukses
      onSuccess?.(result.medicalRecordId, result.prescriptionId);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan."
      );
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Catatan Pemeriksaan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kondisi/Diagnosis Utama</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Misal: Influenza, Hipertensi"
                      {...field}
                    />
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
                  <FormLabel>Deskripsi Pemeriksaan</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Jelaskan hasil pemeriksaan..."
                      {...field}
                      rows={4}
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
                  <FormLabel>Penanganan/Rencana Perawatan</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tindakan yang diberikan atau direncanakan..."
                      {...field}
                      rows={4}
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
                  <FormLabel>Catatan Dokter (Opsional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Catatan tambahan..."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Layanan Tambahan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {serviceFields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-end gap-2 border p-4 rounded-md relative"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => removeService(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <FormField
                  control={form.control}
                  name={`services.${index}.serviceId`}
                  render={({ field: serviceField }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Layanan</FormLabel>
                      <Select
                        onValueChange={serviceField.onChange}
                        defaultValue={serviceField.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih layanan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableServices.map((service) => (
                            <SelectItem
                              key={service.id}
                              value={service.id.toString()}
                            >
                              {service.name} (
                              {formatRupiah(parseFloat(service.basePrice))})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`services.${index}.quantity`}
                  render={({ field: qtyField }) => (
                    <FormItem>
                      <FormLabel>Qty</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...qtyField}
                          className="w-24"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`services.${index}.notes`}
                  render={({ field: notesField }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Catatan Layanan (Opsional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Catatan untuk layanan ini"
                          {...notesField}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendService({ serviceId: "", quantity: 1, notes: "" })
              }
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Layanan
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resep Obat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prescriptionFields.map((field, index) => (
              <div
                key={field.id}
                className="space-y-3 border p-4 rounded-md relative"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => removePrescription(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`prescriptions.${index}.medicineId`}
                    render={({ field: medField }) => (
                      <FormItem>
                        <FormLabel>Obat</FormLabel>
                        <Select
                          onValueChange={medField.onChange}
                          defaultValue={medField.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih obat" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableMedicines.map((med) => (
                              <SelectItem
                                key={med.id}
                                value={med.id.toString()}
                              >
                                {med.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`prescriptions.${index}.quantity`}
                    render={({ field: qtyField }) => (
                      <FormItem>
                        <FormLabel>Kuantitas</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...qtyField}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`prescriptions.${index}.dosage`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Dosis</FormLabel>
                        <FormControl>
                          <Input placeholder="Misal: 1 tablet" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`prescriptions.${index}.frequency`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Frekuensi</FormLabel>
                        <FormControl>
                          <Input placeholder="Misal: 3x sehari" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`prescriptions.${index}.duration`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Durasi</FormLabel>
                        <FormControl>
                          <Input placeholder="Misal: 5 hari" {...f} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name={`prescriptions.${index}.notes`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Catatan Obat (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Misal: Diminum sesudah makan"
                          {...f}
                          rows={1}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendPrescription({
                  medicineId: "",
                  dosage: "",
                  frequency: "",
                  duration: "",
                  quantity: 1,
                  notes: "",
                })
              }
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Obat ke Resep
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-[180px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
              </>
            ) : (
              "Simpan Rekam Medis & Resep"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
