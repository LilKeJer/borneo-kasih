// app/(dashboard)/patient/layout.tsx
import { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getDashboardNavByRole } from "@/lib/dashboard-navigation";

const navItems = getDashboardNavByRole("Patient");

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
