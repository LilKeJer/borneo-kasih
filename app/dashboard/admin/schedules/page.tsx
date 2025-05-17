// app/dashboard/admin/schedules/page.tsx
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Calendar,
  Plus,
  MoreHorizontal,
  Edit,
  Trash,
  Loader2,
  Clock,
  User,
  Search,
} from "lucide-react";

interface Doctor {
  id: number;
  name: string;
  specialization: string | null;
}

interface PracticeSession {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  description: string | null;
}

interface DoctorSchedule {
  id: number;
  doctorId: number;
  doctorName: string;
  sessionId: number;
  sessionName: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  maxPatients: number;
  isActive: boolean;
}

export default function DoctorSchedulesPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>(
    []
  );
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] =
    useState<DoctorSchedule | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Dialog sesi
  const [isAddSessionDialogOpen, setIsAddSessionDialogOpen] = useState(false);
  const [isEditSessionDialogOpen, setIsEditSessionDialogOpen] = useState(false);
  const [isDeleteSessionDialogOpen, setIsDeleteSessionDialogOpen] =
    useState(false);
  const [selectedSession, setSelectedSession] =
    useState<PracticeSession | null>(null);

  // Form state
  const [newSchedule, setNewSchedule] = useState({
    doctorId: "",
    sessionId: "",
    dayOfWeek: "",
    maxPatients: "30",
  });

  const [editSchedule, setEditSchedule] = useState({
    maxPatients: "",
    isActive: true,
  });

  // Form sesi
  const [sessionForm, setSessionForm] = useState({
    name: "",
    startTime: "",
    endTime: "",
    description: "",
  });

  // Tab state untuk navigasi antara jadwal dan sesi
  const [activeTab, setActiveTab] = useState("schedules");

  useEffect(() => {
    fetchDoctors();
    fetchPracticeSessions();
    fetchSchedules();
  }, []);

  const fetchDoctors = async () => {
    try {
      const response = await fetch("/api/doctors");
      if (!response.ok) throw new Error("Failed to fetch doctors");
      const data = await response.json();
      setDoctors(data);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      toast.error("Gagal memuat data dokter");
    }
  };

  const fetchPracticeSessions = async () => {
    try {
      const response = await fetch("/api/practice-sessions");
      if (!response.ok) throw new Error("Failed to fetch practice sessions");
      const data = await response.json();
      setPracticeSessions(data);
    } catch (error) {
      console.error("Error fetching practice sessions:", error);
      toast.error("Gagal memuat data sesi praktik");
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/doctor-schedules");
      if (!response.ok) throw new Error("Failed to fetch doctor schedules");
      const data = await response.json();
      setSchedules(data);
    } catch (error) {
      console.error("Error fetching doctor schedules:", error);
      toast.error("Gagal memuat data jadwal dokter");
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk jadwal dokter
  const handleAddSchedule = async () => {
    if (
      !newSchedule.doctorId ||
      !newSchedule.sessionId ||
      !newSchedule.dayOfWeek
    ) {
      toast.error("Dokter, sesi, dan hari wajib diisi");
      return;
    }

    try {
      setIsProcessing(true);
      const response = await fetch("/api/doctor-schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorId: parseInt(newSchedule.doctorId),
          sessionId: parseInt(newSchedule.sessionId),
          dayOfWeek: parseInt(newSchedule.dayOfWeek),
          maxPatients: parseInt(newSchedule.maxPatients) || 30,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal menambahkan jadwal");
      }

      toast.success("Jadwal berhasil ditambahkan");
      fetchSchedules();
      setIsAddDialogOpen(false);
      // Reset form
      setNewSchedule({
        doctorId: "",
        sessionId: "",
        dayOfWeek: "",
        maxPatients: "30",
      });
    } catch (error) {
      console.error("Error adding schedule:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal menambahkan jadwal"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditSchedule = async () => {
    if (!selectedSchedule) return;

    try {
      setIsProcessing(true);
      const response = await fetch(
        `/api/doctor-schedules/${selectedSchedule.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            maxPatients:
              parseInt(editSchedule.maxPatients) ||
              selectedSchedule.maxPatients,
            isActive: editSchedule.isActive,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal mengupdate jadwal");
      }

      toast.success("Jadwal berhasil diperbarui");
      fetchSchedules();
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating schedule:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal mengupdate jadwal"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!selectedSchedule) return;

    try {
      setIsProcessing(true);
      const response = await fetch(
        `/api/doctor-schedules/${selectedSchedule.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal menghapus jadwal");
      }

      toast.success("Jadwal berhasil dihapus");
      fetchSchedules();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal menghapus jadwal"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Fungsi untuk manajemen sesi
  const handleAddSession = async () => {
    if (!sessionForm.name || !sessionForm.startTime || !sessionForm.endTime) {
      toast.error("Nama, waktu mulai, dan waktu selesai wajib diisi");
      return;
    }

    try {
      setIsProcessing(true);
      const response = await fetch("/api/practice-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal menambahkan sesi");
      }

      toast.success("Sesi berhasil ditambahkan");
      fetchPracticeSessions();
      setIsAddSessionDialogOpen(false);
      // Reset form
      setSessionForm({
        name: "",
        startTime: "",
        endTime: "",
        description: "",
      });
    } catch (error) {
      console.error("Error adding session:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal menambahkan sesi"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditSession = async () => {
    if (!selectedSession) return;

    try {
      setIsProcessing(true);
      const response = await fetch(
        `/api/practice-sessions/${selectedSession.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sessionForm),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal mengupdate sesi");
      }

      toast.success("Sesi berhasil diperbarui");
      fetchPracticeSessions();
      setIsEditSessionDialogOpen(false);
    } catch (error) {
      console.error("Error updating session:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal mengupdate sesi"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedSession) return;

    try {
      setIsProcessing(true);
      const response = await fetch(
        `/api/practice-sessions/${selectedSession.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal menghapus sesi");
      }

      toast.success("Sesi berhasil dihapus");
      fetchPracticeSessions();
      setIsDeleteSessionDialogOpen(false);
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal menghapus sesi"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper functions
  const getDayName = (dayOfWeek: number) => {
    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    return days[dayOfWeek];
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Grouping schedules by doctor
  const filterAndGroupSchedules = () => {
    const filteredSchedules = schedules.filter(
      (schedule) =>
        schedule.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getDayName(schedule.dayOfWeek)
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    );

    // Group by doctorId
    return Object.values(
      filteredSchedules.reduce((groups, schedule) => {
        const key = schedule.doctorId;
        if (!groups[key]) {
          groups[key] = {
            doctorId: schedule.doctorId,
            doctorName: schedule.doctorName,
            schedules: [],
          };
        }
        groups[key].schedules.push(schedule);
        return groups;
      }, {} as Record<number, { doctorId: number; doctorName: string; schedules: DoctorSchedule[] }>)
    );
  };

  const groupedSchedules = filterAndGroupSchedules();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Jadwal"
        description="Kelola jadwal praktik dokter dan sesi praktik"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="schedules">
            <Calendar className="h-4 w-4 mr-2" />
            Jadwal Dokter
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Clock className="h-4 w-4 mr-2" />
            Sesi Praktik
          </TabsTrigger>
        </TabsList>

        {/* Tab Jadwal Dokter */}
        <TabsContent value="schedules" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari dokter atau hari..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 ml-2">
              <Button variant="outline" onClick={fetchSchedules}>
                Refresh
              </Button>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Jadwal
              </Button>
            </div>
          </div>

          {groupedSchedules.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Tidak ada jadwal dokter yang tersedia
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {groupedSchedules.map((group) => (
                <Card key={group.doctorId}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      {group.doctorName}
                    </CardTitle>
                    <CardDescription>
                      {group.schedules.length} jadwal praktik
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hari</TableHead>
                          <TableHead>Sesi</TableHead>
                          <TableHead>Jam</TableHead>
                          <TableHead>Kapasitas</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.schedules.map((schedule) => (
                          <TableRow key={schedule.id}>
                            <TableCell>
                              <div className="font-medium">
                                {getDayName(schedule.dayOfWeek)}
                              </div>
                            </TableCell>
                            <TableCell>{schedule.sessionName}</TableCell>
                            <TableCell>
                              {formatTime(schedule.startTime)} -{" "}
                              {formatTime(schedule.endTime)}
                            </TableCell>
                            <TableCell>{schedule.maxPatients} pasien</TableCell>
                            <TableCell>
                              {schedule.isActive ? (
                                <Badge variant="secondary">Aktif</Badge>
                              ) : (
                                <Badge variant="outline">Tidak Aktif</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedSchedule(schedule);
                                      setEditSchedule({
                                        maxPatients:
                                          schedule.maxPatients.toString(),
                                        isActive: schedule.isActive,
                                      });
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedSchedule(schedule);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    className="text-destructive"
                                  >
                                    <Trash className="mr-2 h-4 w-4" />
                                    Hapus
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab Sesi Praktik */}
        <TabsContent value="sessions" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Daftar Sesi Praktik</h2>
            <Button onClick={() => setIsAddSessionDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Sesi
            </Button>
          </div>

          {practiceSessions.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Tidak ada sesi praktik yang tersedia
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Sesi</TableHead>
                      <TableHead>Waktu Mulai</TableHead>
                      <TableHead>Waktu Selesai</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {practiceSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div className="font-medium">{session.name}</div>
                        </TableCell>
                        <TableCell>{formatTime(session.startTime)}</TableCell>
                        <TableCell>{formatTime(session.endTime)}</TableCell>
                        <TableCell>{session.description || "-"}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSession(session);

                                  // Persiapkan form dengan data yang benar
                                  const startDate = new Date(session.startTime);
                                  const endDate = new Date(session.endTime);

                                  setSessionForm({
                                    name: session.name,
                                    startTime: startDate.toISOString(),
                                    endTime: endDate.toISOString(),
                                    description: session.description || "",
                                  });

                                  setIsEditSessionDialogOpen(true);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSession(session);
                                  setIsDeleteSessionDialogOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog untuk Jadwal Dokter */}
      {/* Add Schedule Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Jadwal Dokter</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doctor">Dokter</Label>
              <Select
                value={newSchedule.doctorId}
                onValueChange={(value) =>
                  setNewSchedule({ ...newSchedule, doctorId: value })
                }
              >
                <SelectTrigger id="doctor">
                  <SelectValue placeholder="Pilih dokter" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id.toString()}>
                      {doctor.name}{" "}
                      {doctor.specialization
                        ? `(${doctor.specialization})`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session">Sesi Praktik</Label>
              <Select
                value={newSchedule.sessionId}
                onValueChange={(value) =>
                  setNewSchedule({ ...newSchedule, sessionId: value })
                }
              >
                <SelectTrigger id="session">
                  <SelectValue placeholder="Pilih sesi" />
                </SelectTrigger>
                <SelectContent>
                  {practiceSessions.map((session) => (
                    <SelectItem key={session.id} value={session.id.toString()}>
                      {session.name} ({formatTime(session.startTime)} -{" "}
                      {formatTime(session.endTime)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="day">Hari</Label>
              <Select
                value={newSchedule.dayOfWeek}
                onValueChange={(value) =>
                  setNewSchedule({ ...newSchedule, dayOfWeek: value })
                }
              >
                <SelectTrigger id="day">
                  <SelectValue placeholder="Pilih hari" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Minggu</SelectItem>
                  <SelectItem value="1">Senin</SelectItem>
                  <SelectItem value="2">Selasa</SelectItem>
                  <SelectItem value="3">Rabu</SelectItem>
                  <SelectItem value="4">Kamis</SelectItem>
                  <SelectItem value="5">Jumat</SelectItem>
                  <SelectItem value="6">Sabtu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-patients">Kapasitas Maksimal</Label>
              <Input
                id="max-patients"
                type="number"
                value={newSchedule.maxPatients}
                onChange={(e) =>
                  setNewSchedule({
                    ...newSchedule,
                    maxPatients: e.target.value,
                  })
                }
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isProcessing}
            >
              Batal
            </Button>
            <Button onClick={handleAddSchedule} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Jadwal Dokter</DialogTitle>
          </DialogHeader>
          {selectedSchedule && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-muted p-3 rounded-md">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Dokter
                  </Label>
                  <p>{selectedSchedule.doctorName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Hari</Label>
                  <p>{getDayName(selectedSchedule.dayOfWeek)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Sesi</Label>
                  <p>{selectedSchedule.sessionName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Jam</Label>
                  <p>
                    {formatTime(selectedSchedule.startTime)} -{" "}
                    {formatTime(selectedSchedule.endTime)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-max-patients">Kapasitas Maksimal</Label>
                <Input
                  id="edit-max-patients"
                  type="number"
                  value={editSchedule.maxPatients}
                  onChange={(e) =>
                    setEditSchedule({
                      ...editSchedule,
                      maxPatients: e.target.value,
                    })
                  }
                  min="1"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="status">Status Aktif</Label>
                <Switch
                  id="status"
                  checked={editSchedule.isActive}
                  onCheckedChange={(checked) =>
                    setEditSchedule({ ...editSchedule, isActive: checked })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isProcessing}
            >
              Batal
            </Button>
            <Button onClick={handleEditSchedule} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Schedule Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Jadwal</DialogTitle>
          </DialogHeader>
          {selectedSchedule && (
            <div className="py-4">
              <p>
                Apakah Anda yakin ingin menghapus jadwal untuk{" "}
                <span className="font-semibold">
                  {selectedSchedule.doctorName}
                </span>{" "}
                pada hari{" "}
                <span className="font-semibold">
                  {getDayName(selectedSchedule.dayOfWeek)}
                </span>{" "}
                sesi{" "}
                <span className="font-semibold">
                  {selectedSchedule.sessionName}
                </span>
                ?
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isProcessing}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSchedule}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                "Hapus"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog untuk Sesi Praktik */}
      {/* Add Session Dialog */}
      <Dialog
        open={isAddSessionDialogOpen}
        onOpenChange={setIsAddSessionDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Sesi Praktik</DialogTitle>
            <DialogDescription>
              Buat sesi praktik baru dengan waktu yang fleksibel
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-name">Nama Sesi</Label>
              <Input
                id="session-name"
                value={sessionForm.name}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, name: e.target.value })
                }
                placeholder="Contoh: Pagi, Siang, Malam"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-time">Waktu Mulai</Label>
              <Input
                id="start-time"
                type="time"
                value={
                  sessionForm.startTime
                    ? new Date(sessionForm.startTime).toLocaleTimeString(
                        "en-GB",
                        { hour: "2-digit", minute: "2-digit" }
                      )
                    : ""
                }
                onChange={(e) => {
                  const timeString = e.target.value;
                  // Buat tanggal baru dengan waktu yang diinput
                  const dateObj = new Date();
                  const [hours, minutes] = timeString.split(":");
                  dateObj.setHours(parseInt(hours || "0", 10));
                  dateObj.setMinutes(parseInt(minutes || "0", 10));
                  dateObj.setSeconds(0);
                  dateObj.setMilliseconds(0);

                  setSessionForm({
                    ...sessionForm,
                    startTime: dateObj.toISOString(),
                  });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time">Waktu Selesai</Label>
              <Input
                id="end-time"
                type="time"
                value={
                  sessionForm.endTime
                    ? new Date(sessionForm.endTime).toLocaleTimeString(
                        "en-GB",
                        { hour: "2-digit", minute: "2-digit" }
                      )
                    : ""
                }
                onChange={(e) => {
                  const timeString = e.target.value;
                  // Buat tanggal baru dengan waktu yang diinput
                  const dateObj = new Date();
                  const [hours, minutes] = timeString.split(":");
                  dateObj.setHours(parseInt(hours || "0", 10));
                  dateObj.setMinutes(parseInt(minutes || "0", 10));
                  dateObj.setSeconds(0);
                  dateObj.setMilliseconds(0);

                  setSessionForm({
                    ...sessionForm,
                    endTime: dateObj.toISOString(),
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Input
                id="description"
                value={sessionForm.description}
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    description: e.target.value,
                  })
                }
                placeholder="Deskripsi sesi praktik"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddSessionDialogOpen(false)}
              disabled={isProcessing}
            >
              Batal
            </Button>
            <Button onClick={handleAddSession} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Session Dialog */}
      <Dialog
        open={isEditSessionDialogOpen}
        onOpenChange={setIsEditSessionDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sesi Praktik</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-session-name">Nama Sesi</Label>
              <Input
                id="edit-session-name"
                value={sessionForm.name}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-start-time">Waktu Mulai</Label>
              <Input
                id="edit-start-time"
                type="time"
                value={
                  sessionForm.startTime
                    ? new Date(sessionForm.startTime).toLocaleTimeString(
                        "en-GB",
                        { hour: "2-digit", minute: "2-digit" }
                      )
                    : ""
                }
                onChange={(e) => {
                  const timeString = e.target.value;
                  // Buat tanggal baru dengan waktu yang diinput
                  const dateObj = new Date();
                  const [hours, minutes] = timeString.split(":");
                  dateObj.setHours(parseInt(hours || "0", 10));
                  dateObj.setMinutes(parseInt(minutes || "0", 10));
                  dateObj.setSeconds(0);
                  dateObj.setMilliseconds(0);

                  setSessionForm({
                    ...sessionForm,
                    startTime: dateObj.toISOString(),
                  });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-end-time">Waktu Selesai</Label>
              <Input
                id="edit-end-time"
                type="time"
                value={
                  sessionForm.endTime
                    ? new Date(sessionForm.endTime).toLocaleTimeString(
                        "en-GB",
                        { hour: "2-digit", minute: "2-digit" }
                      )
                    : ""
                }
                onChange={(e) => {
                  const timeString = e.target.value;
                  // Buat tanggal baru dengan waktu yang diinput
                  const dateObj = new Date();
                  const [hours, minutes] = timeString.split(":");
                  dateObj.setHours(parseInt(hours || "0", 10));
                  dateObj.setMinutes(parseInt(minutes || "0", 10));
                  dateObj.setSeconds(0);
                  dateObj.setMilliseconds(0);

                  setSessionForm({
                    ...sessionForm,
                    endTime: dateObj.toISOString(),
                  });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Deskripsi (Opsional)</Label>
              <Input
                id="edit-description"
                value={sessionForm.description}
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    description: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditSessionDialogOpen(false)}
              disabled={isProcessing}
            >
              Batal
            </Button>
            <Button onClick={handleEditSession} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Session Dialog */}
      <Dialog
        open={isDeleteSessionDialogOpen}
        onOpenChange={setIsDeleteSessionDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Sesi Praktik</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="py-4">
              <p>
                Apakah Anda yakin ingin menghapus sesi praktik{" "}
                <span className="font-semibold">{selectedSession.name}</span>?
              </p>
              <p className="text-sm text-destructive mt-2">
                Perhatian: Menghapus sesi ini juga akan menghapus semua jadwal
                dokter yang menggunakan sesi ini.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteSessionDialogOpen(false)}
              disabled={isProcessing}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSession}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                "Hapus"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
