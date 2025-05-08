// lib/validations/patient.ts
import { z } from "zod";

export const patientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  nik: z.string().length(16, "NIK must be 16 digits"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
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
});
