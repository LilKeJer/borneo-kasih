// components/receptionist/payment-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatRupiah } from "@/lib/utils";
import {
  Trash2,
  Plus,
  Calculator,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import {
  type Service,
  type PrescriptionData,
  type PaymentItem,
  type ReservationData,
  type CreatePaymentRequest,
} from "@/types/payment";

const paymentSchema = z.object({
  paymentMethod: z.enum(
    ["Cash", "Debit", "Credit", "Transfer", "BPJS"] as const,
    {
      required_error: "Metode pembayaran harus dipilih",
    }
  ),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  reservationId: number;
  reservationData: ReservationData;
  availableServices: Service[];
  prescriptions: PrescriptionData[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PaymentForm({
  reservationId,
  reservationData,
  availableServices,
  prescriptions,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const router = useRouter();
  const [paymentItems, setPaymentItems] = useState<PaymentItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [serviceQuantity, setServiceQuantity] = useState<number>(1);
  const [includePrescriptions, setIncludePrescriptions] =
    useState<boolean>(false);
  const [selectedPrescriptions, setSelectedPrescriptions] = useState<
    Set<number>
  >(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] =
    useState<PaymentFormValues | null>(null);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "Cash",
      notes: "",
    },
  });

  // Hitung total amount setiap kali paymentItems berubah
  useEffect(() => {
    const total = paymentItems.reduce((sum, item) => sum + item.subtotal, 0);
    setTotalAmount(total);
  }, [paymentItems]);

  // Generate unique ID untuk payment item
  const generateItemId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // Tambah layanan ke payment items
  const addServiceItem = () => {
    if (!selectedServiceId) {
      toast.error("Pilih layanan terlebih dahulu");
      return;
    }

    const service = availableServices.find(
      (s) => s.id.toString() === selectedServiceId
    );
    if (!service) {
      toast.error("Layanan tidak ditemukan");
      return;
    }

    const unitPrice = parseFloat(service.basePrice);
    const subtotal = unitPrice * serviceQuantity;

    const newItem: PaymentItem = {
      id: generateItemId(),
      itemType: "Service",
      serviceId: service.id,
      serviceName: service.name,
      quantity: serviceQuantity,
      unitPrice: unitPrice,
      subtotal: subtotal,
    };

    setPaymentItems((prev) => [...prev, newItem]);
    setSelectedServiceId("");
    setServiceQuantity(1);
    toast.success("Layanan ditambahkan");
  };

  // Toggle prescription selection
  const togglePrescription = (prescriptionId: number) => {
    const newSelected = new Set(selectedPrescriptions);
    if (newSelected.has(prescriptionId)) {
      newSelected.delete(prescriptionId);
    } else {
      newSelected.add(prescriptionId);
    }
    setSelectedPrescriptions(newSelected);
  };

  // Tambah prescription items
  const addPrescriptionItems = () => {
    const newItems: PaymentItem[] = prescriptions
      .filter((prescription) =>
        selectedPrescriptions.has(prescription.prescriptionId)
      )
      .map((prescription) => {
        const unitPrice = parseFloat(prescription.medicinePrice);
        const quantity = prescription.quantityUsed;
        const subtotal = unitPrice * quantity;
        const notesParts = [
          prescription.dosage,
          prescription.frequency,
          prescription.duration,
        ].filter(Boolean);
        const notes = notesParts.length > 0 ? notesParts.join(" - ") : undefined;

        return {
          id: generateItemId(),
          itemType: "Prescription",
          prescriptionId: prescription.prescriptionId,
          medicineName: prescription.medicineName,
          quantity: quantity,
          unitPrice: unitPrice,
          subtotal: subtotal,
          notes: notes,
        };
      });

    setPaymentItems((prev) => [...prev, ...newItems]);
    setSelectedPrescriptions(new Set());
    setIncludePrescriptions(false);
    toast.success(`${newItems.length} resep obat ditambahkan`);
  };

  // Hapus payment item
  const removePaymentItem = (itemId: string) => {
    setPaymentItems((prev) => prev.filter((item) => item.id !== itemId));
    toast.success("Item pembayaran dihapus");
  };

  // Update quantity payment item
  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return;

    setPaymentItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newSubtotal = item.unitPrice * newQuantity;
          return { ...item, quantity: newQuantity, subtotal: newSubtotal };
        }
        return item;
      })
    );
  };

  // Handle form submit - show confirmation dialog
  const onSubmit = async (values: PaymentFormValues) => {
    if (paymentItems.length === 0) {
      toast.error("Tambahkan minimal satu item pembayaran");
      return;
    }

    setPendingPaymentData(values);
    setShowConfirmDialog(true);
  };

  // Process payment after confirmation
  const processPayment = async () => {
    if (!pendingPaymentData) return;

    setIsSubmitting(true);
    setShowConfirmDialog(false);

    try {
      const paymentData: CreatePaymentRequest = {
        reservationId: reservationId,
        paymentMethod: pendingPaymentData.paymentMethod,
        items: paymentItems.map((item) => ({
          itemType: item.itemType,
          serviceId: item.serviceId,
          prescriptionId: item.prescriptionId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          notes: item.notes,
        })),
        notes: pendingPaymentData.notes,
      };

      const response = await fetch("/api/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal memproses pembayaran");
      }

      await response.json();

      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          <div>
            <p className="font-semibold">Pembayaran Berhasil!</p>
            <p className="text-sm">Total: {formatRupiah(totalAmount)}</p>
          </div>
        </div>
      );

      // Redirect ke halaman payment list setelah sukses
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/dashboard/receptionist/payments");
        }
      }, 1500);
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error(
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <div>
            <p className="font-semibold">Pembayaran Gagal</p>
            <p className="text-sm">
              {error instanceof Error ? error.message : "Terjadi kesalahan"}
            </p>
          </div>
        </div>
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Informasi Reservasi */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Reservasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Pasien</Label>
              <p className="font-medium">{reservationData.patientName}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Dokter</Label>
              <p className="font-medium">{reservationData.doctorName}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">
                No. Antrian
              </Label>
              <p className="font-medium">{reservationData.queueNumber}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Status</Label>
              <Badge
                variant={
                  reservationData.examinationStatus === "Completed"
                    ? "default"
                    : "secondary"
                }
              >
                {reservationData.examinationStatus}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tambah Item Layanan */}
      <Card>
        <CardHeader>
          <CardTitle>Tambah Layanan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label>Pilih Layanan</Label>
              <Select
                value={selectedServiceId}
                onValueChange={setSelectedServiceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih layanan..." />
                </SelectTrigger>
                <SelectContent>
                  {availableServices.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name} -{" "}
                      {formatRupiah(parseFloat(service.basePrice))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={serviceQuantity}
                onChange={(e) =>
                  setServiceQuantity(parseInt(e.target.value) || 1)
                }
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addServiceItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Tambah
              </Button>
            </div>
          </div>

          {/* Resep Obat */}
          {prescriptions.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Checkbox
                  checked={includePrescriptions}
                  onCheckedChange={(checked) =>
                    setIncludePrescriptions(checked as boolean)
                  }
                />
                <Label>Sertakan Resep Obat</Label>
              </div>

              {includePrescriptions && (
                <div className="space-y-2 p-4 border rounded-lg">
                  {prescriptions.map((prescription) => (
                    <div
                      key={`${prescription.prescriptionId}-${prescription.medicineId}`}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedPrescriptions.has(
                            prescription.prescriptionId
                          )}
                          onCheckedChange={() =>
                            togglePrescription(prescription.prescriptionId)
                          }
                        />
                        <span>{prescription.medicineName}</span>
                        <Badge variant="outline">
                          {prescription.quantityUsed} unit
                        </Badge>
                      </div>
                      <span className="font-medium">
                        {formatRupiah(
                          parseFloat(prescription.medicinePrice) *
                            prescription.quantityUsed
                        )}
                      </span>
                    </div>
                  ))}
                  <Button
                    onClick={addPrescriptionItems}
                    disabled={selectedPrescriptions.size === 0}
                    className="mt-4 w-full"
                  >
                    Tambahkan Resep Terpilih
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daftar Item Pembayaran */}
      <Card>
        <CardHeader>
          <CardTitle>Item Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada item pembayaran
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Harga Satuan</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.serviceName || item.medicineName || "Item"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.itemType}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItemQuantity(
                            item.id,
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-16 text-center"
                        disabled={item.itemType === "Prescription"}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatRupiah(item.subtotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removePaymentItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {paymentItems.length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="space-y-2 text-right">
                <div className="text-2xl font-bold">
                  Total: {formatRupiah(totalAmount)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Pembayaran */}
      <Card>
        <CardHeader>
          <CardTitle>Metode Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metode Pembayaran</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih metode pembayaran" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Cash">Tunai</SelectItem>
                        <SelectItem value="Debit">Kartu Debit</SelectItem>
                        <SelectItem value="Credit">Kartu Kredit</SelectItem>
                        <SelectItem value="Transfer">Transfer Bank</SelectItem>
                        <SelectItem value="BPJS">BPJS</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catatan (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Catatan pembayaran" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel || (() => router.back())}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || paymentItems.length === 0}
                  className="min-w-32"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-4 w-4" />
                      Proses Pembayaran
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pembayaran</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4 mt-4">
                <div className="flex justify-between">
                  <span>Pasien:</span>
                  <span className="font-medium">
                    {reservationData.patientName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Metode Pembayaran:</span>
                  <span className="font-medium">
                    {pendingPaymentData?.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Jumlah Item:</span>
                  <span className="font-medium">
                    {paymentItems.length} item
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Pembayaran:</span>
                  <span className="text-primary">
                    {formatRupiah(totalAmount)}
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={processPayment} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Konfirmasi Pembayaran"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
