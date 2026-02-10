// components/admin/doctor-management-table.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { toast } from "sonner";

interface ApiDoctor {
  id: number;
  username: string;
  status?: string | null;
  details?: {
    name?: string | null;
    specialization?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

interface ApiSchedule {
  doctorId: number;
  dayOfWeek: number;
  sessionName: string | null;
  isActive: boolean | null;
}

interface DoctorRow {
  id: number;
  name: string;
  specialization: string;
  email: string;
  phone: string;
  status: string;
  schedules: string[];
}

const dayLabels = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

export function DoctorManagementTable() {
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const [doctorsRes, schedulesRes] = await Promise.all([
          fetch("/api/staff?role=Doctor&limit=1000"),
          fetch("/api/doctor-schedules"),
        ]);

        if (!doctorsRes.ok) {
          throw new Error("Gagal memuat data dokter");
        }

        const doctorsPayload = await doctorsRes.json();
        const doctorData = Array.isArray(doctorsPayload.data)
          ? (doctorsPayload.data as ApiDoctor[])
          : [];

        const schedulesPayload = schedulesRes.ok
          ? await schedulesRes.json()
          : [];
        const schedules = Array.isArray(schedulesPayload)
          ? (schedulesPayload as ApiSchedule[])
          : [];

        const scheduleMap = new Map<number, string[]>();
        schedules.forEach((schedule) => {
          if (!schedule.doctorId) return;
          if (schedule.isActive === false) return;
          const dayLabel =
            dayLabels[schedule.dayOfWeek] ?? `Hari ${schedule.dayOfWeek}`;
          const sessionName = schedule.sessionName || "Sesi";
          const label = `${dayLabel} (${sessionName})`;
          const existing = scheduleMap.get(schedule.doctorId) ?? [];
          if (!existing.includes(label)) {
            scheduleMap.set(schedule.doctorId, [...existing, label]);
          }
        });

        const rows: DoctorRow[] = doctorData.map((doctor) => ({
          id: Number(doctor.id),
          name: doctor.details?.name || doctor.username,
          specialization: doctor.details?.specialization || "-",
          email: doctor.details?.email || "-",
          phone: doctor.details?.phone || "-",
          status: doctor.status || "Active",
          schedules: scheduleMap.get(Number(doctor.id)) ?? [],
        }));

        setDoctors(rows);
      } catch (error) {
        console.error("Error fetching doctors:", error);
        toast.error("Gagal memuat data dokter");
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  const filteredDoctors = useMemo(() => {
    if (!searchTerm.trim()) return doctors;
    const keyword = searchTerm.toLowerCase();
    return doctors.filter((doctor) =>
      [doctor.name, doctor.specialization, doctor.email]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword))
    );
  }, [doctors, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari dokter..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Spesialisasi</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Jadwal</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredDoctors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Tidak ada data dokter
                </TableCell>
              </TableRow>
            ) : (
              filteredDoctors.map((doctor) => (
                <TableRow key={doctor.id}>
                  <TableCell className="font-medium">
                    {doctor.name}
                  </TableCell>
                  <TableCell>{doctor.specialization}</TableCell>
                  <TableCell>{doctor.email}</TableCell>
                  <TableCell>{doctor.phone}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {doctor.schedules.length > 0 ? (
                        doctor.schedules.map((schedule) => (
                          <Badge key={schedule} variant="outline">
                            {schedule}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Tidak ada jadwal
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={doctor.status === "Active" ? "secondary" : "outline"}
                    >
                      {doctor.status === "Active" ? "Aktif" : "Tidak Aktif"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
