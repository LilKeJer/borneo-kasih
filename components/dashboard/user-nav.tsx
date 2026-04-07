// components/dashboard/user-nav.tsx
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import {
  getProfileHrefByRole,
  getSettingsHrefByRole,
} from "@/lib/dashboard-navigation";
import { signOut } from "next-auth/react";

export function UserNav() {
  const { user } = useAuth();
  const profileHref = getProfileHrefByRole(user?.role);
  const settingsHref = getSettingsHrefByRole(user?.role);

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "Admin":
        return "Admin";
      case "Doctor":
        return "Dokter";
      case "Nurse":
        return "Perawat";
      case "Receptionist":
        return "Resepsionis";
      case "Pharmacist":
        return "Apoteker";
      case "Patient":
        return "Pasien";
      default:
        return role || "-";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="" alt={user?.name || "Pengguna"} />
            <AvatarFallback>
              {user?.name ? getInitials(user.name) : "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.username} ({getRoleLabel(user?.role)})
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {profileHref ? (
            <DropdownMenuItem asChild>
              <Link href={profileHref}>Profil</Link>
            </DropdownMenuItem>
          ) : null}
          {settingsHref ? (
            <DropdownMenuItem asChild>
              <Link href={settingsHref}>Pengaturan</Link>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        {(profileHref || settingsHref) && <DropdownMenuSeparator />}
        <DropdownMenuItem
          className="text-red-600"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
