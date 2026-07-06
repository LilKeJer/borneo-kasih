// app/dashboard/patient/page.tsx (Modifikasi)
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { AppointmentStatusCard } from "@/components/patient/appointment-status-card";
import { useClinicSettings } from "@/hooks/use-clinic-settings";
import { formatDate } from "@/lib/utils/date";

interface DashboardData {
  nextAppointment: {
    date: string;
    queueNumber: number;
    status: string;
  } | null;
  lastVisit: {
    date: string;
  } | null;
}

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const { clinicName } = useClinicSettings();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/patients/dashboard");
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selamat Datang</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Halo {user?.name || user?.email}, selamat datang di sistem rekam
            medis {clinicName}.
          </p>
        </CardContent>
      </Card>

      {/* Current Queue Status Card */}
      <AppointmentStatusCard />

      {/* Last Visit Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Kunjungan Terakhir
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : dashboardData?.lastVisit ? (
            <div>
              <p className="font-medium">
                {formatDate(dashboardData.lastVisit.date)}
              </p>
            </div>
          ) : (
            <p className="text-gray-500">Belum ada riwayat kunjungan</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
