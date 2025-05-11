// components/admin/reports-table.tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, Filter } from "lucide-react";

// Data dummy untuk tabel laporan
const dummyReports = [
  {
    id: "1",
    name: "Laporan Kunjungan Bulanan",
    generatedBy: "Admin Sistem",
    date: "2025-05-01",
    type: "Statistik",
    status: "Tersedia",
  },
  {
    id: "2",
    name: "Laporan Keuangan April 2025",
    generatedBy: "Sistem",
    date: "2025-05-05",
    type: "Keuangan",
    status: "Tersedia",
  },
  {
    id: "3",
    name: "Laporan Stok Obat",
    generatedBy: "Apoteker",
    date: "2025-05-07",
    type: "Inventaris",
    status: "Tersedia",
  },
  {
    id: "4",
    name: "Laporan Aktivitas Dokter",
    generatedBy: "Admin Sistem",
    date: "2025-05-08",
    type: "Operasional",
    status: "Tersedia",
  },
  {
    id: "5",
    name: "Laporan Pasien Baru",
    generatedBy: "Resepsionis",
    date: "2025-05-09",
    type: "Statistik",
    status: "Diproses",
  },
];

export function ReportsTable() {
  // Format tanggal untuk tampilan
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(dateString));
  };

  // Fungsi untuk mendapatkan warna badge berdasarkan status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Tersedia":
        return "secondary";
      case "Diproses":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Laporan Tersedia</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Ekspor
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Laporan</TableHead>
              <TableHead>Pembuat</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dummyReports.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="font-medium">{report.name}</TableCell>
                <TableCell>{report.generatedBy}</TableCell>
                <TableCell>{formatDate(report.date)}</TableCell>
                <TableCell>{report.type}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(report.status)}>
                    {report.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Lihat
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Unduh
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button variant="outline" size="sm" disabled>
          Sebelumnya
        </Button>
        <Button variant="outline" size="sm">
          Selanjutnya
        </Button>
      </div>
    </div>
  );
}
