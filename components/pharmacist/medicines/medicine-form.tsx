// app/dashboard/pharmacist/medicines/components/medicine-form.tsx
"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

// Schema with optional for fields defaulted by RHF
const medicineFormSchema = z.object({
  name: z.string().min(1, "Nama obat wajib diisi"),
  description: z.string().optional(),
  price: z.coerce
    .number({ invalid_type_error: "Harga harus berupa angka" })
    .positive("Harga harus positif")
    .min(0.01, "Harga minimal 0.01"),
  minimumStock: z.coerce
    .number({ invalid_type_error: "Stok minimum harus berupa angka" })
    .int("Stok minimum harus bilangan bulat")
    .nonnegative("Stok minimum tidak boleh negatif")
    .optional(), // Changed from .default(0)
  reorderThresholdPercentage: z.coerce
    .number({
      invalid_type_error: "Persentase threshold harus berupa angka",
    })
    .int("Persentase threshold harus bilangan bulat")
    .min(0, "Persentase minimal 0")
    .max(100, "Persentase maksimal 100")
    .optional(), // Changed from .default(20)
});

type MedicineFormValues = z.infer<typeof medicineFormSchema>;
// Now MedicineFormValues will have:
// minimumStock?: number | undefined;
// reorderThresholdPercentage?: number | undefined;

interface MedicineFormProps {
  initialData?: Partial<MedicineFormValues> & { id?: number }; // Allow partial initial data for flexibility
  onSuccess?: () => void;
  onCancel?: () => void;
  isEdit?: boolean;
}

export function MedicineForm({
  initialData,
  onSuccess,
  onCancel,
  isEdit = false,
}: MedicineFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      price: initialData?.price || 0,
      minimumStock: initialData?.minimumStock ?? 5, // Default here
      reorderThresholdPercentage: initialData?.reorderThresholdPercentage ?? 20, // Default here
    },
  });

  useEffect(() => {
    if (isEdit && initialData) {
      form.reset({
        name: initialData.name || "",
        description: initialData.description || "",
        price: initialData.price || 0,
        minimumStock: initialData.minimumStock ?? 5,
        reorderThresholdPercentage:
          initialData.reorderThresholdPercentage ?? 20,
      });
    } else if (!isEdit) {
      // For new form, ensure it resets to initial default values if needed
      form.reset({
        name: "",
        description: "",
        price: 0,
        minimumStock: 5,
        reorderThresholdPercentage: 20,
      });
    }
  }, [initialData, form, isEdit]);

  const onSubmit = async (values: MedicineFormValues) => {
    setIsSubmitting(true);
    try {
      const url = isEdit
        ? `/api/medicines/${initialData?.id}`
        : "/api/medicines";
      const method = isEdit ? "PUT" : "POST";

      // Ensure potentially undefined optional fields have defaults before sending
      const payload = {
        ...values,
        minimumStock: values.minimumStock ?? 5, // Ensure it's a number
        reorderThresholdPercentage: values.reorderThresholdPercentage ?? 20, // Ensure it's a number
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal menyimpan data obat");
      }

      toast.success(
        isEdit ? "Obat berhasil diperbarui" : "Obat berhasil ditambahkan"
      );

      if (!isEdit) {
        // Reset to clean slate for new form after successful submission
        form.reset({
          name: "",
          description: "",
          price: 0,
          minimumStock: 5,
          reorderThresholdPercentage: 20,
        });
      }
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Obat</FormLabel>
              <FormControl>
                <Input placeholder="Masukkan nama obat" {...field} />
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
              <FormLabel>Deskripsi (Opsional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Deskripsi singkat obat"
                  className="resize-none"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Harga Jual</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Contoh: 15000"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="minimumStock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stok Minimum</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Contoh: 10" {...field} />
              </FormControl>
              <FormDescription>
                Batas stok paling sedikit sebelum dianggap perlu restock.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reorderThresholdPercentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Persentase Threshold Pemesanan Ulang (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Contoh: 20"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Peringatan akan muncul jika stok mencapai (Stok Minimum +
                Persentase ini dari Stok Minimum).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : isEdit ? (
              "Perbarui Obat"
            ) : (
              "Tambah Obat"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
