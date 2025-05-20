// app/dashboard/receptionist/queue/page.tsx
"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import {
  ClipboardList,
  Search,
  Loader2,
  UserCheck,
  PlayCircle,
  CheckSquare,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { UserPlus, AlertTriangle } from "lucide-react";
import { PriorityToggle } from "@/components/receptionist/priority-toggle";
import { useEmergencyPolling } from "@/hooks/use-emergency-polling";
import { EmergencyNotification } from "@/components/receptionist/emergency-notification";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
}

interface DoctorQueue {
  doctorId: string;
  doctorName: string;
  queues: Patient[];
}

export default function QueueManagementPage() {
  const [loading, setLoading] = useState(true);
  const [doctorQueues, setDoctorQueues] = useState<DoctorQueue[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false);
  const [reservationIdToCheckIn, setReservationIdToCheckIn] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const { emergencyPatients, lastEmergency, dismissLatest } =
    useEmergencyPolling();
  useEffect(() => {
    fetchQueueData();
  }, [selectedDate]);

  const fetchQueueData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/queue/date?date=${selectedDate}`);
      if (!response.ok) {
        throw new Error("Failed to fetch queue data");
      }
      const data = await response.json();
      setDoctorQueues(data.data || []);
    } catch (error) {
      console.error("Error fetching queue:", error);
      toast.error("Gagal memuat data antrian");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!reservationIdToCheckIn) return;

    try {
      setIsProcessing(true);
      const response = await fetch("/api/queue/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationId: parseInt(reservationIdToCheckIn),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal melakukan check-in");
      }

      toast.success("Check-in pasien berhasil");
      fetchQueueData(); // Refresh data
      setIsCheckInDialogOpen(false);
    } catch (error) {
      console.error("Error checking in patient:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal melakukan check-in"
      );
    } finally {
      setIsProcessing(false);
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

  // Format tanggal untuk tampilan
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Navigasi tanggal
  const goToNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const goToPreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  };

  // Filter queue dari pencarian
  const filteredQueues = doctorQueues.map((doctorQueue) => {
    const filteredPatients = doctorQueue.queues.filter(
      (patient) =>
        patient.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.queueNumber.toString().includes(searchTerm)
    );

    return {
      ...doctorQueue,
      queues: filteredPatients,
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isToday = new Date().toISOString().split("T")[0] === selectedDate;

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

      <PageHeader title="Manajemen Antrian" description="Kelola antrian pasien">
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/receptionist/walk-in">
              <UserPlus className="mr-2 h-4 w-4" />
              Pendaftaran Walk-in
            </Link>
          </Button>
          <Button onClick={() => setIsCheckInDialogOpen(true)}>
            <UserCheck className="mr-2 h-4 w-4" />
            Check-in Pasien
          </Button>
        </div>
      </PageHeader>

      {/* Date Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">Tanggal Antrian</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant={isToday ? "default" : "outline"}
                size="sm"
                onClick={goToToday}
              >
                Hari Ini
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari pasien atau nomor antrian..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="ml-2" onClick={fetchQueueData}>
          Refresh
        </Button>
      </div>
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">Semua Antrian</TabsTrigger>
          <TabsTrigger value="emergency" className="relative">
            Kasus Darurat
            {emergencyPatients.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {emergencyPatients.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="grid grid-cols-1 gap-6">
            {filteredQueues.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Tidak ada antrian yang tersedia untuk tanggal{" "}
                    {formatDate(selectedDate)}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredQueues.map((doctorQueue) => (
                <Card key={doctorQueue.doctorId}>
                  <CardHeader>
                    <CardTitle>{doctorQueue.doctorName}</CardTitle>
                    <CardDescription>
                      {doctorQueue.queues.length} pasien dalam antrian
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">No.</TableHead>
                          <TableHead>Pasien</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Check-in</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {doctorQueue.queues.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">
                              Tidak ada pasien dalam antrian
                            </TableCell>
                          </TableRow>
                        ) : (
                          doctorQueue.queues.map((patient) => (
                            <TableRow
                              key={patient.id}
                              className={cn(
                                "border-b border-gray-100",
                                patient.isPriority
                                  ? "bg-red-50 border-l-4 border-l-red-500"
                                  : ""
                              )}
                            >
                              <TableCell className="font-medium">
                                {patient.queueNumber}
                                {patient.isPriority && (
                                  <Badge variant="destructive" className="ml-2">
                                    Darurat
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{patient.patientName}</TableCell>
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
                                  {patient.examinationStatus ===
                                    "Not Started" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setReservationIdToCheckIn(
                                          patient.id.toString()
                                        );
                                        setIsCheckInDialogOpen(true);
                                      }}
                                    >
                                      <UserCheck className="h-4 w-4 mr-1" />
                                      Check-in
                                    </Button>
                                  )}
                                  {patient.examinationStatus === "Waiting" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleUpdateStatus(
                                          patient.id,
                                          "In Progress"
                                        )
                                      }
                                    >
                                      <PlayCircle className="h-4 w-4 mr-1" />
                                      Mulai Periksa
                                    </Button>
                                  )}
                                  {patient.examinationStatus ===
                                    "In Progress" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleUpdateStatus(
                                          patient.id,
                                          "Completed"
                                        )
                                      }
                                    >
                                      <CheckSquare className="h-4 w-4 mr-1" />
                                      Selesai
                                    </Button>
                                  )}
                                  <PriorityToggle
                                    reservationId={patient.id.toString()}
                                    isPriority={patient.isPriority}
                                    onStatusChange={() => fetchQueueData()}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="emergency">
          {emergencyPatients.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Tidak ada kasus darurat saat ini
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {emergencyPatients.map((patient) => (
                <Card key={patient.id} className="border-red-500 bg-red-50">
                  <CardHeader className="bg-red-100">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span>Kasus Darurat</span>
                      </div>
                      <Badge variant="destructive" className="animate-pulse">
                        Prioritas
                      </Badge>
                    </CardTitle>
                    {patient.priorityReason && (
                      <CardDescription className="text-red-700">
                        Alasan: {patient.priorityReason}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Pasien</p>
                        <p className="font-medium">{patient.patientName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Nomor Antrian
                        </p>
                        <p className="font-medium">{patient.queueNumber}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <PriorityToggle
                        reservationId={patient.id.toString()}
                        isPriority={true}
                        onStatusChange={() => fetchQueueData()}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Check-in Dialog */}
      <Dialog open={isCheckInDialogOpen} onOpenChange={setIsCheckInDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check-in Pasien</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reservation-id">ID Reservasi</Label>
              <Input
                id="reservation-id"
                placeholder="Masukkan ID reservasi"
                value={reservationIdToCheckIn}
                onChange={(e) => setReservationIdToCheckIn(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCheckInDialogOpen(false)}
              disabled={isProcessing}
            >
              Batal
            </Button>
            <Button onClick={handleCheckIn} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Check-in"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
