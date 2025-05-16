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
import { formatDate } from "@/lib/utils/date";
import { Plus } from "lucide-react";

interface Appointment {
  id: string;
  doctor: string;
  date: string;
  queueNumber: number;
  status: string;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

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
      // Tampilkan pesan error
    } finally {
      setLoading(false);
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4">
                  Belum ada janji temu
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>{formatDate(appointment.date)}</TableCell>
                  <TableCell>{appointment.doctor}</TableCell>
                  <TableCell>{appointment.queueNumber}</TableCell>
                  <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
