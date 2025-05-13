// app/dashboard/admin/staff/page.tsx
"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { StaffTable } from "@/components/admin/staff-table";
import {
  StaffForm,
  type StaffFormInitialData,
} from "@/components/admin/staff-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function StaffManagementPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] =
    useState<StaffFormInitialData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddSuccess = () => {
    setIsAddDialogOpen(false);
    setRefreshKey((prev) => prev + 1);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setSelectedStaff(null);
    setRefreshKey((prev) => prev + 1);
  };

  const handleEdit = useCallback((staff: StaffFormInitialData) => {
    setSelectedStaff(staff);
    setIsEditDialogOpen(true);
  }, []);

  const handleCloseEditDialog = useCallback((open: boolean) => {
    if (!open) {
      setIsEditDialogOpen(false);
      setSelectedStaff(null);
    }
  }, []);

  const handleCloseAddDialog = useCallback((open: boolean) => {
    if (!open) {
      setIsAddDialogOpen(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Staff"
        description="Kelola dokter, perawat, resepsionis, dan apoteker"
      >
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Staff
        </Button>
      </PageHeader>

      <StaffTable
        key={refreshKey}
        onEdit={(staff) => {
          // staff sudah bertipe StaffFormInitialData
          handleEdit(staff);
        }}
      />

      {/* Dialog Tambah Staff */}
      <Dialog open={isAddDialogOpen} onOpenChange={handleCloseAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tambah Staff Baru</DialogTitle>
          </DialogHeader>
          <StaffForm
            onSuccess={handleAddSuccess}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Staff */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleCloseEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Staff</DialogTitle>
          </DialogHeader>
          <StaffForm
            onSuccess={handleEditSuccess}
            onCancel={() => {
              setIsEditDialogOpen(false);
              setSelectedStaff(null);
            }}
            initialData={selectedStaff!} // Non-null assertion karena kita yakin ada data saat dialog terbuka
            isEdit={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
