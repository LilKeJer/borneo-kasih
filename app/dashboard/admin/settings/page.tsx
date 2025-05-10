// app/dashboard/admin/settings/page.tsx
import { PageHeader } from "@/components/dashboard/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan"
        description="Kelola pengaturan sistem dan klinik"
      />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Umum</TabsTrigger>
          <TabsTrigger value="clinic">Klinik</TabsTrigger>
          <TabsTrigger value="schedule">Jadwal</TabsTrigger>
          <TabsTrigger value="security">Keamanan</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Umum</CardTitle>
              <CardDescription>Pengaturan dasar untuk sistem</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clinicName">Nama Klinik</Label>
                <Input id="clinicName" defaultValue="Klinik Borneo Kasih" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email Admin</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  defaultValue="admin@borneokasih.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteUrl">URL Website</Label>
                <Input id="siteUrl" defaultValue="https://borneokasih.com" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="maintenance">Mode Pemeliharaan</Label>
                <Switch id="maintenance" />
              </div>
              <Button className="mt-4">Simpan Perubahan</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinic">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Klinik</CardTitle>
              <CardDescription>Detail tentang klinik</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Alamat</Label>
                <Input
                  id="address"
                  defaultValue="Jl. Klinik No. 123, Banjarmasin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telepon</Label>
                <Input id="phone" defaultValue="0541-123456" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <textarea
                  id="description"
                  className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  defaultValue="Klinik Borneo Kasih adalah klinik kesehatan terpadu di Banjarmasin."
                />
              </div>
              <Button className="mt-4">Simpan Perubahan</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Jadwal Praktek</CardTitle>
              <CardDescription>
                Pengaturan jadwal praktek klinik
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Implementasi form jadwal praktek */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="morningStart">Jam Buka Pagi</Label>
                    <Input id="morningStart" type="time" defaultValue="08:00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="morningEnd">Jam Tutup Pagi</Label>
                    <Input id="morningEnd" type="time" defaultValue="12:00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eveningStart">Jam Buka Sore</Label>
                    <Input id="eveningStart" type="time" defaultValue="17:00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eveningEnd">Jam Tutup Sore</Label>
                    <Input id="eveningEnd" type="time" defaultValue="21:00" />
                  </div>
                </div>
                <Button className="mt-4">Simpan Jadwal</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Keamanan</CardTitle>
              <CardDescription>Pengaturan keamanan sistem</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="2fa">Two-Factor Authentication</Label>
                  <Switch id="2fa" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="loginAttempts">Batasi Percobaan Login</Label>
                  <Switch id="loginAttempts" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="logActions">Log Semua Aktivitas Admin</Label>
                  <Switch id="logActions" defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">
                    Waktu Habis Sesi (menit)
                  </Label>
                  <Input id="sessionTimeout" type="number" defaultValue="30" />
                </div>
                <Button className="mt-4">Simpan Pengaturan</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
