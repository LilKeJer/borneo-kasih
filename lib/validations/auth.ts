// lib/validations/auth.ts
import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerPatientSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username minimal 3 karakter")
      .max(50, "Username maksimal 50 karakter")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username hanya boleh huruf, angka, dan underscore"
      ),
    password: z
      .string()
      .min(6, "Password minimal 6 karakter")
      .max(100, "Password maksimal 100 karakter"),
    confirmPassword: z.string(),
    name: z
      .string()
      .min(1, "Nama wajib diisi")
      .max(100, "Nama maksimal 100 karakter"),
    nik: z
      .string()
      .length(16, "NIK harus 16 digit")
      .regex(/^\d{16}$/, "NIK harus berupa angka"),
    email: z
      .string()
      .email("Format email tidak valid")
      .max(100, "Email maksimal 100 karakter"),
    phone: z
      .string()
      .min(10, "Nomor telepon minimal 10 digit")
      .max(20, "Nomor telepon maksimal 20 digit")
      .regex(/^[0-9+\-\s()]+$/, "Format nomor telepon tidak valid"),
    dateOfBirth: z.string().refine((value) => !isNaN(Date.parse(value)), {
      message: "Format tanggal tidak valid",
    }),
    address: z
      .string()
      .min(1, "Alamat wajib diisi")
      .max(255, "Alamat maksimal 255 karakter"),
    gender: z.enum(["L", "P"], {
      required_error: "Jenis kelamin wajib dipilih",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password tidak sama",
    path: ["confirmPassword"],
  });
