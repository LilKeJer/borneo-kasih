// app/dashboard/patient/appointments/page.tsx
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

import { Plus, MoreVertical, Calendar, X, Loader2 } from "lucide-react";

interface Appointment {
  id: string;
  doctor: string;
  date: string;
  queueNumber: number;
  status: string;
  examinationStatus: string;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/patients/appointments");

      if (!response.ok) {
        throw new Error("Gagal memuat data janji temu");
      }

      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Gagal memuat data janji temu");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedAppointment) return;

    try {
      setIsProcessing(true);
      const response = await fetch(
        `/api/appointments/${selectedAppointment.id}/cancel`,
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal membatalkan janji temu");
      }

      toast.success("Janji temu berhasil dibatalkan");
      fetchAppointments(); // Refresh data
      setIsCancelDialogOpen(false);
      setSelectedAppointment(null);
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal membatalkan janji temu"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckIn = async (appointment: Appointment) => {
    try {
      setIsProcessing(true);
      const response = await fetch("/api/queue/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationId: appointment.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal melakukan check-in");
      }

      toast.success("Check-in berhasil");
      fetchAppointments();
    } catch (error) {
      console.error("Error checking in:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal melakukan check-in"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <Badge variant="outline">Menunggu Konfirmasi</Badge>;
      case "Confirmed":
        return <Badge variant="secondary">Terkonfirmasi</Badge>;
      case "Completed":
        return <Badge variant="default">Selesai</Badge>;
      case "Cancelled":
        return <Badge variant="destructive">Dibatalkan</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const canModifyAppointment = (status: string) => {
    return status === "Pending";
  };

  const canCheckInAppointment = (
    status: string,
    examinationStatus?: string | null
  ) => {
    if (!["Pending", "Confirmed"].includes(status)) {
      return false;
    }

    const blockedExamStatuses = new Set([
      "In Progress",
      "Waiting for Payment",
      "Completed",
      "Cancelled",
    ]);

    return !blockedExamStatuses.has(examinationStatus || "Not Started");
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Janji Temu"
        description="Kelola janji temu dengan dokter"
      >
        <Button asChild>
          <Link href="/dashboard/patient/appointments/new">
            <Plus className="mr-2 h-4 w-4" />
            Buat Janji Temu
          </Link>
        </Button>
      </PageHeader>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Dokter</TableHead>
              <TableHead>No. Antrian</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Memuat data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  Belum ada janji temu
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    <div>
                      <div>{formatDateTime(appointment.date).date}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(appointment.date).time}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{appointment.doctor}</TableCell>
                  <TableCell>{appointment.queueNumber}</TableCell>
                  <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                  <TableCell className="text-right">
                    {canModifyAppointment(appointment.status) ||
                    canCheckInAppointment(
                      appointment.status,
                      appointment.examinationStatus
                    ) ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={isProcessing}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/dashboard/patient/appointments/${appointment.id}`}
                            >
                              Lihat Detail
                            </Link>
                          </DropdownMenuItem>
                          {canCheckInAppointment(
                            appointment.status,
                            appointment.examinationStatus
                          ) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleCheckIn(appointment)}
                              >
                                Check-in
                              </DropdownMenuItem>
                            </>
                          )}
                          {canModifyAppointment(appointment.status) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/patient/appointments/${appointment.id}/reschedule`}
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  Ubah Jadwal
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setIsCancelDialogOpen(true);
                                }}
                              >
                                <X className="mr-2 h-4 w-4" />
                                Batalkan
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-sm text-muted-foreground px-2">
                        Tidak tersedia
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan Janji Temu</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin membatalkan janji temu ini?
              {selectedAppointment && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <div className="font-medium">Tanggal:</div>
                    <div>
                      {selectedAppointment.date
                        ? formatDateTime(selectedAppointment.date).date
                        : "-"}
                    </div>
                    <div className="font-medium">Waktu:</div>
                    <div>
                      {selectedAppointment.date
                        ? formatDateTime(selectedAppointment.date).time
                        : "-"}
                    </div>
                    <div className="font-medium">Dokter:</div>
                    <div>{selectedAppointment.doctor}</div>
                    <div className="font-medium">No. Antrian:</div>
                    <div>{selectedAppointment.queueNumber}</div>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCancelDialogOpen(false)}
              disabled={isProcessing}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Ya, Batalkan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
