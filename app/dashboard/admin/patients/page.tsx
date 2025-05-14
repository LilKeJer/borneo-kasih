// app/dashboard/admin/patients/page.tsx
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientTable } from "@/components/admin/patient-table";
import { PendingPatientList } from "@/components/admin/pending-patient-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function PatientManagementPage() {
  const [pendingCount, setPendingCount] = useState(0);

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
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Pasien"
        description="Kelola data pasien dan verifikasi pendaftar baru"
      />

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
          <PatientTable />
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
    </div>
  );
}
