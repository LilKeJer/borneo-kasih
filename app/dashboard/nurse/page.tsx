"use client";

import { useEffect, useState } from "react";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Users, Clock, FileText, ActivityIcon } from "lucide-react";

interface NurseDashboardData {
  patientsToday: number;
  waitingForCheckup: number;
  checkupsToday: number;
}

export default function NurseDashboardPage() {
  const [data, setData] = useState<NurseDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch("/api/nurse/dashboard");
        if (!response.ok) throw new Error("Failed to fetch nurse dashboard");
        const result = (await response.json()) as NurseDashboardData;
        setData(result);
      } catch (error) {
        console.error("Error fetching nurse dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Patients Today"
          value={data?.patientsToday ?? 0}
          icon={<Users className="h-4 w-4" />}
          description={`${data?.waitingForCheckup ?? 0} waiting for checkup`}
          loading={loading}
        />
        <DashboardCard
          title="Waiting for Checkup"
          value={data?.waitingForCheckup ?? 0}
          icon={<Clock className="h-4 w-4" />}
          description="Patient queue in screening"
          loading={loading}
        />
        <DashboardCard
          title="Patient Records"
          value={data?.checkupsToday ?? 0}
          icon={<FileText className="h-4 w-4" />}
          description="Updated today"
          loading={loading}
        />
        <DashboardCard
          title="Vital Signs Recorded"
          value={data?.checkupsToday ?? 0}
          icon={<ActivityIcon className="h-4 w-4" />}
          description="Since shift start"
          loading={loading}
        />
      </div>
    </div>
  );
}
