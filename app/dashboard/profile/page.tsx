// app/dashboard/profile/page.tsx
"use client";

import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileForm } from "@/components/profile/profile-form";
import { SecurityForm } from "@/components/profile/security-form";

export default function ProfilePage() {
  const { user } = useAuth();

  const getRoleDescription = (role: string) => {
    switch (role) {
      case "Admin":
        return "Administrator sistem klinik";
      case "Doctor":
        return "Dokter praktik di klinik";
      case "Nurse":
        return "Perawat klinik";
      case "Receptionist":
        return "Resepsionis klinik";
      case "Pharmacist":
        return "Apoteker klinik";
      case "Patient":
        return "Pasien terdaftar";
      default:
        return "Pengguna sistem";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description={getRoleDescription(user?.role || "")}
      />

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Keamanan</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Profile</CardTitle>
              <CardDescription>
                Update informasi personal dan kontak Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProfileForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Keamanan</CardTitle>
              <CardDescription>
                Kelola keamanan akun dan ubah password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SecurityForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
