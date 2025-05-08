// lib/validations/prescription.ts
import { z } from "zod";

export const prescriptionSchema = z.object({
  medicalHistoryId: z.string().min(1, "Medical record is required"),
  medicines: z
    .array(
      z.object({
        medicineId: z.string().min(1, "Medicine is required"),
        dosage: z.string().min(1, "Dosage is required"),
        frequency: z.string().min(1, "Frequency is required"),
        duration: z.string().min(1, "Duration is required"),
        quantity: z.number().min(1, "Quantity is required"),
      })
    )
    .min(1, "At least one medicine is required"),
});
