// app/(dashboard)/admin/layout.tsx
import { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Users, Settings, BarChart, User, Home } from "lucide-react";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard/admin",
    icon: <Home className="h-4 w-4" />,
  },
  {
    title: "Users",
    href: "/dashboard/admin/users",
    icon: <Users className="h-4 w-4" />,
  },
  {
    title: "Doctors",
    href: "/dashboard/admin/doctors",
    icon: <User className="h-4 w-4" />,
  },
  {
    title: "Nurses",
    href: "/dashboard/admin/nurses",
    icon: <User className="h-4 w-4" />,
  },
  {
    title: "Receptionists",
    href: "/dashboard/admin/receptionists",
    icon: <User className="h-4 w-4" />,
  },
  {
    title: "Pharmacists",
    href: "/dashboard/admin/pharmacists",
    icon: <User className="h-4 w-4" />,
  },
  {
    title: "Reports",
    href: "/dashboard/admin/reports",
    icon: <BarChart className="h-4 w-4" />,
  },
  {
    title: "Settings",
    href: "/dashboard/admin/settings",
    icon: <Settings className="h-4 w-4" />,
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
