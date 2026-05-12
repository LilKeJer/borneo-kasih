// app/dashboard/admin/patients/page.tsx
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientTable } from "@/components/admin/patient-table";
import { PendingPatientList } from "@/components/admin/pending-patient-list";
import { PatientForm } from "@/components/admin/patient-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export default function PatientManagementPage() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchPendingCount();
  }, []);

  const fetchPendingCount = async () => {
    try {
      const response = await fetch("/api/patients/pending");
      if (!response.ok) throw new Error("Failed to fetch pending count");
      const data = await response.json();
      setPendingCount(data.total || 0);
    } catch (error) {
      console.error("Error fetching pending count:", error);
    }
  };

  const handlePendingUpdate = () => {
    fetchPendingCount();
    setRefreshKey((current) => current + 1);
  };

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    fetchPendingCount();
    setRefreshKey((current) => current + 1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Pasien"
        description="Kelola data pasien dan verifikasi pendaftar baru"
      >
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Pasien
        </Button>
      </PageHeader>

      <Card className="border-amber-200 bg-amber-50/80">
        <CardContent className="py-5 text-sm text-amber-900">
          Verifikasi pasien dipakai untuk rekonsiliasi manual akun pasien baru
          dengan arsip atau catatan lama klinik. Admin dapat melengkapi data
          identitas sebelum menyetujui akun, lalu mengubah status pasien menjadi
          nonaktif atau ditangguhkan bila diperlukan tanpa menghapus histori
          medisnya.
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Semua Pasien</TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Pending Verifikasi
            {pendingCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <PatientTable
            onUpdate={handlePendingUpdate}
            refreshKey={refreshKey}
          />
        </TabsContent>

        <TabsContent value="pending">
          {pendingCount === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Tidak ada pasien yang menunggu verifikasi
                </p>
              </CardContent>
            </Card>
          ) : (
            <PendingPatientList onUpdate={handlePendingUpdate} />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Tambah Pasien Baru</DialogTitle>
          </DialogHeader>
          <PatientForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
