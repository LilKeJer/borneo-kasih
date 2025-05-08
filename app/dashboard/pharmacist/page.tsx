// app/(dashboard)/pharmacist/page.tsx
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Package, Clock, ShoppingCart, AlertCircle } from "lucide-react";

export default function PharmacistDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Pending Prescriptions"
          value="8"
          icon={<Clock className="h-4 w-4" />}
          description="3 ready for pickup"
        />
        <DashboardCard
          title="Medicine Inventory"
          value="532"
          icon={<Package className="h-4 w-4" />}
          description="Items in stock"
        />
        <DashboardCard
          title="Transactions Today"
          value="15"
          icon={<ShoppingCart className="h-4 w-4" />}
          description="Rp 1,250,000 total"
        />
        <DashboardCard
          title="Low Stock Alerts"
          value="6"
          icon={<AlertCircle className="h-4 w-4" />}
          description="Items need restocking"
        />
      </div>

      <div className="rounded-md border p-8 text-center">
        <h2 className="text-2xl font-bold">Pharmacist Dashboard</h2>
        <p className="text-muted-foreground">
          Detailed content will be implemented in a future update.
        </p>
      </div>
    </div>
  );
}
