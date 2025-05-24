// components/receptionist/payment-form.tsx
"use client";

import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatRupiah } from "@/lib/utils";
import { Trash2, Plus, Calculator } from "lucide-react";
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
    const newItems: PaymentItem[] = [];

    selectedPrescriptions.forEach((prescriptionId) => {
      const prescription = prescriptions.find(
        (p) => p.prescriptionId === prescriptionId
      );
      if (prescription) {
        const unitPrice = parseFloat(prescription.medicinePrice);
        const quantity = prescription.quantityUsed;
        const subtotal = unitPrice * quantity;

        newItems.push({
          id: generateItemId(),
          itemType: "Prescription",
          prescriptionId: prescription.prescriptionId,
          medicineName: prescription.medicineName,
          quantity: quantity,
          unitPrice: unitPrice,
          subtotal: subtotal,
          notes: `${prescription.dosage} - ${prescription.frequency} - ${prescription.duration}`,
        });
      }
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

  // Submit payment
  const onSubmit = async (values: PaymentFormValues) => {
    if (paymentItems.length === 0) {
      toast.error("Tambahkan minimal satu item pembayaran");
      return;
    }

    setIsSubmitting(true);

    try {
      const paymentData: CreatePaymentRequest = {
        reservationId: reservationId,
        paymentMethod: values.paymentMethod,
        items: paymentItems.map((item) => ({
          itemType: item.itemType,
          serviceId: item.serviceId,
          prescriptionId: item.prescriptionId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          notes: item.notes,
        })),
        notes: values.notes,
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

      const result = await response.json();
      console.log(result);
      toast.success(
        `Pembayaran berhasil diproses. Total: ${formatRupiah(totalAmount)}`
      );

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal memproses pembayaran"
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
              <Badge variant="secondary">{reservationData.status}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tambah Layanan */}
      <Card>
        <CardHeader>
          <CardTitle>Tambah Layanan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label>Pilih Layanan</Label>
              <Select
                value={selectedServiceId}
                onValueChange={setSelectedServiceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih layanan" />
                </SelectTrigger>
                <SelectContent>
                  {availableServices.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      <div className="flex justify-between items-center w-full">
                        <span>{service.name}</span>
                        <span className="text-muted-foreground ml-2">
                          {formatRupiah(parseFloat(service.basePrice))}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jumlah</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={serviceQuantity}
                  onChange={(e) =>
                    setServiceQuantity(parseInt(e.target.value) || 1)
                  }
                />
                <Button onClick={addServiceItem} disabled={!selectedServiceId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tambah Resep Obat */}
      {prescriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resep Obat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-prescriptions"
                checked={includePrescriptions}
                onCheckedChange={(checked) => setIncludePrescriptions(!checked)}
              />
              <Label htmlFor="include-prescriptions">
                Sertakan resep obat dalam pembayaran
              </Label>
            </div>

            {includePrescriptions && (
              <div className="space-y-4">
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Obat</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Harga Satuan</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prescriptions.map((prescription) => (
                        <TableRow key={prescription.prescriptionId}>
                          <TableCell>
                            <Checkbox
                              checked={selectedPrescriptions.has(
                                prescription.prescriptionId
                              )}
                              onCheckedChange={() =>
                                togglePrescription(prescription.prescriptionId)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {prescription.medicineName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {prescription.dosage} - {prescription.frequency}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{prescription.quantityUsed}</TableCell>
                          <TableCell>
                            {formatRupiah(
                              parseFloat(prescription.medicinePrice)
                            )}
                          </TableCell>
                          <TableCell>
                            {formatRupiah(
                              parseFloat(prescription.medicinePrice) *
                                prescription.quantityUsed
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {selectedPrescriptions.size > 0 && (
                  <Button onClick={addPrescriptionItems} className="w-full">
                    Tambahkan {selectedPrescriptions.size} Resep Obat Terpilih
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daftar Item Pembayaran */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Detail Pembayaran
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada item pembayaran
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Harga Satuan</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {item.serviceName || item.medicineName}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {item.itemType === "Service" ? "Layanan" : "Obat"}
                            </Badge>
                            {item.notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
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
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>{formatRupiah(item.unitPrice)}</TableCell>
                        <TableCell className="font-medium">
                          {formatRupiah(item.subtotal)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePaymentItem(item.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Pembayaran:</span>
                <span className="text-primary">
                  {formatRupiah(totalAmount)}
                </span>
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
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || paymentItems.length === 0}
                  className="min-w-32"
                >
                  {isSubmitting
                    ? "Memproses..."
                    : `Bayar ${formatRupiah(totalAmount)}`}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
