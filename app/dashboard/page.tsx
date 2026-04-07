import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDashboardHomeHrefByRole } from "@/lib/dashboard-navigation";

export default async function DashboardRedirectPage() {
  const session = await getServerSession(authOptions);
  const dashboardHref = getDashboardHomeHrefByRole(session?.user?.role);

  redirect(dashboardHref || "/auth/login");
}
