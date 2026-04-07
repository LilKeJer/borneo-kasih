import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getProfileHrefByRole } from "@/lib/dashboard-navigation";

export default async function LegacyProfilePage() {
  const session = await getServerSession(authOptions);
  const profileHref = getProfileHrefByRole(session?.user?.role);

  redirect(profileHref || "/auth/login");
}
