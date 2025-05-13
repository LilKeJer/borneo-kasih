// app/dashboard/admin/page.tsx
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Users, Calendar, UserCheck } from "lucide-react";

export default function AdminDashboardPage() {
  // Data statistik (nanti akan diambil dari database)
  const stats = {
    totalUsers: 1234,
    activePatients: 985,
    activeDoctors: 8,
    todayAppointments: 42,
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
      title: "Pasien baru terdaftar",
      description: "Budi Santoso mendaftar sebagai pasien baru",
      timestamp: "3 jam yang lalu",
      type: "record" as const,
    },
    {
      id: "3",
      title: "Jadwal praktek diperbarui",
      description: "Dr. Ahmad mengubah jadwal praktek",
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
          description="Semua pengguna sistem"
        />
        <DashboardCard
          title="Pasien Aktif"
          value={stats.activePatients.toString()}
          icon={<Users className="h-4 w-4" />}
          description="Pasien terdaftar aktif"
        />
        <DashboardCard
          title="Dokter Aktif"
          value={stats.activeDoctors.toString()}
          icon={<UserCheck className="h-4 w-4" />}
          description="Dari total 10 dokter"
        />
        <DashboardCard
          title="Janji Temu Hari Ini"
          value={stats.todayAppointments.toString()}
          icon={<Calendar className="h-4 w-4" />}
          description="Kunjungan terjadwal"
        />
      </div>

      <div className="grid gap-4">
        <RecentActivity activities={mockActivities} />
      </div>
    </div>
  );
}
