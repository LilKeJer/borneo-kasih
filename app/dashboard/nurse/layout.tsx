// app/(dashboard)/nurse/layout.tsx
import { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FileText, Users, Home, ClipboardList, User } from "lucide-react";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard/nurse",
    icon: <Home className="h-4 w-4" />,
  },
  {
    title: "Patients",
    href: "/dashboard/nurse/patients",
    icon: <Users className="h-4 w-4" />,
  },
  {
    title: "Antrian",
    href: "/queue-display",
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    title: "Medical Records",
    href: "/dashboard/nurse/medical-records",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    title: "Profile",
    href: "/dashboard/profile",
    icon: <User className="h-4 w-4" />,
  },
];

export default function NurseLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        title="Nurse Dashboard"
        description="Manage patients and medical records"
        navItems={navItems}
      />
      <div className="flex flex-1">
        <Sidebar items={navItems} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
