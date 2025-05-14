"use client";

import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { redirect } from "next/navigation";
import {
  User,
  Home,
  Calendar,
  Users,
  FileText,
  Clock,
  CreditCard,
  Pill,
  Settings,
  Package,
  ClipboardList,
} from "lucide-react";

// Definisi navigation items untuk setiap role
const navItemsByRole = {
  Admin: [
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
      title: "Settings",
      href: "/dashboard/admin/settings",
      icon: <Settings className="h-4 w-4" />,
    },
    {
      title: "Profile",
      href: "/dashboard/profile",
      icon: <User className="h-4 w-4" />,
    },
  ],
  Doctor: [
    {
      title: "Dashboard",
      href: "/dashboard/doctor",
      icon: <Home className="h-4 w-4" />,
    },
    {
      title: "Appointments",
      href: "/dashboard/doctor/appointments",
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      title: "Patients",
      href: "/dashboard/doctor/patients",
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "Medical Records",
      href: "/dashboard/doctor/medical-records",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      title: "Prescriptions",
      href: "/dashboard/doctor/prescriptions",
      icon: <Pill className="h-4 w-4" />,
    },
    {
      title: "Schedule",
      href: "/dashboard/doctor/schedule",
      icon: <ClipboardList className="h-4 w-4" />,
    },
    {
      title: "Profile",
      href: "/dashboard/profile",
      icon: <User className="h-4 w-4" />,
    },
  ],
  Nurse: [
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
      title: "Queue",
      href: "/dashboard/nurse/queue",
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
  ],
  Receptionist: [
    {
      title: "Dashboard",
      href: "/dashboard/receptionist",
      icon: <Home className="h-4 w-4" />,
    },
    {
      title: "Appointments",
      href: "/dashboard/receptionist/appointments",
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      title: "Queue",
      href: "/dashboard/receptionist/queue",
      icon: <ClipboardList className="h-4 w-4" />,
    },
    {
      title: "Patients",
      href: "/dashboard/receptionist/patients",
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "Payments",
      href: "/dashboard/receptionist/payments",
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      title: "Profile",
      href: "/dashboard/profile",
      icon: <User className="h-4 w-4" />,
    },
  ],
  Pharmacist: [
    {
      title: "Dashboard",
      href: "/dashboard/pharmacist",
      icon: <Home className="h-4 w-4" />,
    },
    {
      title: "Medicines",
      href: "/dashboard/pharmacist/medicines",
      icon: <Pill className="h-4 w-4" />,
    },
    {
      title: "Inventory",
      href: "/dashboard/pharmacist/inventory",
      icon: <Package className="h-4 w-4" />,
    },
    {
      title: "Prescriptions",
      href: "/dashboard/pharmacist/prescriptions",
      icon: <ClipboardList className="h-4 w-4" />,
    },
    {
      title: "Profile",
      href: "/dashboard/profile",
      icon: <User className="h-4 w-4" />,
    },
  ],
  Patient: [
    {
      title: "Dashboard",
      href: "/dashboard/patient",
      icon: <Home className="h-4 w-4" />,
    },
    {
      title: "Appointments",
      href: "/dashboard/patient/appointments",
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      title: "Queue Status",
      href: "/dashboard/patient/queue",
      icon: <Clock className="h-4 w-4" />,
    },
    {
      title: "Medical Records",
      href: "/dashboard/patient/medical-records",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      title: "Prescriptions",
      href: "/dashboard/patient/prescriptions",
      icon: <Pill className="h-4 w-4" />,
    },
    {
      title: "Payments",
      href: "/dashboard/patient/payments",
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      title: "Profile",
      href: "/dashboard/patient/profile",
      icon: <User className="h-4 w-4" />,
    },
  ],
};

// Titles dan descriptions untuk setiap role
const headerConfigByRole = {
  Admin: {
    title: "Admin Profile",
    description: "Kelola informasi profile administrator",
  },
  Doctor: {
    title: "Doctor Profile",
    description: "Kelola informasi profile dokter",
  },
  Nurse: {
    title: "Nurse Profile",
    description: "Kelola informasi profile perawat",
  },
  Receptionist: {
    title: "Receptionist Profile",
    description: "Kelola informasi profile resepsionis",
  },
  Pharmacist: {
    title: "Pharmacist Profile",
    description: "Kelola informasi profile apoteker",
  },
  Patient: {
    title: "Patient Profile",
    description: "Kelola informasi profile pasien",
  },
};

export default function ProfileLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect jika user tidak ada
  if (!user) {
    redirect("/auth/login");
  }

  // Get navigation items dan header config berdasarkan role
  const role = user.role as keyof typeof navItemsByRole;
  const navItems = navItemsByRole[role] || [];
  const headerConfig = headerConfigByRole[role] || {
    title: "Profile",
    description: "Kelola informasi profile",
  };

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader
        title={headerConfig.title}
        description={headerConfig.description}
        navItems={navItems}
      />
      <div className="flex flex-1">
        <Sidebar items={navItems} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
