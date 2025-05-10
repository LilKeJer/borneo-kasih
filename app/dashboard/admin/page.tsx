// app/dashboard/admin/page.tsx
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <RecentActivity activities={mockActivities} />

            <div className="col-span-3 grid gap-4 md:grid-cols-1">
              <DashboardCard
                title="Staff Aktif"
                value={stats.activeStaff.toString()}
                description="Dokter, perawat, dan staff yang bertugas hari ini"
              />
              <DashboardCard
                title="Status Apoteker"
                value="Stok Tersedia"
                description="Update stok terakhir: Hari ini jam 09:30"
              />
              <DashboardCard
                title="Database Status"
                value="Optimal"
                description="Terakhir backup: Hari ini jam 00:00"
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="analytics">
          <div className="h-[400px] rounded-md border p-4">
            <p className="text-sm text-muted-foreground">
              Konten statistik akan ditampilkan di sini
            </p>
            {/* Tambahkan komponen chart di sini */}
          </div>
        </TabsContent>
        <TabsContent value="reports">
          <div className="h-[400px] rounded-md border p-4">
            <p className="text-sm text-muted-foreground">
              Laporan akan ditampilkan di sini
            </p>
            {/* Tambahkan komponen tabel laporan di sini */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
