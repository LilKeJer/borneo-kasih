// app/dashboard/admin/users/page.tsx
"use client";

import { useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { SimpleUserTable } from "@/components/admin/simple-user-table";
import { AddUserForm } from "@/components/admin/add-user-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function UserManagementPage() {
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Pengguna"
        description="Kelola semua pengguna sistem"
      >
        <Button onClick={() => setIsAddUserDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Pengguna
        </Button>
      </PageHeader>

      <SimpleUserTable />

      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Pengguna Baru</DialogTitle>
          </DialogHeader>
          <AddUserForm onSuccess={() => setIsAddUserDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
