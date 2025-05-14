// app/dashboard/profile/layout.tsx - Fixed
import { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Home, User } from "lucide-react";

// Profile page uses the same layout pattern but with minimal navigation
const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <Home className="h-4 w-4" />,
  },
  {
    title: "Profile",
    href: "/dashboard/profile",
    icon: <User className="h-4 w-4" />,
  },
];

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        title="Profile"
        description="Kelola informasi profile Anda"
        navItems={navItems}
      />
      <div className="flex flex-1">
        <Sidebar items={navItems} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
