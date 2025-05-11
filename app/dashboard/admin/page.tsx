// app/dashboard/admin/page.tsx

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { VisitorsChart } from "@/components/admin/visitors-chart";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { ReportsTable } from "@/components/admin/reports-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, UserCheck, Server } from "lucide-react";

export default function AdminDashboardPage() {
  // Data statistik (nanti akan diambil dari database)
  const stats = {
    totalUsers: 1234,
    totalPatients: 985,
    activeStaff: 24,
    todayAppointments: 42,
    totalDoctors: 8,
    totalNurses: 12,
    systemUptime: "99.9%",
  };

  // Mock data
  const mockActivities = [
    {
      id: "1",
      title: "Dokter baru ditambahkan",
      description: "Dr. Sarah Smith telah ditambahkan ke sistem",
      timestamp: "10 menit yang lalu",
      type: "other" as const,
    },
    {
      id: "2",
      title: "Stok obat diperbarui",
      description: "Stok Paracetamol ditambah 200 unit",
      timestamp: "1 jam yang lalu",
      type: "medicine" as const,
    },
    {
      id: "3",
      title: "Pasien baru terdaftar",
      description: "Budi Santoso mendaftar sebagai pasien baru",
      timestamp: "3 jam yang lalu",
      type: "record" as const,
    },
    {
      id: "4",
      title: "Permintaan verifikasi pasien",
      description: "5 pasien baru menunggu verifikasi",
      timestamp: "5 jam yang lalu",
      type: "appointment" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total Pengguna"
          value={stats.totalUsers.toString()}
          icon={<Users className="h-4 w-4" />}
          description="+12% dari bulan lalu"
        />
        <DashboardCard
          title="Janji Temu Hari Ini"
          value={stats.todayAppointments.toString()}
          icon={<Calendar className="h-4 w-4" />}
          description="8 menunggu persetujuan"
        />
        <DashboardCard
          title="Dokter Aktif"
          value={stats.totalDoctors.toString()}
          icon={<UserCheck className="h-4 w-4" />}
          description="Dari total 10 dokter"
        />
        <DashboardCard
          title="Status Sistem"
          value="Aktif"
          icon={<Server className="h-4 w-4" />}
          description={`Uptime: ${stats.systemUptime}`}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Ikhtisar</TabsTrigger>
          <TabsTrigger value="analytics">Statistik</TabsTrigger>
          <TabsTrigger value="reports">Laporan</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-1">
            <RecentActivity activities={mockActivities} />
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4">
            <VisitorsChart />
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
