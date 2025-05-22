// components/admin/service-form.tsx
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
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

// Schema untuk validasi dengan transform untuk memastikan isActive selalu boolean
const serviceSchema = z
  .object({
    name: z.string().min(1, "Nama layanan wajib diisi"),
    description: z.string().optional(),
    basePrice: z.string().refine(
      (val) => {
        // Parse string to number and check if it's positive
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      },
      { message: "Harga harus berupa angka positif" }
    ),
    category: z.string().min(1, "Kategori wajib dipilih"),
    isActive: z.boolean(),
  })
  .transform((data) => ({
    ...data,
    isActive: data.isActive ?? true, // Ensure isActive is always boolean
  }));

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface ServiceFormProps {
  initialData?: {
    id: number;
    name: string;
    description?: string | null;
    basePrice: string;
    category: string;
    isActive: boolean;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
  isEdit?: boolean;
}

export function ServiceForm({
  initialData,
  onSuccess,
  onCancel,
  isEdit = false,
}: ServiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );

  // Inisialisasi form
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      basePrice: initialData?.basePrice || "",
      category: initialData?.category || "",
      isActive: initialData?.isActive ?? true, // Use nullish coalescing for cleaner default
    },
  });

  // Ambil kategori layanan
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/services/categories");
        if (!response.ok) throw new Error("Gagal memuat kategori");
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("Gagal memuat kategori layanan");
      }
    };

    fetchCategories();
  }, []);

  // Handle submit form
  const onSubmit = async (values: ServiceFormValues) => {
    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/services/${initialData?.id}` : "/api/services";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Terjadi kesalahan");
      }

      // Reset form jika berhasil dan bukan mode edit
      if (!isEdit) {
        form.reset({
          name: "",
          description: "",
          basePrice: "",
          category: "",
          isActive: true,
        });
      }

      // Panggil callback sukses
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan layanan"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Nama Layanan */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Layanan</FormLabel>
              <FormControl>
                <Input placeholder="Masukkan nama layanan" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Deskripsi */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deskripsi</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Deskripsi layanan (opsional)"
                  className="resize-none"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Harga Dasar */}
        <FormField
          control={form.control}
          name="basePrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Harga Dasar</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Masukkan harga layanan"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Kategori */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kategori</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Status Aktif */}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Status Aktif</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Layanan ini tersedia untuk dipilih
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Action Buttons */}
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
              "Perbarui"
            ) : (
              "Simpan"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
