// app/dashboard/patient/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar, Clock } from "lucide-react";

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
            Halo {user?.name || user?.username}, selamat datang di sistem rekam
            medis Klinik Borneo Kasih.
          </p>
          <div className="mt-4 flex gap-4">
            <Button asChild>
              <Link href="/dashboard/patient/appointments/new">
                Buat Janji Temu
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/patient/medical-records">
                Lihat Riwayat
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Next Appointment Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Janji Temu Berikutnya
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : dashboardData?.nextAppointment ? (
            <div className="space-y-2">
              <p className="font-medium">
                {formatDate(dashboardData.nextAppointment.date)}
              </p>
              <p className="text-gray-600">
                Jam: {formatTime(dashboardData.nextAppointment.date)}
              </p>
              <p className="text-gray-600">
                No. Antrian: {dashboardData.nextAppointment.queueNumber}
              </p>
              <p className="text-gray-600">
                Status: {dashboardData.nextAppointment.status}
              </p>
            </div>
          ) : (
            <p className="text-gray-500">
              Tidak ada janji temu yang dijadwalkan
            </p>
          )}
        </CardContent>
      </Card>

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
