// lib/validations/service.ts
import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().min(1, "Nama layanan wajib diisi"),
  description: z.string().optional().or(z.literal("")),
  basePrice: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    { message: "Harga harus berupa angka positif" }
  ),
  category: z.enum(["Konsultasi", "Pemeriksaan", "Tindakan", "Lainnya"], {
    required_error: "Kategori wajib dipilih",
  }),
  isActive: z.boolean().optional().default(true), // Make it optional with default
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;
