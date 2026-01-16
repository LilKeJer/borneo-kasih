// types/payment.ts
export type PaymentMethod = "Cash" | "Debit" | "Credit" | "Transfer" | "BPJS";
export type PaymentStatus = "Paid" | "Pending" | "Cancelled";
export type ItemType = "Service" | "Prescription" | "Other";
export type ServiceCategory =
  | "Konsultasi"
  | "Pemeriksaan"
  | "Tindakan"
  | "Lainnya";

export interface Payment {
  id: number;
  totalAmount: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paymentDate: string;
  reservationId: number;
  patientName: string;
  notes?: string;
}

export interface PaymentDetail {
  id: number;
  paymentId: number;
  itemType: ItemType;
  serviceId?: number;
  prescriptionId?: number;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  notes?: string;
}

export interface Service {
  id: number;
  name: string;
  description: string | null;
  basePrice: string;
  category: ServiceCategory;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RecommendedService {
  serviceId: number;
  serviceName: string;
  basePrice: string;
  quantity: number;
  notes?: string | null;
}

export interface PrescriptionData {
  prescriptionId: number;
  medicineId: number;
  medicineName: string;
  medicinePrice: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  quantityUsed: number;
}

export interface PaymentItem {
  id: string;
  itemType: ItemType;
  serviceId?: number;
  serviceName?: string;
  prescriptionId?: number;
  medicineName?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string;
}

export interface ReservationData {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  reservationDate: string;
  queueNumber: number;
  status: string;
  examinationStatus: string;
}

export interface ExistingPayment {
  id: number;
  totalAmount: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paymentDate: string;
  prescriptionId?: number;
  notes?: string;
}

export interface PaymentFormData {
  reservation: ReservationData;
  existingPayment: ExistingPayment | null;
  prescriptions: PrescriptionData[];
  availableServices: Service[];
  recommendedServices?: RecommendedService[];
  hasPayment: boolean;
}

export interface CreatePaymentRequest {
  reservationId: number;
  paymentMethod: PaymentMethod;
  items: {
    itemType: ItemType;
    serviceId?: number;
    prescriptionId?: number;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    notes?: string;
  }[];
  prescriptionId?: number;
  notes?: string;
}

export interface CreatePaymentResponse {
  message: string;
  paymentId: number;
  totalAmount: number;
}

export interface CompletedReservation {
  id: number;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  reservationDate: string;
  queueNumber: number;
  status: "Completed";
  examinationStatus: "Completed";
  hasPayment: boolean;
  createdAt: string;
}
