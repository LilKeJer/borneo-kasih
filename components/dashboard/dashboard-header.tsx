// components/dashboard/dashboard-header.tsx
import { UserNav } from "./user-nav";
import { MobileSidebar } from "./sidebar";
//import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  navItems?: {
    title: string;
    href: string;
    icon?: React.ReactNode;
  }[];
}

export function DashboardHeader({
  title,
  description,
  children,
  navItems = [],
}: DashboardHeaderProps) {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <MobileSidebar items={navItems} />
        <div className="flex-1">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {children}
          <UserNav />
        </div>
      </div>
    </div>
  );
}
