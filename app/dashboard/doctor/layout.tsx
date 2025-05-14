// app/(dashboard)/doctor/layout.tsx
import { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  FileText,
  Pill,
  Users,
  Calendar,
  Home,
  ClipboardList,
  User,
} from "lucide-react";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard/doctor",
    icon: <Home className="h-4 w-4" />,
  },
  {
    title: "Appointments",
    href: "/dashboard/doctor/appointments",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    title: "Patients",
    href: "/dashboard/doctor/patients",
    icon: <Users className="h-4 w-4" />,
  },
  {
    title: "Medical Records",
    href: "/dashboard/doctor/medical-records",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Prescriptions",
    href: "/dashboard/doctor/prescriptions",
    icon: <Pill className="h-4 w-4" />,
  },
  {
    title: "Schedule",
    href: "/dashboard/doctor/schedule",
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    title: "Profile",
    href: "/dashboard/profile",
    icon: <User className="h-4 w-4" />,
  },
];

export default function DoctorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        title="Doctor Dashboard"
        description="Manage patient appointments and medical records"
        navItems={navItems}
      />
      <div className="flex flex-1">
        <Sidebar items={navItems} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
