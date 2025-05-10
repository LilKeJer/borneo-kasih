// app/dashboard/admin/verification/page.tsx
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VerificationTable } from "@/components/admin/verification-table";

export default function VerificationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Verifikasi Pasien"
        description="Kelola permintaan verifikasi dari pasien lama"
      >
        <div className="flex items-center gap-2">
          <Badge className="ml-2" variant="secondary">
            5 Permintaan Baru
          </Badge>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Menunggu Verifikasi</CardTitle>
            <CardDescription>Permintaan yang perlu ditinjau</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <Button variant="outline" size="sm" className="mt-4 w-full">
              Lihat Semua
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Diverifikasi</CardTitle>
            <CardDescription>Permintaan yang sudah disetujui</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <Button variant="outline" size="sm" className="mt-4 w-full">
              Lihat Semua
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Ditolak</CardTitle>
            <CardDescription>Permintaan yang ditolak</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <Button variant="outline" size="sm" className="mt-4 w-full">
              Lihat Semua
            </Button>
          </CardContent>
        </Card>
      </div>

      <VerificationTable />
    </div>
  );
}
