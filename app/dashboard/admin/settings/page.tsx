// app/dashboard/admin/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
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
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    clinicName: "",
    address: "",
    phone: "",
    email: "",
    morningStart: "",
    morningEnd: "",
    eveningStart: "",
    eveningEnd: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Gagal memuat pengaturan");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClinicInfo = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clinicName: settings.clinicName,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
        }),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      toast.success("Pengaturan berhasil disimpan");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          morningStart: settings.morningStart,
          morningEnd: settings.morningEnd,
          eveningStart: settings.eveningStart,
          eveningEnd: settings.eveningEnd,
        }),
      });

      if (!response.ok) throw new Error("Failed to save schedule");

      toast.success("Jadwal berhasil disimpan");
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast.error("Gagal menyimpan jadwal");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pengaturan" description="Kelola pengaturan klinik" />
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Pengaturan" description="Kelola pengaturan klinik" />

      <Tabs defaultValue="clinic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clinic">Informasi Klinik</TabsTrigger>
          <TabsTrigger value="schedule">Jam Praktek</TabsTrigger>
        </TabsList>

        <TabsContent value="clinic">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Klinik</CardTitle>
              <CardDescription>Informasi dasar tentang klinik</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clinicName">Nama Klinik</Label>
                <Input
                  id="clinicName"
                  value={settings.clinicName}
                  onChange={(e) =>
                    handleInputChange("clinicName", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Alamat</Label>
                <Input
                  id="address"
                  value={settings.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telepon</Label>
                <Input
                  id="phone"
                  value={settings.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </div>
              <Button
                className="mt-4"
                onClick={handleSaveClinicInfo}
                disabled={saving}
              >
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Jam Praktek</CardTitle>
              <CardDescription>Pengaturan jam buka klinik</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="morningStart">Jam Buka Pagi</Label>
                    <Input
                      id="morningStart"
                      type="time"
                      value={settings.morningStart}
                      onChange={(e) =>
                        handleInputChange("morningStart", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="morningEnd">Jam Tutup Pagi</Label>
                    <Input
                      id="morningEnd"
                      type="time"
                      value={settings.morningEnd}
                      onChange={(e) =>
                        handleInputChange("morningEnd", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eveningStart">Jam Buka Sore</Label>
                    <Input
                      id="eveningStart"
                      type="time"
                      value={settings.eveningStart}
                      onChange={(e) =>
                        handleInputChange("eveningStart", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eveningEnd">Jam Tutup Sore</Label>
                    <Input
                      id="eveningEnd"
                      type="time"
                      value={settings.eveningEnd}
                      onChange={(e) =>
                        handleInputChange("eveningEnd", e.target.value)
                      }
                    />
                  </div>
                </div>
                <Button
                  className="mt-4"
                  onClick={handleSaveSchedule}
                  disabled={saving}
                >
                  {saving ? "Menyimpan..." : "Simpan Jadwal"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
