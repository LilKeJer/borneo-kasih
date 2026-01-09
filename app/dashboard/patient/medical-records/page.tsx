// app/dashboard/patient/medical-records/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils/date";
import {
  FileText,
  Calendar,
  User,
  Stethoscope,
  FileX2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Activity,
  ClipboardList,
  Pill,
} from "lucide-react";

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

  const fetchMedicalRecords = useCallback(async () => {
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
  }, [page]);

  useEffect(() => {
    fetchMedicalRecords();
  }, [fetchMedicalRecords]);

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

  const getDiagnosisBadgeVariant = (diagnosis: string) => {
    const lowerDiagnosis = diagnosis.toLowerCase();
    if (
      lowerDiagnosis.includes("check up") ||
      lowerDiagnosis.includes("rutin")
    ) {
      return "secondary";
    } else if (
      lowerDiagnosis.includes("flu") ||
      lowerDiagnosis.includes("batuk")
    ) {
      return "default";
    } else if (
      lowerDiagnosis.includes("hipertensi") ||
      lowerDiagnosis.includes("diabetes")
    ) {
      return "destructive";
    }
    return "outline";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Medis"
        description="Lihat riwayat pemeriksaan dan diagnosis Anda"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Daftar Pemeriksaan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Tanggal
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Dokter
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Diagnosis
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-32">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Memuat data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-32">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <FileX2 className="h-8 w-8" />
                        <p>Tidak ada riwayat medis</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow
                      key={record.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleRowClick(record)}
                    >
                      <TableCell className="font-medium">
                        {formatDate(record.date)}
                      </TableCell>
                      <TableCell>{record.doctor}</TableCell>
                      <TableCell>
                        <Badge
                          variant={getDiagnosisBadgeVariant(record.diagnosis)}
                        >
                          {record.diagnosis}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
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
          {!loading && records.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4">
              <p className="text-sm text-muted-foreground">
                Halaman {page} dari {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Selanjutnya
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detail Pemeriksaan
            </DialogTitle>
            <DialogDescription>
              Informasi lengkap hasil pemeriksaan medis
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : recordDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Tanggal Pemeriksaan
                  </div>
                  <p className="font-medium">{formatDate(recordDetail.date)}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    Dokter Pemeriksa
                  </div>
                  <p className="font-medium">{recordDetail.doctor}</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Stethoscope className="h-4 w-4" />
                  Diagnosis
                </div>
                <div>
                  <Badge
                    variant={getDiagnosisBadgeVariant(recordDetail.diagnosis)}
                    className="mb-2"
                  >
                    {recordDetail.diagnosis}
                  </Badge>
                </div>
              </div>

              {recordDetail.description && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ClipboardList className="h-4 w-4" />
                    Deskripsi Pemeriksaan
                  </div>
                  <p className="text-sm leading-relaxed">
                    {recordDetail.description}
                  </p>
                </div>
              )}

              {recordDetail.treatment && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Pill className="h-4 w-4" />
                    Penanganan & Pengobatan
                  </div>
                  <p className="text-sm leading-relaxed">
                    {recordDetail.treatment}
                  </p>
                </div>
              )}

              {!recordDetail.description && !recordDetail.treatment && (
                <div className="text-center py-4 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Detail pemeriksaan tidak tersedia</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileX2 className="h-8 w-8 mx-auto mb-2" />
              <p>Tidak ada detail tersedia</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
