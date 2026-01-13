// app/dashboard/patient/payments/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatRupiah } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { type PaymentMethod, type PaymentStatus } from "@/types/payment";

interface PatientPayment {
  id: number;
  paymentDate: string;
  totalAmount: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  reservationId: number;
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  Cash: "Tunai",
  Debit: "Debit",
  Credit: "Kredit",
  Transfer: "Transfer",
  BPJS: "BPJS",
};

const paymentStatusConfig: Record<
  PaymentStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  Paid: { label: "Lunas", variant: "default" },
  Pending: { label: "Menunggu", variant: "secondary" },
  Cancelled: { label: "Dibatalkan", variant: "destructive" },
};

export default function PatientPaymentsPage() {
  const [payments, setPayments] = useState<PatientPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/patient/payments");

        if (!response.ok) {
          throw new Error("Gagal memuat data pembayaran");
        }

        const data = await response.json();
        setPayments(data.data ?? []);
      } catch (err) {
        console.error("Error fetching patient payments:", err);
        setError("Gagal memuat data pembayaran. Silakan coba lagi.");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const renderStatusBadge = (status: PaymentStatus) => {
    const config = paymentStatusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const renderMethodBadge = (method: PaymentMethod) => {
    return <Badge variant="outline">{paymentMethodLabels[method]}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pembayaran"
        description="Riwayat pembayaran Anda di klinik"
      />

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Memuat data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    {error}
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    Belum ada pembayaran
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {formatDateTime(payment.paymentDate)}
                    </TableCell>
                    <TableCell>
                      {renderMethodBadge(payment.paymentMethod)}
                    </TableCell>
                    <TableCell>{renderStatusBadge(payment.status)}</TableCell>
                    <TableCell>
                      {formatRupiah(parseFloat(payment.totalAmount))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={`/dashboard/patient/payments/${payment.id}`}
                        >
                          Detail
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
