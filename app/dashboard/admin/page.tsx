// app/(dashboard)/admin/page.tsx
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, FileText, DollarSign } from "lucide-react";

export default function AdminDashboardPage() {
  // Mock data - in a real app this would come from an API call
  const mockActivities = [
    {
      id: "1",
      title: "New doctor added",
      description: "Dr. Sarah Smith was added to the system",
      timestamp: "10 minutes ago",
      type: "other" as const,
    },
    {
      id: "2",
      title: "Medicine inventory updated",
      description: "Paracetamol stock increased by 200 units",
      timestamp: "1 hour ago",
      type: "medicine" as const,
    },
    {
      id: "3",
      title: "New patient registered",
      description: "Budi Santoso registered as a new patient",
      timestamp: "3 hours ago",
      type: "record" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total Patients"
          value="1,234"
          icon={<Users className="h-4 w-4" />}
          description="+12% from last month"
        />
        <DashboardCard
          title="Appointments Today"
          value="42"
          icon={<Calendar className="h-4 w-4" />}
          description="8 pending approval"
        />
        <DashboardCard
          title="Medical Records"
          value="5,631"
          icon={<FileText className="h-4 w-4" />}
          description="Updated today"
        />
        <DashboardCard
          title="Revenue This Month"
          value="Rp 24,500,000"
          icon={<DollarSign className="h-4 w-4" />}
          description="+5% from last month"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <RecentActivity activities={mockActivities} />

            <div className="col-span-3 grid gap-4 md:grid-cols-1">
              <DashboardCard
                title="Active Staff"
                value="24"
                description="Doctors, nurses, and staff on duty today"
              />
              <DashboardCard
                title="Pharmacist Status"
                value="Stocked"
                description="Last inventory update: Today at 09:30"
              />
              <DashboardCard
                title="System Status"
                value="Healthy"
                description="All systems operational"
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="analytics">
          <div className="h-[400px] rounded-md border p-4">
            <p className="text-sm text-muted-foreground">
              Analytics content will be displayed here
            </p>
          </div>
        </TabsContent>
        <TabsContent value="reports">
          <div className="h-[400px] rounded-md border p-4">
            <p className="text-sm text-muted-foreground">
              Reports content will be displayed here
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
