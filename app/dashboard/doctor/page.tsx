"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Calendar, Clock, Pill } from "lucide-react";

interface UpcomingAppointment {
  id: number;
  reservationDate: string;
  patientName: string;
  complaint: string | null;
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "appointment" | "record" | "payment" | "medicine" | "other";
}

interface DoctorDashboardData {
  stats: {
    totalPatients: number;
    patientsSeen: number;
    patientsRemaining: number;
    prescriptionsToday: number;
    readyForPickup: number;
  };
  currentQueue: {
    id: number;
    patientName: string;
    queueNumber: number | null;
    examinationStatus: string | null;
    updatedAt: string | null;
  } | null;
  nextAppointment: UpcomingAppointment | null;
  upcomingAppointments: UpcomingAppointment[];
  recentActivities: ActivityItem[];
}

export default function DoctorDashboardPage() {
  const [data, setData] = useState<DoctorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch("/api/doctor/dashboard");
        if (!response.ok) throw new Error("Failed to fetch dashboard");
        const result = (await response.json()) as DoctorDashboardData;
        setData(result);
      } catch (error) {
        console.error("Error fetching doctor dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const currentQueue = data?.currentQueue;
  const queueWaitingMinutes = currentQueue?.updatedAt
    ? Math.max(
        Math.round(
          (Date.now() - new Date(currentQueue.updatedAt).getTime()) / 60000
        ),
        0
      )
    : 0;

  const activities = (data?.recentActivities || []).map((activity) => ({
    ...activity,
    timestamp: formatDateTime(activity.timestamp),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Today's Patients"
          value={data?.stats.totalPatients ?? 0}
          icon={<Users className="h-4 w-4" />}
          description={`${data?.stats.patientsSeen ?? 0} seen, ${
            data?.stats.patientsRemaining ?? 0
          } remaining`}
          loading={loading}
        />
        <DashboardCard
          title="Next Appointment"
          value={
            data?.nextAppointment
              ? formatTime(data.nextAppointment.reservationDate)
              : "-"
          }
          icon={<Calendar className="h-4 w-4" />}
          description={
            data?.nextAppointment
              ? `${data.nextAppointment.patientName} - ${
                  data.nextAppointment.complaint || "Pemeriksaan"
                }`
              : "Tidak ada janji berikutnya"
          }
          loading={loading}
        />
        <DashboardCard
          title="Current Queue"
          value={currentQueue?.patientName || "-"}
          icon={<Clock className="h-4 w-4" />}
          description={
            currentQueue
              ? `${currentQueue.examinationStatus || "Waiting"} • ${queueWaitingMinutes} menit`
              : "Tidak ada antrian aktif"
          }
          loading={loading}
        />
        <DashboardCard
          title="Prescriptions Today"
          value={data?.stats.prescriptionsToday ?? 0}
          icon={<Pill className="h-4 w-4" />}
          description={`${data?.stats.readyForPickup ?? 0} siap diambil`}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>
              Your schedule for the rest of the day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">
                  Memuat jadwal...
                </p>
              ) : (data?.upcomingAppointments || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Tidak ada janji temu hari ini.
                </p>
              ) : (
                data?.upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{appointment.patientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.complaint || "Pemeriksaan"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {formatTime(appointment.reservationDate)}
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/dashboard/doctor/queue">Lihat</Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <RecentActivity activities={activities} loading={loading} />
      </div>
    </div>
  );
}
