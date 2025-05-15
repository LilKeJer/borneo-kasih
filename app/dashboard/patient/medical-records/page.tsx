// app/dashboard/patient/medical-records/page.tsx
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils/date";

interface MedicalRecord {
  id: string;
  date: string;
  doctor: string;
  diagnosis: string;
}

interface MedicalRecordDetail extends MedicalRecord {
  description?: string;
  treatment?: string;
}

export default function PatientMedicalRecordsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [recordDetail, setRecordDetail] = useState<MedicalRecordDetail | null>(
    null
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchMedicalRecords();
  }, [page]);

  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/patients/medical-history?page=${page}&limit=10`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch medical records");
      }

      const data = await response.json();
      setRecords(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching medical records:", error);
      alert("Gagal memuat riwayat medis");
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (record: MedicalRecord) => {
    setIsDetailOpen(true);
    setLoadingDetail(true);

    try {
      const response = await fetch(
        `/api/patients/medical-history/${record.id}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch record detail");
      }

      const data = await response.json();
      setRecordDetail(data);
    } catch (error) {
      console.error("Error fetching record detail:", error);
      alert("Gagal memuat detail pemeriksaan");
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Medis"
        description="Lihat riwayat pemeriksaan Anda"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Dokter</TableHead>
              <TableHead>Diagnosis</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Tidak ada riwayat medis
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow
                  key={record.id}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleRowClick(record)}
                >
                  <TableCell>{formatDate(record.date)}</TableCell>
                  <TableCell>{record.doctor}</TableCell>
                  <TableCell>{record.diagnosis}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(record);
                      }}
                    >
                      Lihat Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
        >
          Sebelumnya
        </Button>
        <span>
          Halaman {page} dari {totalPages}
        </span>
        <Button
          variant="outline"
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
        >
          Selanjutnya
        </Button>
      </div>

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Pemeriksaan</DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="text-center py-4">Loading detail...</div>
          ) : recordDetail ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Tanggal</p>
                <p className="font-medium">{formatDate(recordDetail.date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dokter</p>
                <p className="font-medium">{recordDetail.doctor}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Diagnosis</p>
                <p className="font-medium">{recordDetail.diagnosis}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deskripsi</p>
                <p className="font-medium">
                  {recordDetail.description || "Tidak ada deskripsi"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Penanganan</p>
                <p className="font-medium">
                  {recordDetail.treatment || "Tidak ada penanganan"}
                </p>
              </div>
            </div>
          ) : (
            <div>Tidak ada detail</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
