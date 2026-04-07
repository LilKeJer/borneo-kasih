// app/dashboard/receptionist/layout.tsx (Updated)
import { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getDashboardNavByRole } from "@/lib/dashboard-navigation";

const navItems = getDashboardNavByRole("Receptionist");

export default function ReceptionistLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        title="Dashboard Resepsionis"
        description="Kelola reservasi, antrian, pembayaran, dan pasien walk-in"
        navItems={navItems}
      />
      <div className="flex flex-1">
        <Sidebar items={navItems} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
