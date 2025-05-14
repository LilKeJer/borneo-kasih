// components/admin/pending-patient-list.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/date";

interface PendingPatient {
  id: string;
  username: string;
  name: string;
  nik: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string;
  address: string | null;
  gender: string;
  status: string;
  createdAt: string;
  missingFields: string[];
}

interface PendingPatientListProps {
  onUpdate?: () => void;
}

export function PendingPatientList({ onUpdate }: PendingPatientListProps) {
  const [patients, setPatients] = useState<PendingPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<PendingPatient | null>(
    null
  );
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completeData, setCompleteData] = useState({
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    fetchPendingPatients();
  }, []);

  const fetchPendingPatients = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/patients/pending");
      if (!response.ok) throw new Error("Failed to fetch pending patients");

      const data = await response.json();
      setPatients(data.data);
    } catch (error) {
      console.error("Error fetching pending patients:", error);
      toast.error("Gagal memuat data pasien pending");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDirectly = async (patient: PendingPatient) => {
    if (patient.missingFields.length > 0) {
      setSelectedPatient(patient);
      setCompleteData({
        email: patient.email || "",
        phone: patient.phone || "",
        address: patient.address || "",
      });
      setIsCompleteModalOpen(true);
      return;
    }

    if (!confirm("Apakah Anda yakin ingin menyetujui pasien ini?")) return;

    try {
      const response = await fetch(`/api/patients/${patient.id}/verify`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "approve" }),
      });

      if (!response.ok) throw new Error("Failed to approve patient");

      const result = await response.json();
      toast.success(result.message);
      fetchPendingPatients();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error approving patient:", error);
      toast.error("Gagal menyetujui pasien");
    }
  };

  const handleCompleteAndApprove = async () => {
    if (!selectedPatient) return;

    try {
      const response = await fetch(
        `/api/patients/${selectedPatient.id}/verify`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "approve",
            completeData,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to approve patient");

      const result = await response.json();
      toast.success(result.message);
      setIsCompleteModalOpen(false);
      setSelectedPatient(null);
      fetchPendingPatients();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error approving patient:", error);
      toast.error("Gagal menyetujui pasien");
    }
  };

  const handleReject = async (patientId: string) => {
    if (
      !confirm("Apakah Anda yakin ingin menolak pasien ini? Data akan dihapus.")
    )
      return;

    try {
      const response = await fetch(`/api/patients/${patientId}/verify`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "reject" }),
      });

      if (!response.ok) throw new Error("Failed to reject patient");

      const result = await response.json();
      toast.success(result.message);
      fetchPendingPatients();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error rejecting patient:", error);
      toast.error("Gagal menolak pasien");
    }
  };

  const getGenderLabel = (gender: string) => {
    return gender === "L" ? "Laki-laki" : "Perempuan";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (patients.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Tidak ada pasien yang menunggu verifikasi
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {patients.map((patient) => (
        <Card key={patient.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{patient.name}</CardTitle>
                <CardDescription>
                  Username: {patient.username} | NIK: {patient.nik}
                </CardDescription>
              </div>
              <Badge variant="outline">Pending</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  {patient.email || (
                    <Badge variant="destructive" className="h-5">
                      Missing
                    </Badge>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Telepon:</span>{" "}
                  {patient.phone || (
                    <Badge variant="destructive" className="h-5">
                      Missing
                    </Badge>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Gender:</span>{" "}
                  {getGenderLabel(patient.gender)}
                </div>
                <div>
                  <span className="text-muted-foreground">Tanggal Lahir:</span>{" "}
                  {formatDate(patient.dateOfBirth)}
                </div>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Alamat:</span>{" "}
                {patient.address || (
                  <Badge variant="destructive" className="h-5">
                    Missing
                  </Badge>
                )}
              </div>

              {patient.missingFields.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  Data tidak lengkap: {patient.missingFields.join(", ")}
                </div>
              )}

              <div className="flex justify-between items-center pt-3">
                <p className="text-sm text-muted-foreground">
                  Terdaftar: {formatDate(patient.createdAt)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApproveDirectly(patient)}
                    className="text-green-600"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Setujui
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(patient.id)}
                    className="text-red-600"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Tolak
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Modal untuk melengkapi data */}
      <Dialog open={isCompleteModalOpen} onOpenChange={setIsCompleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lengkapi Data Pasien</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Lengkapi data yang diperlukan untuk pasien{" "}
                {selectedPatient.name}
              </p>

              {selectedPatient.missingFields.includes("email") && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={completeData.email}
                    onChange={(e) =>
                      setCompleteData({
                        ...completeData,
                        email: e.target.value,
                      })
                    }
                    placeholder="email@example.com"
                  />
                </div>
              )}

              {selectedPatient.missingFields.includes("phone") && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Nomor Telepon</Label>
                  <Input
                    id="phone"
                    value={completeData.phone}
                    onChange={(e) =>
                      setCompleteData({
                        ...completeData,
                        phone: e.target.value,
                      })
                    }
                    placeholder="08123456789"
                  />
                </div>
              )}

              {selectedPatient.missingFields.includes("address") && (
                <div className="space-y-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Input
                    id="address"
                    value={completeData.address}
                    onChange={(e) =>
                      setCompleteData({
                        ...completeData,
                        address: e.target.value,
                      })
                    }
                    placeholder="Alamat lengkap"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCompleteModalOpen(false)}
            >
              Batal
            </Button>
            <Button onClick={handleCompleteAndApprove}>
              Lengkapi & Setujui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
