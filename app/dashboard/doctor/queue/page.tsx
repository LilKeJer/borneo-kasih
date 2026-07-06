// app/dashboard/doctor/queue/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDate, formatTime } from "@/lib/utils/date";
import { useEmergencyPolling } from "@/hooks/use-emergency-polling";
import { EmergencyNotification } from "@/components/receptionist/emergency-notification";

import { PageHeader } from "@/components/dashboard/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";
import {
  ClipboardList,
  FileText,
  Clock,
  User,
  Loader2,
  PlayCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface Patient {
  id: number;
  patientId: number;
  patientName: string;
  queueNumber: number;
  reservationDate: string;
  status: string;
  examinationStatus: string;
  isPriority: boolean;
  priorityReason: string;
  checkedInAt: string | null;
  complaint?: string;
  lastVisitDate?: string | null;
  hasMedicalRecord: boolean;
  medicalRecordId: number | null;
}

export default function DoctorQueuePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queuePatients, setQueuePatients] = useState<Patient[]>([]);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [isPatientDetailOpen, setIsPatientDetailOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [updatingReservationId, setUpdatingReservationId] = useState<
    number | null
  >(null);
  const { lastEmergency, dismissLatest } = useEmergencyPolling();

  const fetchQueueData = useCallback(
    async ({
      showBlockingLoader = false,
      showErrorToast = true,
    }: {
      showBlockingLoader?: boolean;
      showErrorToast?: boolean;
    } = {}) => {
      try {
        if (showBlockingLoader) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const response = await fetch(`/api/doctor/queue`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch queue data");
        }

        const data = await response.json();
        setQueuePatients(data.waitingPatients || []);
        setCurrentPatient(data.currentPatient || null);
        setLastUpdatedAt(new Date());
      } catch (error) {
        console.error("Error fetching queue:", error);
        if (showErrorToast) {
          toast.error("Gagal memuat data antrian");
        }
      } finally {
        if (showBlockingLoader) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void fetchQueueData({ showBlockingLoader: true });
  }, [fetchQueueData]);

  useEffect(() => {
    if (
      !autoRefreshEnabled ||
      isPatientDetailOpen ||
      updatingReservationId !== null
    ) {
      return;
    }

    const intervalId = setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void fetchQueueData({ showErrorToast: false });
    }, 30000);

    return () => clearInterval(intervalId);
  }, [
    autoRefreshEnabled,
    fetchQueueData,
    isPatientDetailOpen,
    updatingReservationId,
  ]);

  const handleUpdateStatus = async (
    reservationId: number,
    newStatus: string
  ) => {
    try {
      setUpdatingReservationId(reservationId);
      const response = await fetch(`/api/queue/${reservationId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examinationStatus: newStatus,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal mengupdate status");
      }

      toast.success("Status antrian berhasil diperbarui");
      await fetchQueueData();
    } catch (error) {
      console.error("Error updating queue status:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal mengupdate status"
      );
    } finally {
      setUpdatingReservationId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Waiting":
        return <Badge variant="outline">Menunggu</Badge>;
      case "In Progress":
        return <Badge variant="secondary">Sedang Diperiksa</Badge>;
      case "Completed":
        return <Badge variant="default">Selesai</Badge>;
      case "Cancelled":
        return <Badge variant="destructive">Dibatalkan</Badge>;
      case "Not Started":
        return (
          <Badge variant="outline" className="bg-gray-100">
            Belum Check-in
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return "Belum pernah diperbarui";

    return formatTime(date);
  };

  const nextEligiblePatientId =
    currentPatient === null ? queuePatients[0]?.id ?? null : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {lastEmergency && (
        <EmergencyNotification
          show={true}
          patientName={lastEmergency.patientName}
          queueNumber={lastEmergency.queueNumber}
          onClose={dismissLatest}
        />
      )}
      <PageHeader
        title="Antrian Pasien"
        description="Kelola antrian pasien hari ini"
      >
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/doctor/medical-records">
              <FileText className="mr-2 h-4 w-4" />
              Rekam Medis
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchQueueData()}
            disabled={refreshing || updatingReservationId !== null}
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Muat Ulang
          </Button>
          <div className="flex items-center gap-2 rounded-md border px-3 py-2">
            <span className="text-sm text-muted-foreground">Auto refresh</span>
            <Switch
              checked={autoRefreshEnabled}
              onCheckedChange={setAutoRefreshEnabled}
            />
          </div>
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          Terakhir diperbarui: {formatLastUpdated(lastUpdatedAt)}
        </p>
        {autoRefreshEnabled ? (
          <p className="text-muted-foreground">
            Auto refresh aktif setiap 30 detik. Akan berhenti saat dialog detail
            terbuka.
          </p>
        ) : (
          <p className="text-muted-foreground">
            Auto refresh dimatikan agar tidak mengganggu pemeriksaan.
          </p>
        )}
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        Pasien hanya dapat mulai diperiksa sesuai giliran aktif. Jika ada kasus
        darurat, pasien tersebut harus dijadikan prioritas dan ditempatkan di
        nomor antrian paling depan terlebih dahulu.
      </div>

      {/* Current Patient Card */}
      <Card className={currentPatient ? "border-primary" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {currentPatient ? "Pasien Saat Ini" : "Tidak Ada Pasien Aktif"}
          </CardTitle>
          {currentPatient && (
            <CardDescription>
              Sedang diperiksa sejak{" "}
              {formatTime(currentPatient.reservationDate)}
            </CardDescription>
          )}
          {currentPatient && currentPatient.isPriority && (
            <div className="bg-red-50 border border-red-300 rounded-md p-3 mb-4 animate-pulse">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <div className="font-medium">Kasus Darurat!</div>
              </div>
              {currentPatient.priorityReason && (
                <p className="text-sm text-red-700 mt-1">
                  Alasan: {currentPatient.priorityReason}
                </p>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {currentPatient ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xl font-semibold">
                    {currentPatient.patientName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Nomor Antrian: {currentPatient.queueNumber}
                  </div>
                </div>
                <div>{getStatusBadge(currentPatient.examinationStatus)}</div>
              </div>

              <div className="border rounded-md p-3 bg-muted/50">
                <div className="text-sm font-medium">Keluhan:</div>
                <p className="text-sm mt-1">
                  {currentPatient.complaint || "Tidak ada informasi keluhan"}
                </p>
              </div>

              <div className="flex justify-between items-center gap-4">
                <Button asChild className="flex-1">
                  <Link
                    href={`/dashboard/doctor/medical-records/create?patientId=${currentPatient.patientId}&reservationId=${currentPatient.id}`}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {currentPatient.hasMedicalRecord
                      ? "Lanjutkan Rekam Medis"
                      : "Isi Rekam Medis"}
                  </Link>
                </Button>
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Pemeriksaan tidak dapat diselesaikan langsung dari antrian.
                Simpan rekam medis terlebih dahulu, lalu status pasien akan
                dipindahkan otomatis ke tahap pembayaran.
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Tidak ada pasien yang sedang diperiksa saat ini
              </p>
              {queuePatients.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Mulai pemeriksaan untuk pasien berikutnya dari daftar antrian
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waiting Patients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Daftar Antrian
          </CardTitle>
          <CardDescription>
            {queuePatients.length} pasien sedang menunggu
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">No.</TableHead>
                <TableHead>Pasien</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queuePatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    <p className="text-muted-foreground">
                      Tidak ada pasien dalam antrian
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                queuePatients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className={cn(
                      patient.isPriority
                        ? "bg-red-50 border-l-4 border-l-red-500"
                        : ""
                    )}
                  >
                    <TableCell className="font-medium">
                      {patient.queueNumber}
                      {patient.isPriority && (
                        <Badge
                          variant="destructive"
                          className="ml-2 animate-pulse"
                        >
                          Darurat
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>{patient.patientName}</div>
                      {patient.lastVisitDate && (
                        <div className="text-xs text-muted-foreground">
                          Kunjungan terakhir:{" "}
                          {formatDate(patient.lastVisitDate)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(patient.examinationStatus)}
                    </TableCell>
                    <TableCell>
                      {patient.checkedInAt
                        ? formatTime(patient.checkedInAt)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setIsPatientDetailOpen(true);
                          }}
                        >
                          Detail
                        </Button>
                        {patient.examinationStatus === "Waiting" && (
                          <Button
                            variant="default"
                            size="sm"
                            disabled={
                              updatingReservationId === patient.id ||
                              currentPatient !== null ||
                              nextEligiblePatientId !== patient.id
                            }
                            onClick={() =>
                              void handleUpdateStatus(patient.id, "In Progress")
                            }
                          >
                            {updatingReservationId === patient.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <PlayCircle className="h-4 w-4 mr-1" />
                            )}
                            Mulai Periksa
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Patient Detail Dialog */}
      <Dialog open={isPatientDetailOpen} onOpenChange={setIsPatientDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Pasien</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedPatient.patientName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Nomor Antrian: {selectedPatient.queueNumber}
                  </p>
                </div>
                <div>{getStatusBadge(selectedPatient.examinationStatus)}</div>
              </div>

              <div className="border rounded-md p-3 bg-muted/50">
                <div className="text-sm font-medium">Keluhan:</div>
                <p className="text-sm mt-1">
                  {selectedPatient.complaint || "Tidak ada informasi keluhan"}
                </p>
              </div>

              {selectedPatient.lastVisitDate && (
                <div className="border rounded-md p-3">
                  <div className="text-sm font-medium">Kunjungan Terakhir:</div>
                  <p className="text-sm mt-1">
                    {formatDate(selectedPatient.lastVisitDate)}
                  </p>
                </div>
              )}

              {selectedPatient.examinationStatus === "Waiting" &&
                (currentPatient !== null ||
                  nextEligiblePatientId !== selectedPatient.id) && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {currentPatient !== null
                      ? "Masih ada pasien lain yang sedang diperiksa. Selesaikan pemeriksaan aktif terlebih dahulu."
                      : "Pasien ini belum menjadi giliran berikutnya untuk diperiksa."}
                  </div>
                )}
            </div>
          )}
          <DialogFooter>
            {selectedPatient &&
              selectedPatient.examinationStatus === "Waiting" && (
                <Button
                  disabled={
                    updatingReservationId === selectedPatient.id ||
                    currentPatient !== null ||
                    nextEligiblePatientId !== selectedPatient.id
                  }
                  onClick={() => {
                    void handleUpdateStatus(
                      selectedPatient.id,
                      "In Progress"
                    );
                    setIsPatientDetailOpen(false);
                  }}
                >
                  {updatingReservationId === selectedPatient.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PlayCircle className="mr-2 h-4 w-4" />
                  )}
                  Mulai Pemeriksaan
                </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
