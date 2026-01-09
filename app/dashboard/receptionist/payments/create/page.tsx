// app/dashboard/receptionist/payments/create/page.tsx
"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { PaymentForm } from "@/components/receptionist/payment-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { type PaymentFormData } from "@/types/payment";

// Component untuk konten yang menggunakan useSearchParams
function CreatePaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservationId");

  const [paymentData, setPaymentData] = useState<PaymentFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/payment/reservation/${reservationId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Reservasi tidak ditemukan");
        }
        throw new Error("Gagal memuat data pembayaran");
      }

      const data = await response.json();
      setPaymentData(data);

      // Cek apakah sudah ada pembayaran
      if (data.hasPayment) {
        toast.error("Reservasi ini sudah memiliki pembayaran");
        router.push("/dashboard/receptionist/payments");
        return;
      }
    } catch (error) {
      console.error("Error fetching payment data:", error);
      setError(error instanceof Error ? error.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [reservationId, router]);

  useEffect(() => {
    if (!reservationId) {
      setError("ID reservasi tidak ditemukan");
      setLoading(false);
      return;
    }

    fetchPaymentData();
  }, [reservationId, fetchPaymentData]);

  const handlePaymentSuccess = () => {
    toast.success("Pembayaran berhasil dibuat!");
    router.push("/dashboard/receptionist/payments");
  };

  const handleCancel = () => {
    router.push("/dashboard/receptionist/payments");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat data pembayaran...</p>
        </div>
      </div>
    );
  }

  if (error || !paymentData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Buat Pembayaran"
          description="Proses pembayaran untuk reservasi pasien"
        />

        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Gagal Memuat Data</h3>
                <p className="text-muted-foreground">
                  {error || "Terjadi kesalahan saat memuat data pembayaran"}
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Kembali
                </Button>
                <Button onClick={fetchPaymentData}>Coba Lagi</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat Pembayaran"
        description={`Proses pembayaran untuk ${paymentData.reservation.patientName}`}
      >
        <Button variant="outline" onClick={handleCancel}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
      </PageHeader>

      {/* Warning jika sudah ada pembayaran */}
      {paymentData.hasPayment && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Reservasi ini sudah memiliki pembayaran. Anda akan diarahkan kembali
            ke halaman pembayaran.
          </AlertDescription>
        </Alert>
      )}

      {/* Warning jika tidak ada layanan yang tersedia */}
      {paymentData.availableServices.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tidak ada layanan yang tersedia. Hubungi administrator untuk
            menambahkan layanan.
          </AlertDescription>
        </Alert>
      )}

      {/* Form Pembayaran */}
      {!paymentData.hasPayment && (
        <PaymentForm
          reservationId={parseInt(reservationId!)}
          reservationData={paymentData.reservation}
          availableServices={paymentData.availableServices}
          prescriptions={paymentData.prescriptions}
          onSuccess={handlePaymentSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Memuat halaman...</p>
      </div>
    </div>
  );
}

// Main component dengan Suspense wrapper
export default function CreatePaymentPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CreatePaymentContent />
    </Suspense>
  );
}
