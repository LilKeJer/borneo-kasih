// types/medical-record-full.ts

export interface PrescriptionItemForm {
  medicineId: string; // ID dari tabel medicines (akan di-parse ke number di backend)
  medicineName?: string; // Untuk tampilan di form, opsional
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  notes?: string;
  stockId?: number; // Akan diisi oleh backend setelah validasi stok
}

export interface ServiceItemForm {
  serviceId: string; // ID dari tabel serviceCatalog (akan di-parse ke number di backend)
  serviceName?: string; // Untuk tampilan di form, opsional
  quantity: number;
  notes?: string;
}

export interface FullMedicalRecordFormValues {
  patientId: string; // ID pasien (akan di-parse ke number di backend)
  reservationId?: number; // ID reservasi, opsional tapi penting untuk link ke pembayaran
  condition: string;
  description: string;
  treatment: string;
  doctorNotes?: string;
  services?: ServiceItemForm[];
  prescriptions?: PrescriptionItemForm[];
}
