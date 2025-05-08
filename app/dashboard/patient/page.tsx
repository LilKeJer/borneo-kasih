// app/(dashboard)/patient/page.tsx
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Clock, FileText, Bell } from "lucide-react";
import Link from "next/link";

export default function PatientDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Next Appointment"
          value="May 15, 2025"
          icon={<Calendar className="h-4 w-4" />}
          description="10:30 AM with Dr. Borneo"
        />
        <DashboardCard
          title="Queue Status"
          value="Not in queue"
          icon={<Clock className="h-4 w-4" />}
          description="Book an appointment to join the queue"
        />
        <DashboardCard
          title="Medical Records"
          value="5"
          icon={<FileText className="h-4 w-4" />}
          description="Last updated April 20, 2025"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks you might want to perform
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild className="w-full justify-start">
              <Link href="/dashboard/patient/appointments/new">
                <Calendar className="mr-2 h-4 w-4" />
                Book New Appointment
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/patient/medical-records">
                <FileText className="mr-2 h-4 w-4" />
                View Medical History
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/patient/prescriptions">
                <Calendar className="mr-2 h-4 w-4" />
                View Prescriptions
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/patient/payments">
                <Calendar className="mr-2 h-4 w-4" />
                Payment History
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Important information about your health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Bell className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Appointment Reminder</p>
                  <p className="text-sm text-muted-foreground">
                    Your appointment with Dr. Borneo is scheduled for May 15,
                    2025 at 10:30 AM.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Bell className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Prescription Ready</p>
                  <p className="text-sm text-muted-foreground">
                    Your prescription from your last visit is ready for pickup.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" size="sm" className="w-full">
              View All Notifications
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
