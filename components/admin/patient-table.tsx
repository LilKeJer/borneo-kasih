"use client";

import { useState, useEffect, useCallback } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Check,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  UserRoundX,
  UserRoundCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/date";

interface Patient {
  id: string;
  username: string;
  name: string;
  nik: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  gender: string;
  status: string;
  createdAt: string;
}

interface PatientTableProps {
  onUpdate?: () => void;
}

interface PatientFormValues {
  name: string;
  email: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  gender: string;
}

const statusLabels: Record<string, string> = {
  Pending: "Menunggu Verifikasi",
  Verified: "Terverifikasi",
  Active: "Aktif",
  Inactive: "Nonaktif",
  Suspended: "Ditangguhkan",
  Rejected: "Ditolak",
};

const editableStatuses = ["Verified", "Suspended", "Inactive"];

export function PatientTable({ onUpdate }: PatientTableProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<PatientFormValues>({
    name: "",
    email: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    gender: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [statusActionId, setStatusActionId] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        page: page.toString(),
        limit: "10",
      });

      const response = await fetch(`/api/patients?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Gagal memuat data pasien");
      }

      const data = await response.json();
      setPatients(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast.error("Gagal memuat data pasien");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, page]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const notifyUpdated = useCallback(() => {
    fetchPatients();
    onUpdate?.();
  }, [fetchPatients, onUpdate]);

  const getStatusBadge = (status: string) => {
    const label = statusLabels[status] ?? status;

    switch (status) {
      case "Verified":
      case "Active":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            {label}
          </Badge>
        );
      case "Pending":
        return <Badge variant="outline">{label}</Badge>;
      case "Suspended":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
            {label}
          </Badge>
        );
      case "Inactive":
      case "Rejected":
        return <Badge variant="destructive">{label}</Badge>;
      default:
        return <Badge>{label}</Badge>;
    }
  };

  const getGenderLabel = (gender: string) => {
    return gender === "L" ? "Laki-laki" : gender === "P" ? "Perempuan" : "-";
  };

  const handleView = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsViewModalOpen(true);
  };

  const handleOpenEdit = (patient: Patient) => {
    setSelectedPatient(patient);
    setEditForm({
      name: patient.name || "",
      email: patient.email || "",
      phone: patient.phone || "",
      address: patient.address || "",
      dateOfBirth: patient.dateOfBirth
        ? String(patient.dateOfBirth).split("T")[0]
        : "",
      gender: patient.gender || "",
    });
    setIsEditModalOpen(true);
  };

  const handleVerify = async (
    patientId: string,
    action: "approve" | "reject"
  ) => {
    const confirmMessage =
      action === "approve"
        ? "Setujui pasien ini?"
        : "Tolak pasien ini? Akun akan diarsipkan dari daftar aktif.";

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/patients/${patientId}/verify`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Gagal memproses verifikasi pasien");
      }

      toast.success(result.message);
      notifyUpdated();
    } catch (error) {
      console.error("Error verifying patient:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal memverifikasi pasien"
      );
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedPatient) {
      return;
    }

    if (!editForm.name.trim()) {
      toast.error("Nama pasien wajib diisi");
      return;
    }

    setSavingEdit(true);
    try {
      const response = await fetch(`/api/patients/${selectedPatient.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Gagal memperbarui pasien");
      }

      toast.success(result.message);
      setIsEditModalOpen(false);
      notifyUpdated();
    } catch (error) {
      console.error("Error updating patient:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal memperbarui pasien"
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleStatusChange = async (patient: Patient, status: string) => {
    if (patient.status === status) {
      return;
    }

    if (patient.status === "Pending" && status === "Verified") {
      toast.info(
        "Gunakan tab verifikasi pasien untuk menyetujui akun yang masih pending."
      );
      return;
    }

    const label = statusLabels[status] ?? status;
    if (!confirm(`Ubah status akun ${patient.name} menjadi ${label}?`)) {
      return;
    }

    setStatusActionId(patient.id);
    try {
      const response = await fetch(`/api/patients/${patient.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Gagal mengubah status pasien");
      }

      toast.success(result.message);
      notifyUpdated();
    } catch (error) {
      console.error("Error updating patient status:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal mengubah status pasien"
      );
    } finally {
      setStatusActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari nama, NIK, email, atau username pasien"
            className="pl-8"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>NIK</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memuat data pasien...
                  </div>
                </TableCell>
              </TableRow>
            ) : patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Tidak ada data pasien
                </TableCell>
              </TableRow>
            ) : (
              patients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">
                    {patient.name || "-"}
                  </TableCell>
                  <TableCell>{patient.nik || "-"}</TableCell>
                  <TableCell>{patient.email || "-"}</TableCell>
                  <TableCell>{patient.phone || "-"}</TableCell>
                  <TableCell>{getGenderLabel(patient.gender)}</TableCell>
                  <TableCell>{getStatusBadge(patient.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(patient)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(patient)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      {patient.status === "Pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerify(patient.id, "approve")}
                            className="text-green-600"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerify(patient.id, "reject")}
                            className="text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={statusActionId === patient.id}
                          >
                            {statusActionId === patient.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={patient.status === "Pending"}
                            onClick={() => handleStatusChange(patient, "Verified")}
                          >
                            <UserRoundCheck className="h-4 w-4" />
                            {patient.status === "Pending"
                              ? "Verifikasi lewat tab pending"
                              : "Tandai Terverifikasi"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(patient, "Suspended")}
                          >
                            <UserRoundX className="h-4 w-4" />
                            Tangguhkan Akun
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(patient, "Inactive")}
                          >
                            <UserRoundX className="h-4 w-4" />
                            Nonaktifkan Akun
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
        >
          Sebelumnya
        </Button>
        <div className="text-sm text-muted-foreground">
          Halaman {page} dari {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
        >
          Selanjutnya
        </Button>
      </div>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Pasien</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Nama
                  </p>
                  <p className="font-medium">{selectedPatient.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Username
                  </p>
                  <p className="font-medium">{selectedPatient.username}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    NIK
                  </p>
                  <p className="font-medium">{selectedPatient.nik || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Gender
                  </p>
                  <p className="font-medium">
                    {getGenderLabel(selectedPatient.gender)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Email
                  </p>
                  <p className="font-medium">{selectedPatient.email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Telepon
                  </p>
                  <p className="font-medium">{selectedPatient.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Tanggal Lahir
                  </p>
                  <p className="font-medium">
                    {selectedPatient.dateOfBirth
                      ? formatDate(selectedPatient.dateOfBirth)
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Status
                  </p>
                  {getStatusBadge(selectedPatient.status)}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Alamat
                </p>
                <p className="font-medium">{selectedPatient.address || "-"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Terdaftar Sejak
                </p>
                <p className="font-medium">
                  {formatDate(selectedPatient.createdAt)}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Data Pasien</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="patient-name">Nama Lengkap</Label>
              <Input
                id="patient-name"
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="patient-email">Email</Label>
                <Input
                  id="patient-email"
                  type="email"
                  value={editForm.email}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="patient-phone">Nomor Telepon</Label>
                <Input
                  id="patient-phone"
                  value={editForm.phone}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="patient-date-of-birth">Tanggal Lahir</Label>
                <Input
                  id="patient-date-of-birth"
                  type="date"
                  value={editForm.dateOfBirth}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      dateOfBirth: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Jenis Kelamin</Label>
                <Select
                  value={editForm.gender}
                  onValueChange={(value) =>
                    setEditForm((current) => ({
                      ...current,
                      gender: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis kelamin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="patient-address">Alamat</Label>
              <Input
                id="patient-address"
                value={editForm.address}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
              />
            </div>

            {selectedPatient && (
              <div className="grid gap-2">
                <Label>Status Akun Saat Ini</Label>
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(selectedPatient.status)}
                  {editableStatuses.map((status) => (
                    <Button
                      key={status}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleStatusChange(selectedPatient, status)
                      }
                      disabled={
                        statusActionId === selectedPatient.id ||
                        selectedPatient.status === status ||
                        (selectedPatient.status === "Pending" &&
                          status === "Verified")
                      }
                    >
                      {statusLabels[status]}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={savingEdit}
            >
              Batal
            </Button>
            <Button type="button" onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
