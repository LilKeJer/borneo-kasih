// app/(dashboard)/doctor/page.tsx
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

export default function DoctorDashboardPage() {
  // Mock data
  const mockActivities = [
    {
      id: "1",
      title: "Patient checked in",
      description: "Ahmad Sulaiman arrived for his 10:00 AM appointment",
      timestamp: "30 minutes ago",
      type: "appointment" as const,
    },
    {
      id: "2",
      title: "Medical record updated",
      description: "Updated treatment notes for Siti Aminah",
      timestamp: "1 hour ago",
      type: "record" as const,
    },
    {
      id: "3",
      title: "Prescription written",
      description: "Prescribed antibiotics for Joko Widodo",
      timestamp: "2 hours ago",
      type: "medicine" as const,
    },
  ];

  // Mock upcoming appointments
  const upcomingAppointments = [
    {
      id: "1",
      patientName: "Rina Marlina",
      time: "11:00 AM",
      purpose: "Follow-up checkup",
    },
    {
      id: "2",
      patientName: "Budi Doremi",
      time: "11:30 AM",
      purpose: "Consultation",
    },
    {
      id: "3",
      patientName: "Dewi Sartika",
      time: "12:00 PM",
      purpose: "Vaccination",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Today's Patients"
          value="12"
          icon={<Users className="h-4 w-4" />}
          description="3 patients seen, 9 remaining"
        />
        <DashboardCard
          title="Next Appointment"
          value="11:00 AM"
          icon={<Calendar className="h-4 w-4" />}
          description="Rina Marlina - Follow-up checkup"
        />
        <DashboardCard
          title="Current Queue"
          value="Ahmad Sulaiman"
          icon={<Clock className="h-4 w-4" />}
          description="Waiting for 5 minutes"
        />
        <DashboardCard
          title="Prescriptions Today"
          value="8"
          icon={<Pill className="h-4 w-4" />}
          description="3 pending pharmacy pickup"
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
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{appointment.patientName}</p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.purpose}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{appointment.time}</p>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <RecentActivity activities={mockActivities} />
      </div>
    </div>
  );
}
