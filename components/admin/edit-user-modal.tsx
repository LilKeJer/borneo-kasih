// components/admin/edit-user-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Definisi schema
const userEditSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Email tidak valid"),
  phone: z.string().optional(),
  role: z.enum([
    "Admin",
    "Doctor",
    "Nurse",
    "Receptionist",
    "Pharmacist",
    "Patient",
  ]),
  status: z.enum(["Active", "Inactive", "Pending"]),
  // Field spesifik role akan ditambahkan secara dinamis
});

type UserEditValues = z.infer<typeof userEditSchema>;

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  // Field tambahan
  specialization?: string;
  nik?: string;
  dateOfBirth?: string;
  address?: string;
  gender?: string;
}

interface EditUserModalProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (user: User) => void;
}

export function EditUserModal({
  user,
  open,
  onOpenChange,
  onSave,
}: EditUserModalProps) {
  const [selectedRole, setSelectedRole] = useState(user?.role || "Admin");

  const form = useForm<UserEditValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      role:
        (user?.role as
          | "Admin"
          | "Doctor"
          | "Nurse"
          | "Receptionist"
          | "Pharmacist"
          | "Patient") || "Admin",
      status: (user?.status as "Active" | "Inactive" | "Pending") || "Active",
    },
  });

  // Update form values when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role as
          | "Admin"
          | "Doctor"
          | "Nurse"
          | "Receptionist"
          | "Pharmacist"
          | "Patient",
        status: user.status as "Active" | "Inactive" | "Pending",
      });
      setSelectedRole(user.role);
    }
  }, [user, form]);

  function onSubmit(values: UserEditValues) {
    if (!user) return;

    const updatedUser = {
      ...user,
      ...values,
      // Tambahkan field spesifik role jika perlu
    };

    onSave(updatedUser);
    onOpenChange(false);
  }

  // Handle role change
  const handleRoleChange = (role: string) => {
    if (
      role === "Admin" ||
      role === "Doctor" ||
      role === "Nurse" ||
      role === "Receptionist" ||
      role === "Pharmacist" ||
      role === "Patient"
    ) {
      setSelectedRole(role);
      form.setValue(
        "role",
        role as
          | "Admin"
          | "Doctor"
          | "Nurse"
          | "Receptionist"
          | "Pharmacist"
          | "Patient"
      );
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Pengguna</DialogTitle>
          <DialogDescription>
            Edit data pengguna dengan username {user.username}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      placeholder="email@contoh.com"
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

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={handleRoleChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Doctor">Dokter</SelectItem>
                      <SelectItem value="Nurse">Perawat</SelectItem>
                      <SelectItem value="Receptionist">Resepsionis</SelectItem>
                      <SelectItem value="Pharmacist">Apoteker</SelectItem>
                      <SelectItem value="Patient">Pasien</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Active">Aktif</SelectItem>
                      <SelectItem value="Inactive">Tidak Aktif</SelectItem>
                      <SelectItem value="Pending">Menunggu</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Field spesifik berdasarkan role */}
            {selectedRole === "Doctor" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <FormLabel>Spesialisasi</FormLabel>
                  <Input
                    placeholder="Spesialisasi"
                    defaultValue={user.specialization || ""}
                  />
                </div>
              </div>
            )}

            {selectedRole === "Patient" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <FormLabel>NIK</FormLabel>
                  <Input
                    placeholder="16 digit NIK"
                    defaultValue={user.nik || ""}
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel>Tanggal Lahir</FormLabel>
                  <Input type="date" defaultValue={user.dateOfBirth || ""} />
                </div>
                <div className="space-y-2">
                  <FormLabel>Alamat</FormLabel>
                  <Input
                    placeholder="Alamat lengkap"
                    defaultValue={user.address || ""}
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel>Jenis Kelamin</FormLabel>
                  <Select defaultValue={user.gender || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button type="submit">Simpan Perubahan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
