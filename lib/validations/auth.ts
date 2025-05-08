// lib/validations/auth.ts
import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerPatientSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(100, "Password must be less than 100 characters"),
    confirmPassword: z.string(),
    name: z.string().min(1, "Name is required"),
    nik: z.string().length(16, "NIK must be 16 digits"),
    email: z
      .string()
      .email("Invalid email format")
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .min(10, "Phone number must be at least 10 digits")
      .optional()
      .or(z.literal("")),
    dateOfBirth: z.string().refine((value) => !isNaN(Date.parse(value)), {
      message: "Invalid date format",
    }),
    address: z.string().min(1, "Address is required"),
    gender: z.enum(["L", "P"], {
      required_error: "Gender is required",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
