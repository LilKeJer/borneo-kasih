// app/dashboard/admin/doctors/page.tsx
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Download } from "lucide-react";
import { DoctorManagementTable } from "@/components/admin/doctor-management-table";

export default function DoctorManagementPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Dokter"
        description="Kelola dokter dan jadwal praktek"
      >
        <div className="flex items-center gap-2">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Dokter
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </PageHeader>

      <DoctorManagementTable />
    </div>
  );
}
