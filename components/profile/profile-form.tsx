// components/profile/profile-form.tsx
"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

type Profile = {
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
  address?: string;
  // Tambahan field khusus Patient (read-only)
  nik?: string;
  dateOfBirth?: Date | string;
  gender?: "L" | "P" | string;
  // Tambahkan field lain jika diperlukan
};
// Definisi schema dynamic berdasarkan role
const createProfileSchema = (role: string) => {
  const baseSchema = {
    name: z.string().min(1, "Nama wajib diisi"),
    email: z.string().email("Email tidak valid"),
    phone: z.string().optional(),
  };

  // Tambah field khusus based on role
  if (role === "Doctor") {
    return z.object({
      ...baseSchema,
      specialization: z.string().optional(),
    });
  } else if (role === "Patient") {
    return z.object({
      ...baseSchema,
      address: z.string().optional(),
    });
  }

  return z.object(baseSchema);
};

export function ProfileForm() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const schema = createProfileSchema(user?.role || "");
  type ProfileFormValues =
    | {
        role: "Doctor";
        name: string;
        email: string;
        phone?: string;
        specialization?: string;
      }
    | {
        role: "Patient";
        name: string;
        email: string;
        phone?: string;
        address?: string;
      }
    | {
        role?: string;
        name: string;
        email: string;
        phone?: string;
      };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      ...(user?.role === "Doctor" && { specialization: "" }),
      ...(user?.role === "Patient" && { address: "" }),
    },
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/profile");
      if (!response.ok) throw new Error("Failed to fetch profile");

      const data: Profile = await response.json();
      setProfile(data);

      // Update form dengan data profile
      form.reset({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        ...(user?.role === "Doctor" && {
          specialization: data.specialization || "",
        }),
        ...(user?.role === "Patient" && { address: data.address || "" }),
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Gagal memuat data profile");
    }
  };

  async function onSubmit(values: ProfileFormValues) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error("Failed to update profile");

      toast.success("Profile berhasil diperbarui");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Gagal memperbarui profile");
    } finally {
      setIsLoading(false);
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "Admin":
        return "Administrator";
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
        return role;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src="" alt={profile?.name} />
            <AvatarFallback className="text-lg">
              {profile?.name ? getInitials(profile.name) : "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-medium">
              {profile?.name || user?.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {getRoleLabel(user?.role || "")}
            </p>
            <p className="text-xs text-muted-foreground">@{user?.username}</p>
          </div>
        </div>

        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Lengkap</FormLabel>
                <FormControl>
                  <Input placeholder="Nama Lengkap" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nomor Telepon</FormLabel>
                <FormControl>
                  <Input placeholder="08123456789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {user?.role === "Doctor" && (
            <FormField
              control={form.control}
              name="specialization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Spesialisasi</FormLabel>
                  <FormControl>
                    <Input placeholder="Spesialisasi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {user?.role === "Patient" && (
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alamat</FormLabel>
                  <FormControl>
                    <Input placeholder="Alamat lengkap" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Read-only fields for Patient */}
          {user?.role === "Patient" && profile?.nik && (
            <FormItem>
              <FormLabel>NIK</FormLabel>
              <FormControl>
                <Input value={profile.nik} disabled />
              </FormControl>
            </FormItem>
          )}

          {user?.role === "Patient" && profile?.dateOfBirth && (
            <FormItem>
              <FormLabel>Tanggal Lahir</FormLabel>
              <FormControl>
                <Input
                  value={new Date(profile.dateOfBirth).toLocaleDateString(
                    "id-ID"
                  )}
                  disabled
                />
              </FormControl>
            </FormItem>
          )}

          {user?.role === "Patient" && profile?.gender && (
            <FormItem>
              <FormLabel>Jenis Kelamin</FormLabel>
              <FormControl>
                <Input
                  value={profile.gender === "L" ? "Laki-laki" : "Perempuan"}
                  disabled
                />
              </FormControl>
            </FormItem>
          )}
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </form>
    </Form>
  );
}
