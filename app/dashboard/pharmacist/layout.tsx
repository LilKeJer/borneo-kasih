// app/(dashboard)/pharmacist/layout.tsx
import { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Home, Package, ClipboardList, User } from "lucide-react";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard/pharmacist",
    icon: <Home className="h-4 w-4" />,
  },
  {
    title: "Inventory",
    href: "/dashboard/pharmacist/inventory",
    icon: <Package className="h-4 w-4" />,
  },
  {
    title: "Prescriptions",
    href: "/dashboard/pharmacist/prescription",
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    title: "Profile",
    href: "/dashboard/profile",
    icon: <User className="h-4 w-4" />,
  },
];

export default function PharmacistLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        title="Pharmacist Dashboard"
        description="Manage medicines and inventory"
        navItems={navItems}
      />
      <div className="flex flex-1">
        <Sidebar items={navItems} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
