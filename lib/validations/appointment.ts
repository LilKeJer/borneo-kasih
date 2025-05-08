// lib/validations/appointment.ts
import { z } from "zod";

export const appointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  scheduleId: z.string().min(1, "Schedule is required"),
  reservationDate: z.string().refine((value) => !isNaN(Date.parse(value)), {
    message: "Invalid date format",
  }),
  notes: z.string().optional(),
});
