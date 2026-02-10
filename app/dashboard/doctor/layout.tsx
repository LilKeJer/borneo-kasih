// app/dashboard/doctor/layout.tsx (update)
import { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Home, User, Clock } from "lucide-react";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard/doctor",
    icon: <Home className="h-4 w-4" />,
  },
  {
    title: "Antrian",
    href: "/dashboard/doctor/queue", // Menambahkan link ke antrian
    icon: <Clock className="h-4 w-4" />,
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
