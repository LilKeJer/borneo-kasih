// app/dashboard/admin/layout.tsx
import { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Users, Settings, Home, User, Calendar, Tag } from "lucide-react";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard/admin",
    icon: <Home className="h-4 w-4" />,
  },
  {
    title: "Staff",
    href: "/dashboard/admin/staff",
    icon: <Users className="h-4 w-4" />,
  },
  {
    title: "Pasien",
    href: "/dashboard/admin/patients",
    icon: <Users className="h-4 w-4" />,
  },
  {
    title: "Jadwal Dokter",
    href: "/dashboard/admin/schedules",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    title: "Layanan Medis", // Menambahkan menu baru
    href: "/dashboard/admin/services",
    icon: <Tag className="h-4 w-4" />,
  },
  {
    title: "Settings",
    href: "/dashboard/admin/settings",
    icon: <Settings className="h-4 w-4" />,
  },
  {
    title: "Profile",
    href: "/dashboard/profile",
    icon: <User className="h-4 w-4" />,
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        title="Admin Dashboard"
        description="Manage clinic users and settings"
        navItems={navItems}
      />
      <div className="flex flex-1">
        <Sidebar items={navItems} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
