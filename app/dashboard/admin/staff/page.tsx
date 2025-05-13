// app/dashboard/admin/staff/page.tsx
"use client";

import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { StaffTable } from "@/components/admin/staff-table";
import { StaffForm } from "@/components/admin/staff-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function StaffManagementPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const handleAddSuccess = () => {
    setIsAddDialogOpen(false);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setSelectedStaff(null);
  };

  const handleEdit = (staff: any) => {
    setSelectedStaff(staff);
    setIsEditDialogOpen(true);
  };

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

      <StaffTable onEdit={handleEdit} />

      {/* Dialog Tambah Staff */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tambah Staff Baru</DialogTitle>
          </DialogHeader>
          <StaffForm onSuccess={handleAddSuccess} />
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Staff */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Staff</DialogTitle>
          </DialogHeader>
          <StaffForm
            onSuccess={handleEditSuccess}
            initialData={selectedStaff}
            isEdit={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
