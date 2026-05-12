// lib/validations/staff.ts
import { z } from "zod";

export const staffSchema = z
  .object({
    password: z
      .string()
      .min(6, "Password minimal 6 karakter")
      .optional()
      .or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
    name: z
      .string()
      .min(1, "Nama wajib diisi")
      .max(100, "Nama maksimal 100 karakter"),
    email: z
      .string()
      .email("Email tidak valid")
      .max(100, "Email maksimal 100 karakter"),
    phone: z
      .string()
      .regex(/^[0-9+\-\s()]+$/, "Format nomor telepon tidak valid")
      .optional()
      .or(z.literal("")),
    role: z.enum(["Doctor", "Nurse", "Receptionist", "Pharmacist"], {
      errorMap: () => ({ message: "Role tidak valid" }),
    }),
    specialization: z.string().optional(),
  })
  .refine(
    (data) => {
      // Jika password diisi, confirmPassword harus sama
      if (data.password && data.password !== data.confirmPassword) {
        return false;
      }
      return true;
    },
    {
      message: "Password tidak sama",
      path: ["confirmPassword"],
    }
  );

export type StaffFormValues = z.infer<typeof staffSchema>;
