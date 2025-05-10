// app/dashboard/admin/users/page.tsx
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Download, Filter } from "lucide-react";
import { UserManagementTable } from "@/components/admin/user-management-table";

export default function UserManagementPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Pengguna"
        description="Kelola semua pengguna sistem"
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Pengguna
          </Button>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </PageHeader>

      <UserManagementTable />
    </div>
  );
}
