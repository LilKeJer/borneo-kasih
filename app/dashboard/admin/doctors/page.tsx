// app/dashboard/admin/doctors/page.tsx
import { PageHeader } from "@/components/dashboard/page-header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { DoctorManagementTable } from "@/components/admin/doctor-management-table";

export default function DoctorManagementPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Dokter"
        description="Kelola dokter dan jadwal praktek"
      >
        <Button asChild>
          <Link href="/dashboard/admin/staff">
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Dokter
          </Link>
        </Button>
      </PageHeader>

      <DoctorManagementTable />
    </div>
  );
}
