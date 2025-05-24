// app/dashboard/receptionist/layout.tsx (Updated)
import { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  Users,
  Calendar,
  Home,
  ClipboardList,
  CreditCard,
  User,
  UserPlus,
} from "lucide-react";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard/receptionist",
    icon: <Home className="h-4 w-4" />,
  },
  {
    title: "Appointments",
    href: "/dashboard/receptionist/appointments",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    title: "Antrian",
    href: "/dashboard/receptionist/queue",
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    title: "Walk-in",
    href: "/dashboard/receptionist/walk-in",
    icon: <UserPlus className="h-4 w-4" />,
  },
  {
    title: "Patients",
    href: "/dashboard/receptionist/patients",
    icon: <Users className="h-4 w-4" />,
  },
  {
    title: "Payments", // Menu baru
    href: "/dashboard/receptionist/payments",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    title: "Profile",
    href: "/dashboard/profile",
    icon: <User className="h-4 w-4" />,
  },
];

export default function ReceptionistLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        title="Receptionist Dashboard"
        description="Manage appointments, queue, payments and walk-ins"
        navItems={navItems}
      />
      <div className="flex flex-1">
        <Sidebar items={navItems} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
