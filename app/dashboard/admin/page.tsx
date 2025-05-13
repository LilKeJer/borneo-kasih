// app/dashboard/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Users, Calendar, Clock } from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    patientsToday: 0,
    activeQueues: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      console.log(data);
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          title="Total Pengguna"
          value={stats.totalUsers.toString()}
          icon={<Users className="h-4 w-4" />}
          description="Semua pengguna sistem"
          loading={loading}
        />
        <DashboardCard
          title="Pasien Hari Ini"
          value={stats.patientsToday.toString()}
          icon={<Calendar className="h-4 w-4" />}
          description="Pasien terjadwal hari ini"
          loading={loading}
        />
        <DashboardCard
          title="Antrian Aktif"
          value={stats.activeQueues.toString()}
          icon={<Clock className="h-4 w-4" />}
          description="Antrian sedang berjalan"
          loading={loading}
        />
      </div>
    </div>
  );
}
