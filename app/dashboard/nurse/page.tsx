// app/(dashboard)/nurse/page.tsx
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Users, Clock, FileText, ActivityIcon } from "lucide-react";

export default function NurseDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Patients Today"
          value="18"
          icon={<Users className="h-4 w-4" />}
          description="5 currently waiting"
        />
        <DashboardCard
          title="Next Patient"
          value="Ahmad Sulaiman"
          icon={<Clock className="h-4 w-4" />}
          description="Waiting for checkup"
        />
        <DashboardCard
          title="Patient Records"
          value="8"
          icon={<FileText className="h-4 w-4" />}
          description="Updated today"
        />
        <DashboardCard
          title="Vital Signs Recorded"
          value="12"
          icon={<ActivityIcon className="h-4 w-4" />}
          description="Since shift start"
        />
      </div>

      <div className="rounded-md border p-8 text-center">
        <h2 className="text-2xl font-bold">Nurse Dashboard</h2>
        <p className="text-muted-foreground">
          Detailed content will be implemented in a future update.
        </p>
      </div>
    </div>
  );
}
