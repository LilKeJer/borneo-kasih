// app/dashboard/patient/payments/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import {
  type ItemType,
  type PaymentMethod,
  type PaymentStatus,
} from "@/types/payment";

interface PaymentSummary {
  id: number;
  paymentDate: string;
  totalAmount: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  reservationId: number;
}

interface PaymentDetailItem {
  id: number;
  itemType: ItemType;
  serviceName?: string | null;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  notes?: string | null;
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

export default function PatientPaymentDetailPage() {
  const params = useParams();
  const paymentId = useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId;
  }, [params]);

  const [payment, setPayment] = useState<PaymentSummary | null>(null);
  const [details, setDetails] = useState<PaymentDetailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentDetail = async () => {
      if (!paymentId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/patient/payments/${paymentId}`);

        if (response.status === 404) {
          setError("Pembayaran tidak ditemukan");
          setPayment(null);
          setDetails([]);
          return;
        }

        if (!response.ok) {
          throw new Error("Gagal memuat detail pembayaran");
        }

        const data = await response.json();
        setPayment(data.payment);
        setDetails(data.details ?? []);
      } catch (err) {
        console.error("Error fetching payment detail:", err);
        setError("Gagal memuat detail pembayaran. Silakan coba lagi.");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetail();
  }, [paymentId]);

  const renderStatusBadge = (status: PaymentStatus) => {
    const config = paymentStatusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const renderMethodBadge = (method: PaymentMethod) => {
    return <Badge variant="outline">{paymentMethodLabels[method]}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Detail Pembayaran" description="Informasi pembayaran">
        <Button variant="outline" asChild>
          <Link href="/dashboard/patient/payments">Kembali ke list</Link>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Memuat data...</span>
            </div>
          ) : error ? (
            <div className="text-center py-6">{error}</div>
          ) : payment ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">ID Pembayaran</p>
                <p className="font-medium">{payment.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Tanggal Pembayaran
                </p>
                <p className="font-medium">
                  {formatDateTime(payment.paymentDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Metode</p>
                <p className="font-medium">
                  {renderMethodBadge(payment.paymentMethod)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">
                  {renderStatusBadge(payment.status)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-semibold text-lg">
                  {formatRupiah(parseFloat(payment.totalAmount))}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">Data pembayaran tidak tersedia</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detail Item Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Harga Satuan</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
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
              ) : details.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    Tidak ada detail item
                  </TableCell>
                </TableRow>
              ) : (
                details.map((detail) => (
                  <TableRow key={detail.id}>
                    <TableCell>
                      {detail.serviceName?.trim() ? detail.serviceName : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{detail.itemType}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {detail.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(Number(detail.unitPrice))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(Number(detail.subtotal))}
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
