// app/(dashboard)/receptionist/page.tsx
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Calendar, Users, Clock, CreditCard } from "lucide-react";

export default function ReceptionistDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Today's Appointments"
          value="28"
          icon={<Calendar className="h-4 w-4" />}
          description="4 remaining to confirm"
        />
        <DashboardCard
          title="Current Queue"
          value="5"
          icon={<Clock className="h-4 w-4" />}
          description="3 waiting for doctor, 2 for payment"
        />
        <DashboardCard
          title="Registered Patients"
          value="1,234"
          icon={<Users className="h-4 w-4" />}
          description="5 new today"
        />
        <DashboardCard
          title="Today's Payments"
          value="Rp 3,500,000"
          icon={<CreditCard className="h-4 w-4" />}
          description="12 transactions"
        />
      </div>

      <div className="rounded-md border p-8 text-center">
        <h2 className="text-2xl font-bold">Receptionist Dashboard</h2>
        <p className="text-muted-foreground">
          Detailed content will be implemented in a future update.
        </p>
      </div>
    </div>
  );
}
