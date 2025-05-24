// app/dashboard/receptionist/payments/page.tsx
"use client";

import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatRupiah, formatDateTime } from "@/lib/utils";
import {
  Search,
  CreditCard,
  Eye,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { type PaymentMethod, type PaymentStatus } from "@/types/payment";

interface Payment {
  id: number;
  totalAmount: string;
  paymentMethod: "Cash" | "Debit" | "Credit" | "Transfer" | "BPJS";
  status: "Paid" | "Pending" | "Cancelled";
  paymentDate: string;
  reservationId: number;
  patientName: string;
}

interface CompletedReservation {
  id: number;
  patientName: string;
  doctorName: string;
  reservationDate: string;
  queueNumber: number;
  status: "Completed";
  examinationStatus: "Completed";
  hasPayment: boolean;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [completedReservations, setCompletedReservations] = useState<
    CompletedReservation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isPaymentDetailOpen, setIsPaymentDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"payments" | "reservations">(
    "payments"
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (activeTab === "payments") {
      fetchPayments();
    } else {
      fetchCompletedReservations();
    }
  }, [activeTab, page, searchTerm]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search: searchTerm,
      });

      const response = await fetch(`/api/payment?${params.toString()}`);
      if (!response.ok) throw new Error("Gagal memuat data pembayaran");

      const data = await response.json();
      setPayments(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Gagal memuat data pembayaran");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedReservations = async () => {
    try {
      setLoading(true);
      // API endpoint untuk reservasi yang selesai tapi belum dibayar
      const response = await fetch("/api/reservations/completed-unpaid");
      if (!response.ok) throw new Error("Gagal memuat data reservasi");

      const data = await response.json();
      setCompletedReservations(data.data || []);
    } catch (error) {
      console.error("Error fetching completed reservations:", error);
      toast.error("Gagal memuat data reservasi");
    } finally {
      setLoading(false);
    }
  };

  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsPaymentDetailOpen(true);
  };

  const handleCreatePayment = (reservationId: number) => {
    // Redirect ke halaman form pembayaran
    window.location.href = `/dashboard/receptionist/payments/create?reservationId=${reservationId}`;
  };

  const getPaymentMethodBadge = (method: PaymentMethod) => {
    const colors = {
      Cash: "bg-green-100 text-green-800",
      Debit: "bg-blue-100 text-blue-800",
      Credit: "bg-purple-100 text-purple-800",
      Transfer: "bg-orange-100 text-orange-800",
      BPJS: "bg-red-100 text-red-800",
    };

    return (
      <Badge
        variant="outline"
        className={colors[method] || "bg-gray-100 text-gray-800"}
      >
        {method}
      </Badge>
    );
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "Paid":
        return <Badge variant="secondary">Lunas</Badge>;
      case "Pending":
        return <Badge variant="outline">Pending</Badge>;
      case "Cancelled":
        return <Badge variant="destructive">Dibatalkan</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Pembayaran"
        description="Kelola pembayaran pasien dan buat pembayaran baru"
      />

      {/* Tab Navigation */}
      <div className="flex space-x-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab("payments")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "payments"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Riwayat Pembayaran
        </button>
        <button
          onClick={() => setActiveTab("reservations")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "reservations"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Perlu Pembayaran
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={
              activeTab === "payments"
                ? "Cari pembayaran..."
                : "Cari reservasi..."
            }
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {activeTab === "payments"
              ? "Daftar Pembayaran"
              : "Reservasi Belum Dibayar"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span>Memuat data...</span>
            </div>
          ) : (
            <>
              {activeTab === "payments" ? (
                /* Payment Table */
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Pasien</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Tidak ada data pembayaran
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {formatDateTime(payment.paymentDate)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {payment.patientName}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatRupiah(parseFloat(payment.totalAmount))}
                          </TableCell>
                          <TableCell>
                            {getPaymentMethodBadge(payment.paymentMethod)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(payment.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewPayment(payment)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detail
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              ) : (
                /* Reservations Table */
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Antrian</TableHead>
                      <TableHead>Pasien</TableHead>
                      <TableHead>Dokter</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedReservations.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Tidak ada reservasi yang perlu pembayaran
                        </TableCell>
                      </TableRow>
                    ) : (
                      completedReservations.map((reservation) => (
                        <TableRow key={reservation.id}>
                          <TableCell className="font-medium">
                            {reservation.queueNumber}
                          </TableCell>
                          <TableCell>{reservation.patientName}</TableCell>
                          <TableCell>{reservation.doctorName}</TableCell>
                          <TableCell>
                            {formatDateTime(reservation.reservationDate)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {reservation.examinationStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleCreatePayment(reservation.id)
                              }
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Buat Pembayaran
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}

              {/* Pagination untuk tab payments */}
              {activeTab === "payments" && !loading && payments.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Halaman {page} dari {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      Selanjutnya
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Detail Dialog */}
      <Dialog open={isPaymentDetailOpen} onOpenChange={setIsPaymentDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Pembayaran</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID Pembayaran</p>
                  <p className="font-medium">#{selectedPayment.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal</p>
                  <p className="font-medium">
                    {formatDateTime(selectedPayment.paymentDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pasien</p>
                  <p className="font-medium">{selectedPayment.patientName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-medium text-lg">
                    {formatRupiah(parseFloat(selectedPayment.totalAmount))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Metode Pembayaran
                  </p>
                  {getPaymentMethodBadge(selectedPayment.paymentMethod)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedPayment.status)}
                </div>
              </div>
              {/* Detail items akan ditampilkan di sini jika API mendukung */}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
