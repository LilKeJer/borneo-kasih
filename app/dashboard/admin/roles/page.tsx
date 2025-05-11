// app/dashboard/admin/roles/page.tsx
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { RoleManagementTable } from "@/components/admin/role-management-table";

export default function RoleManagementPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Role"
        description="Definisikan role dan izin dalam sistem"
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Role
        </Button>
      </PageHeader>

      <RoleManagementTable />
    </div>
  );
}
