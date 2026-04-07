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
    title: "Inventaris",
    href: "/dashboard/pharmacist/inventory",
    icon: <Package className="h-4 w-4" />,
  },
  {
    title: "Resep",
    href: "/dashboard/pharmacist/prescription",
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    title: "Profil",
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
        title="Dashboard Apoteker"
        description="Kelola obat dan persediaan farmasi"
        navItems={navItems}
      />
      <div className="flex flex-1">
        <Sidebar items={navItems} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
