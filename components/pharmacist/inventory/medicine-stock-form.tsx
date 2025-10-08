// app/dashboard/pharmacist/inventory/components/medicine-stock-form.tsx
"use client";

import { useState } from "react";
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
import { Loader2 } from "lucide-react";

const stockFormSchema = z.object({
  quantity: z.coerce
    .number({ invalid_type_error: "Jumlah harus berupa angka" })
    .int("Jumlah harus bilangan bulat")
    .positive("Jumlah harus lebih dari 0"),
  batchNumber: z.string().optional(),
  expiryDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: "Format tanggal kadaluarsa tidak valid",
    })
    .refine((date) => new Date(date) > new Date(), {
      message: "Tanggal kadaluarsa harus setelah hari ini",
    }),
});

type StockFormValues = z.infer<typeof stockFormSchema>;

interface MedicineStockFormProps {
  medicineId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MedicineStockForm({
  medicineId,
  onSuccess,
  onCancel,
}: MedicineStockFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StockFormValues>({
    resolver: zodResolver(stockFormSchema),
    defaultValues: {
      quantity: 1,
      batchNumber: "",
      expiryDate: "",
    },
  });

  const onSubmit = async (values: StockFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/medicines/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          medicineId,
          ...values,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal menambah stok obat");
      }

      toast.success("Stok obat berhasil ditambahkan.");
      form.reset();
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
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jumlah Stok</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Contoh: 100" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="batchNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nomor Batch (Opsional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Contoh: BATCH123"
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
          name="expiryDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tanggal Kadaluarsa</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormDescription>
                Pilih tanggal kadaluarsa batch obat ini.
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
            ) : (
              "Tambah Stok"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
