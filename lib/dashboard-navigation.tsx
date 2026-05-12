import type { ReactNode } from "react";
import {
  Calendar,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  Home,
  Package,
  Pill,
  Settings,
  Tag,
  User,
  UserPlus,
  Users,
} from "lucide-react";

export type DashboardRole =
  | "Admin"
  | "Doctor"
  | "Nurse"
  | "Receptionist"
  | "Pharmacist"
  | "Patient";

export interface DashboardNavItem {
  title: string;
  href: string;
  icon?: ReactNode;
}

const DASHBOARD_HOME_BY_ROLE: Record<DashboardRole, string> = {
  Admin: "/dashboard/admin",
  Doctor: "/dashboard/doctor",
  Nurse: "/dashboard/nurse",
  Receptionist: "/dashboard/receptionist",
  Pharmacist: "/dashboard/pharmacist",
  Patient: "/dashboard/patient",
};

export function getDashboardHomeHrefByRole(role?: string) {
  if (!role || !(role in DASHBOARD_HOME_BY_ROLE)) {
    return null;
  }

  return DASHBOARD_HOME_BY_ROLE[role as DashboardRole];
}

export function getProfileHrefByRole(role?: string) {
  const dashboardHref = getDashboardHomeHrefByRole(role);
  return dashboardHref ? `${dashboardHref}/profile` : null;
}

export function getSettingsHrefByRole(role?: string) {
  if (role === "Admin") {
    return "/dashboard/admin/settings";
  }

  return null;
}

export function getDashboardNavByRole(role: DashboardRole): DashboardNavItem[] {
  switch (role) {
    case "Admin":
      return [
        {
          title: "Dashboard",
          href: "/dashboard/admin",
          icon: <Home className="h-4 w-4" />,
        },
        {
          title: "Staf",
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
          title: "Layanan Medis",
          href: "/dashboard/admin/services",
          icon: <Tag className="h-4 w-4" />,
        },
        {
          title: "Pengaturan",
          href: "/dashboard/admin/settings",
          icon: <Settings className="h-4 w-4" />,
        },
        {
          title: "Profil",
          href: "/dashboard/admin/profile",
          icon: <User className="h-4 w-4" />,
        },
      ];
    case "Doctor":
      return [
        {
          title: "Dashboard",
          href: "/dashboard/doctor",
          icon: <Home className="h-4 w-4" />,
        },
        {
          title: "Antrian",
          href: "/dashboard/doctor/queue",
          icon: <Clock className="h-4 w-4" />,
        },
        {
          title: "Rekam Medis",
          href: "/dashboard/doctor/medical-records",
          icon: <FileText className="h-4 w-4" />,
        },
        {
          title: "Profil",
          href: "/dashboard/doctor/profile",
          icon: <User className="h-4 w-4" />,
        },
      ];
    case "Nurse":
      return [
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
          title: "Profil",
          href: "/dashboard/nurse/profile",
          icon: <User className="h-4 w-4" />,
        },
      ];
    case "Receptionist":
      return [
        {
          title: "Dashboard",
          href: "/dashboard/receptionist",
          icon: <Home className="h-4 w-4" />,
        },
        {
          title: "Antrian",
          href: "/dashboard/receptionist/queue",
          icon: <ClipboardList className="h-4 w-4" />,
        },
        {
          title: "Walk-in",
          href: "/dashboard/receptionist/walk-in",
          icon: <UserPlus className="h-4 w-4" />,
        },
        {
          title: "Pembayaran",
          href: "/dashboard/receptionist/payments",
          icon: <CreditCard className="h-4 w-4" />,
        },
        {
          title: "Profil",
          href: "/dashboard/receptionist/profile",
          icon: <User className="h-4 w-4" />,
        },
      ];
    case "Pharmacist":
      return [
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
          href: "/dashboard/pharmacist/profile",
          icon: <User className="h-4 w-4" />,
        },
      ];
    case "Patient":
      return [
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
          title: "Antrian",
          href: "/queue-display",
          icon: <Clock className="h-4 w-4" />,
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
          title: "Profil",
          href: "/dashboard/patient/profile",
          icon: <User className="h-4 w-4" />,
        },
      ];
  }
}
