// lib/validations/medical-record.ts
import { z } from "zod";

export const nurseNotesSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  nurseNotes: z.string().min(1, "Nurse notes are required"),
  weight: z.string().optional(),
  height: z.string().optional(),
  bloodPressure: z.string().optional(),
  temperature: z.string().optional(),
  pulse: z.string().optional(),
  respirationRate: z.string().optional(),
});

export const doctorNotesSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  condition: z.string().min(1, "Condition is required"),
  description: z.string().min(1, "Description is required"),
  treatment: z.string().min(1, "Treatment is required"),
  doctorNotes: z.string().optional(),
});
