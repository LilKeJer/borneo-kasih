"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { MedicalRecordDetailDialog } from "@/components/doctor/medical-record-detail-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEncryption } from "@/hooks/use-encryption";
import { formatDate } from "@/lib/utils/date";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  Loader2,
  Search,
} from "lucide-react";

interface MedicalRecordItem {
  id: number;
  doctorName: string;
  diagnosis: string;
  encryptionIvDoctor?: string | null;
  date: string;
  reservationId?: number | null;
}

interface MedicalRecordGroup {
  patientId: number;
  patientName: string;
  latestRecordId: number;
  latestDoctorName: string;
  latestDiagnosis: string;
  latestEncryptionIvDoctor?: string | null;
  latestDate: string;
  totalRecords: number;
  records: MedicalRecordItem[];
}

export default function DoctorMedicalRecordsPage() {
  const [recordGroups, setRecordGroups] = useState<MedicalRecordGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [expandedPatients, setExpandedPatients] = useState<number[]>([]);
  const { decrypt, initialize } = useEncryption();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const resolveIv = useCallback((ivString: string | null, key: string) => {
    if (!ivString) return null;

    try {
      const parsed = JSON.parse(ivString) as Record<string, string>;
      return parsed[key] ?? null;
    } catch {
      return ivString;
    }
  }, []);

  const decryptField = useCallback(
    async (value: string, ivString: string | null, key: string) => {
      const resolvedIv = resolveIv(ivString, key);
      if (!resolvedIv) return value;

      try {
        return await decrypt(value, resolvedIv);
      } catch (error) {
        console.error("Decrypt summary medical record error:", error);
        return "Data terenkripsi";
      }
    },
    [decrypt, resolveIv]
  );

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        groupBy: "patient",
      });

      if (searchTerm.trim()) {
        params.set("search", searchTerm.trim());
      }

      if (dateFrom) {
        params.set("dateFrom", dateFrom);
      }

      if (dateTo) {
        params.set("dateTo", dateTo);
      }

      const response = await fetch(
        `/api/doctor/medical-records?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("Gagal memuat daftar rekam medis");
      }

      const result = await response.json();
      const rawGroups = Array.isArray(result.data) ? result.data : [];
      const decryptedGroups = await Promise.all(
        rawGroups.map(async (group: MedicalRecordGroup) => ({
          ...group,
          latestDiagnosis: await decryptField(
            group.latestDiagnosis,
            group.latestEncryptionIvDoctor || null,
            "condition"
          ),
          records: await Promise.all(
            group.records.map(async (record) => ({
              ...record,
              diagnosis: await decryptField(
                record.diagnosis,
                record.encryptionIvDoctor || null,
                "condition"
              ),
            }))
          ),
        }))
      );

      setRecordGroups(decryptedGroups);
      setTotalPages(result.pagination?.totalPages || 1);
      setExpandedPatients((current) =>
        current.filter((patientId) =>
          decryptedGroups.some((group) => group.patientId === patientId)
        )
      );
    } catch (error) {
      console.error("Error fetching doctor medical records:", error);
      setRecordGroups([]);
      setExpandedPatients([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, decryptField, page, searchTerm]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const togglePatientGroup = useCallback((patientId: number) => {
    setExpandedPatients((current) =>
      current.includes(patientId)
        ? current.filter((id) => id !== patientId)
        : [...current, patientId]
    );
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rekam Medis"
        description="Cari dan tinjau riwayat rekam medis yang dikelompokkan per pasien."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Daftar Rekam Medis Per Pasien
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama pasien, NIK, email, atau dokter"
                className="pl-9"
              />
            </div>
            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
            />
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}
            >
              Reset Filter
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pasien</TableHead>
                  <TableHead>Kunjungan Terakhir</TableHead>
                  <TableHead>Dokter Terakhir</TableHead>
                  <TableHead>Ringkasan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memuat rekam medis...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : recordGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Tidak ada rekam medis yang cocok dengan filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  recordGroups.map((group) => {
                    const isExpanded = expandedPatients.includes(group.patientId);

                    return (
                      <Fragment key={group.patientId}>
                        <TableRow>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => togglePatientGroup(group.patientId)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                              <div>
                                <p>{group.patientName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {group.totalRecords} rekam medis
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(group.latestDate)}</TableCell>
                          <TableCell>{group.latestDoctorName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {group.latestDiagnosis}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => togglePatientGroup(group.patientId)}
                            >
                              {isExpanded ? "Sembunyikan" : "Lihat Riwayat"}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={5} className="bg-muted/20 p-0">
                              <div className="space-y-3 p-4">
                                {group.records.map((record) => (
                                  <div
                                    key={record.id}
                                    className="flex flex-col gap-3 rounded-md border bg-background p-4 md:flex-row md:items-start md:justify-between"
                                  >
                                    <div className="space-y-1">
                                      <p className="text-sm font-medium">
                                        {formatDate(record.date)}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        Dokter: {record.doctorName}
                                      </p>
                                      <div>
                                        <Badge variant="secondary">
                                          {record.diagnosis}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="flex justify-end">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedRecordId(record.id);
                                          setIsDetailOpen(true);
                                        }}
                                      >
                                        Lihat Detail
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && recordGroups.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Halaman {page} dari {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((current) => Math.min(current + 1, totalPages))
                  }
                  disabled={page === totalPages}
                >
                  Selanjutnya
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <MedicalRecordDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        recordId={selectedRecordId}
      />
    </div>
  );
}
