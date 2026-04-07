// app/dashboard/admin/layout.tsx
import { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getDashboardNavByRole } from "@/lib/dashboard-navigation";

const navItems = getDashboardNavByRole("Admin");

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        title="Dashboard Admin"
        description="Kelola pengguna dan pengaturan klinik"
        navItems={navItems}
      />
      <div className="flex flex-1">
        <Sidebar items={navItems} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
