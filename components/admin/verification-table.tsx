// components/admin/verification-table.tsx
"use client";

import { useState } from "react";
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
import { CheckCircle, XCircle, Eye } from "lucide-react";

// Data dummy untuk verifikasi pasien
const dummyVerifications = [
  {
    id: "1",
    name: "Ahmad Rizky",
    nik: "3578112509830001",
    dateOfBirth: "1983-09-25",
    matchScore: 89,
    status: "Pending",
    requestDate: "2025-05-08T10:30:00",
  },
  {
    id: "2",
    name: "Siti Nurhaliza",
    nik: "3578274510900002",
    dateOfBirth: "1990-10-05",
    matchScore: 94,
    status: "Pending",
    requestDate: "2025-05-08T14:20:00",
  },
  {
    id: "3",
    name: "Bambang Suparman",
    nik: "3578273001870003",
    dateOfBirth: "1987-01-30",
    matchScore: 72,
    status: "Pending",
    requestDate: "2025-05-09T09:15:00",
  },
  {
    id: "4",
    name: "Dewi Lestari",
    nik: "3578274507950004",
    dateOfBirth: "1995-07-05",
    matchScore: 85,
    status: "Pending",
    requestDate: "2025-05-09T11:40:00",
  },
  {
    id: "5",
    name: "Joko Widodo",
    nik: "3578273105800005",
    dateOfBirth: "1980-05-31",
    matchScore: 67,
    status: "Pending",
    requestDate: "2025-05-09T16:25:00",
  },
];

export function VerificationTable() {
  const [verifications, setVerifications] = useState(dummyVerifications);

  // Format tanggal untuk tampilan
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(dateString));
  };

  // Format tanggal dan waktu untuk tampilan
  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  // Fungsi untuk mendapatkan warna badge berdasarkan score
  const getMatchScoreBadgeVariant = (score: number) => {
    if (score >= 90) return "secondary";
    if (score >= 75) return "default";
    if (score >= 60) return "outline";
    return "destructive";
  };

  // Handle approve verification
  const handleApprove = (id: string) => {
    setVerifications(
      verifications.map((ver) =>
        ver.id === id ? { ...ver, status: "Approved" } : ver
      )
    );
  };

  // Handle reject verification
  const handleReject = (id: string) => {
    setVerifications(
      verifications.map((ver) =>
        ver.id === id ? { ...ver, status: "Rejected" } : ver
      )
    );
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>NIK</TableHead>
            <TableHead>Tanggal Lahir</TableHead>
            <TableHead>Skor Kecocokan</TableHead>
            <TableHead>Tanggal Permintaan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {verifications.map((ver) => (
            <TableRow key={ver.id}>
              <TableCell className="font-medium">{ver.name}</TableCell>
              <TableCell>{ver.nik}</TableCell>
              <TableCell>{formatDate(ver.dateOfBirth)}</TableCell>
              <TableCell>
                <Badge variant={getMatchScoreBadgeVariant(ver.matchScore)}>
                  {ver.matchScore}%
                </Badge>
              </TableCell>
              <TableCell>{formatDateTime(ver.requestDate)}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    ver.status === "Approved"
                      ? "secondary"
                      : ver.status === "Rejected"
                      ? "destructive"
                      : "outline"
                  }
                >
                  {ver.status === "Approved"
                    ? "Disetujui"
                    : ver.status === "Rejected"
                    ? "Ditolak"
                    : "Menunggu"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => console.log("View details", ver.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {ver.status === "Pending" && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(ver.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(ver.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
