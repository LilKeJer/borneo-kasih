// app/dashboard/receptionist/payments/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatRupiah, formatDateTime } from "@/lib/utils";
import {
  Search,
  CreditCard,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { type PaymentMethod, type PaymentStatus } from "@/types/payment";

interface Payment {
  id: number;
  totalAmount: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paymentDate: string;
  reservationId: number;
  patientName: string;
  doctorName: string;
}

interface PaymentDetail {
  id: number;
  itemType: string;
  serviceName?: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  notes?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([]);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination states
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    totalRecords: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Fetch payments dengan filter
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const response = await fetch(`/api/payment?${queryParams}`);

      if (!response.ok) {
        throw new Error("Gagal memuat data pembayaran");
      }

      const data = await response.json();
      setPayments(data.data || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Gagal memuat data pembayaran");
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
    statusFilter,
    startDate,
    endDate,
  ]);

  // Fetch payment details
  const fetchPaymentDetails = async (paymentId: number) => {
    try {
      setLoadingDetails(true);
      const response = await fetch(
        `/api/payment-detail?paymentId=${paymentId}`
      );

      if (!response.ok) {
        throw new Error("Gagal memuat detail pembayaran");
      }

      const data = await response.json();
      setPaymentDetails(data.data || []);
    } catch (error) {
      console.error("Error fetching payment details:", error);
      toast.error("Gagal memuat detail pembayaran");
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleViewDetail = async (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDetailDialog(true);
    await fetchPaymentDetails(payment.id);
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchPayments();
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const getPaymentMethodBadge = (method: PaymentMethod) => {
    const variants: Record<PaymentMethod, { color: string; text: string }> = {
      Cash: { color: "default", text: "Tunai" },
      Debit: { color: "blue", text: "Debit" },
      Credit: { color: "purple", text: "Kredit" },
      Transfer: { color: "green", text: "Transfer" },
      BPJS: { color: "orange", text: "BPJS" },
    };

    const variant = variants[method];
    return (
      <Badge className={`bg-${variant.color}-100 text-${variant.color}-800`}>
        {variant.text}
      </Badge>
    );
  };

  const getStatusBadge = (status: PaymentStatus) => {
    const variants: Record<PaymentStatus, { color: string; text: string }> = {
      Paid: { color: "green", text: "Lunas" },
      Pending: { color: "yellow", text: "Menunggu" },
      Cancelled: { color: "red", text: "Dibatalkan" },
    };

    const variant = variants[status];
    return (
      <Badge className={`bg-${variant.color}-100 text-${variant.color}-800`}>
        {variant.text}
      </Badge>
    );
  };

  return (
    <>
      <PageHeader
        title="Daftar Pembayaran"
        description="Kelola pembayaran pasien"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hari Ini</p>
                <p className="text-xl font-semibold">
                  {formatRupiah(
                    payments
                      .filter((p) => {
                        const paymentDate = new Date(
                          p.paymentDate
                        ).toDateString();
                        const today = new Date().toDateString();
                        return paymentDate === today && p.status === "Paid";
                      })
                      .reduce((sum, p) => sum + parseFloat(p.totalAmount), 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Transaksi Hari Ini
                </p>
                <p className="text-xl font-semibold">
                  {
                    payments.filter((p) => {
                      const paymentDate = new Date(
                        p.paymentDate
                      ).toDateString();
                      const today = new Date().toDateString();
                      return paymentDate === today;
                    }).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Menunggu</p>
                <p className="text-xl font-semibold">
                  {payments.filter((p) => p.status === "Pending").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Pembayaran
                </p>
                <p className="text-xl font-semibold">
                  {pagination.totalRecords}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Section */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari nama pasien..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as PaymentStatus | "")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Status</SelectItem>
                <SelectItem value="Paid">Lunas</SelectItem>
                <SelectItem value="Pending">Menunggu</SelectItem>
                <SelectItem value="Cancelled">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="Tanggal Mulai"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <Input
              type="date"
              placeholder="Tanggal Selesai"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />

            <Button onClick={handleSearch} className="w-full">
              <Search className="h-4 w-4 mr-2" />
              Cari
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Tidak ada data pembayaran</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Pasien</TableHead>
                    <TableHead>Dokter</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment, index) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(payment.paymentDate)}
                      </TableCell>
                      <TableCell>{payment.patientName}</TableCell>
                      <TableCell>{payment.doctorName}</TableCell>
                      <TableCell>
                        {formatRupiah(parseFloat(payment.totalAmount))}
                      </TableCell>
                      <TableCell>
                        {getPaymentMethodBadge(payment.paymentMethod)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetail(payment)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Menampilkan {(pagination.page - 1) * pagination.limit + 1} -{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.totalRecords
                  )}{" "}
                  dari {pagination.totalRecords} data
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detail Pembayaran</DialogTitle>
            <DialogDescription>
              Informasi lengkap pembayaran #{selectedPayment?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pasien</Label>
                  <p className="font-medium">{selectedPayment.patientName}</p>
                </div>
                <div>
                  <Label>Dokter</Label>
                  <p className="font-medium">{selectedPayment.doctorName}</p>
                </div>
                <div>
                  <Label>Tanggal Pembayaran</Label>
                  <p className="font-medium">
                    {formatDateTime(selectedPayment.paymentDate)}
                  </p>
                </div>
                <div>
                  <Label>Metode Pembayaran</Label>
                  <p className="font-medium">
                    {getPaymentMethodBadge(selectedPayment.paymentMethod)}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Payment Details */}
              <div>
                <Label className="mb-2 block">Detail Item Pembayaran</Label>
                {loadingDetails ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">
                          Harga Satuan
                        </TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentDetails.map((detail) => (
                        <TableRow key={detail.id}>
                          <TableCell>
                            {detail.serviceName || detail.notes || "Item"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{detail.itemType}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {detail.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatRupiah(parseFloat(detail.unitPrice))}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatRupiah(parseFloat(detail.subtotal))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <Separator />

              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total Pembayaran</span>
                <span className="text-2xl font-bold text-primary">
                  {formatRupiah(parseFloat(selectedPayment.totalAmount))}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
