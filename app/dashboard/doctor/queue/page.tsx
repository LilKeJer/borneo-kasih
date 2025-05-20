// app/dashboard/doctor/queue/page.tsx
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
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
  CheckSquare,
  AlertTriangle,
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
}

export default function DoctorQueuePage() {
  const [loading, setLoading] = useState(true);
  const [queuePatients, setQueuePatients] = useState<Patient[]>([]);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [isPatientDetailOpen, setIsPatientDetailOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const { lastEmergency, dismissLatest } = useEmergencyPolling();

  useEffect(() => {
    fetchQueueData();

    // Set interval to refresh data every 30 seconds
    const intervalId = setInterval(() => {
      fetchQueueData();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const fetchQueueData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/doctor/queue`);
      if (!response.ok) {
        throw new Error("Failed to fetch queue data");
      }
      const data = await response.json();
      console.log(data);
      setQueuePatients(data.waitingPatients || []);
      setCurrentPatient(data.currentPatient || null);
    } catch (error) {
      console.error("Error fetching queue:", error);
      toast.error("Gagal memuat data antrian");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    reservationId: number,
    newStatus: string
  ) => {
    try {
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
      fetchQueueData(); // Refresh data
    } catch (error) {
      console.error("Error updating queue status:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal mengupdate status"
      );
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

  const formatTime = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
      />

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
                <Button asChild variant="outline" className="flex-1">
                  <Link
                    href={`/dashboard/doctor/medical-records/create?patientId=${currentPatient.patientId}`}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Buat Rekam Medis
                  </Link>
                </Button>

                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() =>
                    handleUpdateStatus(currentPatient.id, "Completed")
                  }
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Selesai Pemeriksaan
                </Button>
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
                          {new Date(patient.lastVisitDate).toLocaleDateString(
                            "id-ID"
                          )}
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
                            onClick={() =>
                              handleUpdateStatus(patient.id, "In Progress")
                            }
                          >
                            <PlayCircle className="h-4 w-4 mr-1" />
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
                    {new Date(selectedPatient.lastVisitDate).toLocaleDateString(
                      "id-ID"
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedPatient &&
              selectedPatient.examinationStatus === "Waiting" && (
                <Button
                  onClick={() => {
                    handleUpdateStatus(selectedPatient.id, "In Progress");
                    setIsPatientDetailOpen(false);
                  }}
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Mulai Pemeriksaan
                </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
