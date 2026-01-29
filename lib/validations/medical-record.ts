// lib/validations/medical-record-full.ts
import { z } from "zod";

export const prescriptionItemSchema = z.object({
  medicineId: z.string().min(1, "Obat harus dipilih"),
  medicineName: z.string().optional(),
  dosage: z.string().min(1, "Dosis wajib diisi"),
  frequency: z.string().min(1, "Frekuensi wajib diisi"),
  duration: z.string().min(1, "Durasi wajib diisi"),
  encryptionIv: z.string().optional(),
  quantity: z.coerce
    .number({ invalid_type_error: "Kuantitas harus angka" })
    .int("Kuantitas harus bilangan bulat")
    .min(1, "Kuantitas minimal 1"),
  notes: z.string().optional(),
  stockId: z.number().optional(), // Opsional di form, diisi backend
});

export const serviceItemSchema = z.object({
  serviceId: z.string().min(1, "Layanan harus dipilih"),
  serviceName: z.string().optional(),
  quantity: z.coerce
    .number({ invalid_type_error: "Kuantitas harus angka" })
    .int("Kuantitas harus bilangan bulat")
    .min(1, "Kuantitas minimal 1"),
  notes: z.string().optional(),
});

export const fullMedicalRecordSchema = z.object({
  patientId: z.string().min(1, "Pasien wajib diisi"),
  reservationId: z.number().optional(),
  condition: z.string().min(1, "Kondisi/Diagnosis utama wajib diisi"),
  description: z.string().min(1, "Deskripsi pemeriksaan wajib diisi"),
  treatment: z.string().min(1, "Penanganan/Perawatan wajib diisi"),
  doctorNotes: z.string().optional().or(z.literal("")), // Memperbolehkan string kosong
  encryptionIvDoctor: z.string().optional(),
  services: z.array(serviceItemSchema).optional(),
  prescriptions: z.array(prescriptionItemSchema).optional(),
});

// Tipe ini akan digunakan di komponen form
export type FullMedicalRecordFormValues = z.infer<
  typeof fullMedicalRecordSchema
>;
export type PrescriptionItemFormValues = z.infer<typeof prescriptionItemSchema>;
export type ServiceItemFormValues = z.infer<typeof serviceItemSchema>;
