// components/doctor/FullMedicalRecordForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { formatRupiah } from "@/lib/utils"; // Pastikan path ini sesuai dengan struktur proyek Anda

import {
  fullMedicalRecordSchema,
  type FullMedicalRecordFormValues,
} from "@/lib/validations/medical-record"; // Sesuaikan path jika berbeda
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { type Service as ApiServiceType } from "@/types/payment"; // Asumsi tipe ini ada dan sesuai
import { type Medicine as ApiMedicineType } from "@/types/pharmacy"; // Tipe dari langkah 1.1
import { useEncryption } from "@/hooks/use-encryption";

interface FullMedicalRecordFormProps {
  patientId: string;
  reservationId?: number;
  availableServices: ApiServiceType[];
  availableMedicines: ApiMedicineType[];
  onSuccess?: (medicalRecordId: number, prescriptionId?: number) => void;
  onCancel?: () => void;
}

export function FullMedicalRecordForm({
  patientId,
  reservationId,
  availableServices,
  availableMedicines,
  onSuccess,
  onCancel,
}: FullMedicalRecordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceSearchTerms, setServiceSearchTerms] = useState<
    Record<string, string>
  >({});
  const [medicineSearchTerms, setMedicineSearchTerms] = useState<
    Record<string, string>
  >({});
  const { encrypt, initialize } = useEncryption();
  const manuallySelectableServices = availableServices.filter(
    (service) => !service.isDoctorDefault
  );

  const form = useForm<FullMedicalRecordFormValues>({
    resolver: zodResolver(fullMedicalRecordSchema),
    defaultValues: {
      patientId,
      reservationId,
      condition: "",
      description: "",
      treatment: "",
      doctorNotes: "",
      services: [],
      prescriptions: [],
    },
  });

  const {
    fields: serviceFields,
    append: appendService,
    remove: removeService,
  } = useFieldArray({
    control: form.control,
    name: "services",
  });

  const {
    fields: prescriptionFields,
    append: appendPrescription,
    remove: removePrescription,
  } = useFieldArray({
    control: form.control,
    name: "prescriptions",
  });
  const prescriptionValues = form.watch("prescriptions");

  const getSelectedMedicineById = (medicineId?: string) => {
    if (!medicineId) return undefined;

    return availableMedicines.find(
      (medicine) => medicine.id.toString() === medicineId
    );
  };

  const getRequestedQuantityForMedicine = (
    medicineId?: string,
    excludeIndex?: number
  ) => {
    if (!medicineId) return 0;

    return (prescriptionValues ?? []).reduce((total, item, index) => {
      if (!item || item.medicineId !== medicineId || index === excludeIndex) {
        return total;
      }

      return total + Number(item.quantity || 0);
    }, 0);
  };

  const getRemainingStockForMedicine = (
    medicineId?: string,
    excludeIndex?: number
  ) => {
    const medicine = getSelectedMedicineById(medicineId);
    const totalStock = medicine?.totalStock ?? 0;
    const usedByOtherRows = getRequestedQuantityForMedicine(
      medicineId,
      excludeIndex
    );

    return Math.max(totalStock - usedByOtherRows, 0);
  };

  const getMedicineStockLabel = (medicine?: ApiMedicineType) => {
    if (!medicine) return "Belum ada data stok";

    if (medicine.status === "Out of Stock" || (medicine.totalStock ?? 0) <= 0) {
      return "Stok habis";
    }

    if (medicine.status === "Low Stock") {
      return "Stok rendah";
    }

    return "Stok aman";
  };

  const getMedicineStockBadgeClass = (medicine?: ApiMedicineType) => {
    if (!medicine) return "bg-muted text-muted-foreground";

    if (medicine.status === "Out of Stock" || (medicine.totalStock ?? 0) <= 0) {
      return "bg-red-100 text-red-700";
    }

    if (medicine.status === "Low Stock") {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-emerald-100 text-emerald-700";
  };

  const getFilteredServices = (
    searchTerm: string,
    selectedServiceId?: string
  ) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return manuallySelectableServices;
    }

    const filtered = manuallySelectableServices.filter((service) => {
      const name = service.name.toLowerCase();
      const category = service.category.toLowerCase();
      const description = service.description?.toLowerCase() || "";

      return (
        name.includes(normalizedSearch) ||
        category.includes(normalizedSearch) ||
        description.includes(normalizedSearch)
      );
    });

    if (!selectedServiceId) {
      return filtered;
    }

    const selectedService = manuallySelectableServices.find(
      (service) => service.id.toString() === selectedServiceId
    );

    if (
      selectedService &&
      !filtered.some((service) => service.id === selectedService.id)
    ) {
      return [selectedService, ...filtered];
    }

    return filtered;
  };

  const getFilteredMedicines = (
    searchTerm: string,
    selectedMedicineId?: string
  ) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return availableMedicines;
    }

    const filtered = availableMedicines.filter((medicine) => {
      const name = medicine.name.toLowerCase();
      const category = medicine.category?.toLowerCase() || "";
      const description = medicine.description?.toLowerCase() || "";
      const dosageForm = medicine.dosageForm?.toLowerCase() || "";

      return (
        name.includes(normalizedSearch) ||
        category.includes(normalizedSearch) ||
        description.includes(normalizedSearch) ||
        dosageForm.includes(normalizedSearch)
      );
    });

    if (!selectedMedicineId) {
      return filtered;
    }

    const selectedMedicine = availableMedicines.find(
      (medicine) => medicine.id.toString() === selectedMedicineId
    );

    if (
      selectedMedicine &&
      !filtered.some((medicine) => medicine.id === selectedMedicine.id)
    ) {
      return [selectedMedicine, ...filtered];
    }

    return filtered;
  };

  useEffect(() => {
    initialize();
  }, [initialize]);

  async function onSubmit(data: FullMedicalRecordFormValues) {
    setIsSubmitting(true);
    try {
      data.prescriptions?.forEach((_, index) => {
        form.clearErrors(`prescriptions.${index}.quantity`);
      });

      const requestedByMedicine = new Map<
        string,
        { totalQuantity: number; indexes: number[] }
      >();

      data.prescriptions?.forEach((item, index) => {
        if (!item.medicineId) {
          return;
        }

        const existing = requestedByMedicine.get(item.medicineId) ?? {
          totalQuantity: 0,
          indexes: [],
        };

        existing.totalQuantity += Number(item.quantity || 0);
        existing.indexes.push(index);
        requestedByMedicine.set(item.medicineId, existing);
      });

      for (const [medicineId, summary] of requestedByMedicine) {
        const selectedMedicine = getSelectedMedicineById(medicineId);
        const totalStock = selectedMedicine?.totalStock ?? 0;

        if (summary.totalQuantity > totalStock) {
          summary.indexes.forEach((index) => {
            form.setError(`prescriptions.${index}.quantity`, {
              type: "manual",
              message: `Total resep ${summary.totalQuantity} melebihi stok tersedia ${totalStock}`,
            });
          });

          throw new Error(
            `Jumlah resep untuk ${selectedMedicine?.name || "obat terpilih"} melebihi stok tersedia (${totalStock}).`
          );
        }
      }

      const doctorIvMap: Record<string, string> = {};
      const encryptDoctorField = async (value: string, key: string) => {
        const { ciphertext, iv } = await encrypt(value);
        doctorIvMap[key] = iv;
        return ciphertext;
      };

      const encryptedCondition = await encryptDoctorField(
        data.condition,
        "condition"
      );
      const encryptedDescription = await encryptDoctorField(
        data.description,
        "description"
      );
      const encryptedTreatment = await encryptDoctorField(
        data.treatment,
        "treatment"
      );
      const encryptedDoctorNotes = data.doctorNotes?.trim()
        ? await encryptDoctorField(data.doctorNotes, "doctorNotes")
        : "";

      const encryptedPrescriptions = data.prescriptions
        ? await Promise.all(
            data.prescriptions.map(async (item) => {
              const ivMap: Record<string, string> = {};
              const { ciphertext: encryptedDosage, iv: dosageIv } =
                await encrypt(item.dosage);
              const { ciphertext: encryptedFrequency, iv: frequencyIv } =
                await encrypt(item.frequency);
              const { ciphertext: encryptedDuration, iv: durationIv } =
                await encrypt(item.duration);

              ivMap.dosage = dosageIv;
              ivMap.frequency = frequencyIv;
              ivMap.duration = durationIv;

              return {
                ...item,
                dosage: encryptedDosage,
                frequency: encryptedFrequency,
                duration: encryptedDuration,
                encryptionIv: JSON.stringify(ivMap),
              };
            })
          )
        : [];

      // Pastikan data yang dikirim sesuai dengan ekspektasi API
      const payload = {
        ...data,
        condition: encryptedCondition,
        description: encryptedDescription,
        treatment: encryptedTreatment,
        doctorNotes: encryptedDoctorNotes,
        encryptionIvDoctor: JSON.stringify(doctorIvMap),
        services:
          data.services?.map((s) => ({ ...s, quantity: Number(s.quantity) })) ||
          [],
        prescriptions:
          encryptedPrescriptions.map((p) => ({
            ...p,
            quantity: Number(p.quantity),
          })) || [],
      };

      const response = await fetch("/api/medical-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Gagal menyimpan rekam medis lengkap"
        );
      }

      toast.success(
        result.message || "Rekam medis dan resep berhasil disimpan."
      );
      form.reset(); // Reset form setelah sukses
      onSuccess?.(result.medicalRecordId, result.prescriptionId);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan."
      );
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Catatan Pemeriksaan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kondisi/Diagnosis Utama</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Misal: Influenza, Hipertensi"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi Pemeriksaan</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Jelaskan hasil pemeriksaan..."
                      {...field}
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="treatment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Penanganan/Rencana Perawatan</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tindakan yang diberikan atau direncanakan..."
                      {...field}
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="doctorNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan Dokter (Opsional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Catatan tambahan..."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Layanan Tambahan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {serviceFields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-end gap-2 border p-4 rounded-md relative"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => {
                    removeService(index);
                    setServiceSearchTerms((current) => {
                      const next = { ...current };
                      delete next[field.id];
                      return next;
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <FormField
                  control={form.control}
                  name={`services.${index}.serviceId`}
                  render={({ field: serviceField }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Layanan</FormLabel>
                      <Input
                        placeholder="Cari layanan..."
                        value={serviceSearchTerms[field.id] || ""}
                        onChange={(event) =>
                          setServiceSearchTerms((current) => ({
                            ...current,
                            [field.id]: event.target.value,
                          }))
                        }
                        className="mb-2"
                      />
                      <Select
                        onValueChange={(value) => {
                          serviceField.onChange(value);
                          const selectedService = availableServices.find(
                            (service) => service.id.toString() === value
                          );

                          setServiceSearchTerms((current) => ({
                            ...current,
                            [field.id]: selectedService?.name || "",
                          }));
                        }}
                        defaultValue={serviceField.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih layanan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getFilteredServices(
                            serviceSearchTerms[field.id] || "",
                            serviceField.value
                          ).length === 0 ? (
                            <div className="px-2 py-3 text-sm text-muted-foreground">
                              Tidak ada layanan yang cocok.
                            </div>
                          ) : (
                            getFilteredServices(
                              serviceSearchTerms[field.id] || "",
                              serviceField.value
                            ).map((service) => (
                              <SelectItem
                                key={service.id}
                                value={service.id.toString()}
                              >
                                {service.name} (
                                {formatRupiah(parseFloat(service.basePrice))})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`services.${index}.quantity`}
                  render={({ field: qtyField }) => (
                    <FormItem>
                      <FormLabel>Qty</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...qtyField}
                          className="w-24"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`services.${index}.notes`}
                  render={({ field: notesField }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Catatan Layanan (Opsional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Catatan untuk layanan ini"
                          {...notesField}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendService({ serviceId: "", quantity: 1, notes: "" })
              }
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Layanan
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resep Obat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prescriptionFields.map((field, index) => {
              const selectedMedicine = getSelectedMedicineById(
                prescriptionValues?.[index]?.medicineId
              );
              const unitLabel = selectedMedicine?.unit?.trim() || "unit";
              const currentMedicineId = prescriptionValues?.[index]?.medicineId;
              const totalRequestedForMedicine = getRequestedQuantityForMedicine(
                currentMedicineId
              );
              const remainingStockForRow = getRemainingStockForMedicine(
                currentMedicineId,
                index
              );
              const isStockExceeded =
                Boolean(currentMedicineId) &&
                totalRequestedForMedicine > (selectedMedicine?.totalStock ?? 0);

              return (
                <div
                  key={field.id}
                  className="space-y-3 border p-4 rounded-md relative"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => {
                      removePrescription(index);
                      setMedicineSearchTerms((current) => {
                        const next = { ...current };
                        delete next[field.id];
                        return next;
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`prescriptions.${index}.medicineId`}
                      render={({ field: medField }) => (
                        <FormItem>
                          <FormLabel>Obat</FormLabel>
                          <Input
                            placeholder="Cari obat..."
                            value={medicineSearchTerms[field.id] || ""}
                            onChange={(event) =>
                              setMedicineSearchTerms((current) => ({
                                ...current,
                                [field.id]: event.target.value,
                              }))
                            }
                            className="mb-2"
                          />
                          <Select
                            onValueChange={(value) => {
                              medField.onChange(value);
                              const selectedMedicine = availableMedicines.find(
                                (medicine) => medicine.id.toString() === value
                              );

                              setMedicineSearchTerms((current) => ({
                                ...current,
                                [field.id]: selectedMedicine?.name || "",
                              }));
                            }}
                            defaultValue={medField.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih obat" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getFilteredMedicines(
                                medicineSearchTerms[field.id] || "",
                                medField.value
                              ).length === 0 ? (
                                <div className="px-2 py-3 text-sm text-muted-foreground">
                                  Tidak ada obat yang cocok.
                                </div>
                              ) : (
                                getFilteredMedicines(
                                  medicineSearchTerms[field.id] || "",
                                  medField.value
                                ).map((med) => (
                                  <SelectItem
                                    key={med.id}
                                    value={med.id.toString()}
                                  >
                                    {med.name}
                                    {typeof med.totalStock === "number"
                                      ? ` - ${med.totalStock} ${med.unit || "unit"}`
                                      : ""}
                                    {med.status === "Low Stock"
                                      ? " - stok rendah"
                                      : med.status === "Out of Stock"
                                        ? " - stok habis"
                                        : ""}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`prescriptions.${index}.quantity`}
                      render={({ field: qtyField }) => (
                        <FormItem>
                          <FormLabel>Kuantitas</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max={selectedMedicine?.totalStock ?? undefined}
                              {...qtyField}
                              className="w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {selectedMedicine && (
                    <div className="rounded-md border bg-muted/40 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {selectedMedicine.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className={getMedicineStockBadgeClass(selectedMedicine)}
                        >
                          {getMedicineStockLabel(selectedMedicine)}
                        </Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-1 text-muted-foreground md:grid-cols-3">
                        <p>
                          Stok tersedia:{" "}
                          <span className="font-medium text-foreground">
                            {selectedMedicine.totalStock ?? 0} {unitLabel}
                          </span>
                        </p>
                        <p>
                          Satuan:{" "}
                          <span className="font-medium text-foreground">
                            {unitLabel}
                          </span>
                        </p>
                        <p>
                          Minimum stok:{" "}
                          <span className="font-medium text-foreground">
                            {selectedMedicine.minimumStock ?? 0} {unitLabel}
                          </span>
                        </p>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-1 text-muted-foreground md:grid-cols-2">
                        <p>
                          Total diresepkan di form ini:{" "}
                          <span className="font-medium text-foreground">
                            {totalRequestedForMedicine} {unitLabel}
                          </span>
                        </p>
                        <p>
                          Sisa stok untuk baris ini:{" "}
                          <span className="font-medium text-foreground">
                            {remainingStockForRow} {unitLabel}
                          </span>
                        </p>
                      </div>
                      {isStockExceeded && (
                        <p className="mt-2 text-sm font-medium text-red-600">
                          Total resep untuk obat ini melebihi stok yang tersedia.
                        </p>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name={`prescriptions.${index}.dosage`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Dosis</FormLabel>
                          <FormControl>
                            <Input placeholder="Misal: 1 tablet" {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`prescriptions.${index}.frequency`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Frekuensi</FormLabel>
                          <FormControl>
                            <Input placeholder="Misal: 3x sehari" {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`prescriptions.${index}.duration`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Durasi</FormLabel>
                          <FormControl>
                            <Input placeholder="Misal: 5 hari" {...f} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name={`prescriptions.${index}.notes`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>Catatan Obat (Opsional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Misal: Diminum sesudah makan"
                            {...f}
                            rows={1}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendPrescription({
                  medicineId: "",
                  dosage: "",
                  frequency: "",
                  duration: "",
                  quantity: 1,
                  notes: "",
                })
              }
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Obat ke Resep
            </Button>
          </CardContent>
        </Card>

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
            disabled={isSubmitting}
            className="min-w-[180px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
              </>
            ) : (
              "Simpan Rekam Medis & Resep"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
