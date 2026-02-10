"use client";

import { useEffect, useState } from "react";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Calendar, Users, Clock, CreditCard } from "lucide-react";

interface ReceptionistDashboardData {
  appointmentsToday: number;
  waitingForDoctor: number;
  waitingForPayment: number;
  totalPatients: number;
  newPatientsToday: number;
  paymentsToday: number;
  totalSalesToday: number;
}

export default function ReceptionistDashboardPage() {
  const [data, setData] = useState<ReceptionistDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch("/api/receptionist/dashboard");
        if (!response.ok) {
          throw new Error("Failed to fetch receptionist dashboard");
        }
        const result = (await response.json()) as ReceptionistDashboardData;
        setData(result);
      } catch (error) {
        console.error("Error fetching receptionist dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Today's Appointments"
          value={data?.appointmentsToday ?? 0}
          icon={<Calendar className="h-4 w-4" />}
          description={`${data?.waitingForDoctor ?? 0} waiting for doctor`}
          loading={loading}
        />
        <DashboardCard
          title="Current Queue"
          value={(data?.waitingForDoctor ?? 0) + (data?.waitingForPayment ?? 0)}
          icon={<Clock className="h-4 w-4" />}
          description={`${data?.waitingForDoctor ?? 0} waiting for doctor, ${
            data?.waitingForPayment ?? 0
          } for payment`}
          loading={loading}
        />
        <DashboardCard
          title="Registered Patients"
          value={data?.totalPatients ?? 0}
          icon={<Users className="h-4 w-4" />}
          description={`${data?.newPatientsToday ?? 0} new today`}
          loading={loading}
        />
        <DashboardCard
          title="Today's Payments"
          value={formatRupiah(data?.totalSalesToday ?? 0)}
          icon={<CreditCard className="h-4 w-4" />}
          description={`${data?.paymentsToday ?? 0} transactions`}
          loading={loading}
        />
      </div>
    </div>
  );
}
