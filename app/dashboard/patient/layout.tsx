// app/(dashboard)/patient/layout.tsx
import { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  FileText,
  Calendar,
  Home,
  Clock,
  CreditCard,
  Pill,
  User,
} from "lucide-react";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard/patient",
    icon: <Home className="h-4 w-4" />,
  },
  {
    title: "Appointments",
    href: "/dashboard/patient/appointments",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    title: "Queue Status",
    href: "/dashboard/patient/queue",
    icon: <Clock className="h-4 w-4" />,
  },
  {
    title: "Medical Records",
    href: "/dashboard/patient/medical-records",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Prescriptions",
    href: "/dashboard/patient/prescriptions",
    icon: <Pill className="h-4 w-4" />,
  },
  {
    title: "Payments",
    href: "/dashboard/patient/payments",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    title: "Profile",
    href: "/dashboard/profile",
    icon: <User className="h-4 w-4" />,
  },
];

export default function PatientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        title="Patient Dashboard"
        description="View appointments, medical records, and payments"
        navItems={navItems}
      />
      <div className="flex flex-1">
        <Sidebar items={navItems} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
