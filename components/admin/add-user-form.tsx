// components/admin/add-user-form.tsx
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Definisi schema
const userFormSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
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
  // Field tambahan sesuai role
  specialization: z.string().optional(),
  nik: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  gender: z.enum(["L", "P"]).optional(),
});

// Definisikan tipe form
type UserFormValues = z.infer<typeof userFormSchema>;

export function AddUserForm() {
  const [selectedRole, setSelectedRole] = useState("Admin");

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      phone: "",
      role: "Admin",
    },
  });

  function onSubmit(values: UserFormValues) {
    console.log(values);
    // Implementasi logic tambah user ke database
  }

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
      form.setValue("role", role);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Informasi Dasar</h3>

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="******" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
        </div>

        {/* Field spesifik berdasarkan role */}
        <Tabs value={selectedRole} className="space-y-4">
          <TabsList className="hidden">
            <TabsTrigger value="Admin">Admin</TabsTrigger>
            <TabsTrigger value="Doctor">Dokter</TabsTrigger>
            <TabsTrigger value="Nurse">Perawat</TabsTrigger>
            <TabsTrigger value="Receptionist">Resepsionis</TabsTrigger>
            <TabsTrigger value="Pharmacist">Apoteker</TabsTrigger>
            <TabsTrigger value="Patient">Pasien</TabsTrigger>
          </TabsList>

          {/* Field tambahan untuk dokter */}
          <TabsContent value="Doctor" className="space-y-4">
            <h3 className="text-lg font-medium">Informasi Dokter</h3>

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
          </TabsContent>

          {/* Field tambahan untuk pasien */}
          <TabsContent value="Patient" className="space-y-4">
            <h3 className="text-lg font-medium">Informasi Pasien</h3>

            <FormField
              control={form.control}
              name="nik"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIK</FormLabel>
                  <FormControl>
                    <Input placeholder="16 digit NIK" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal Lahir</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jenis Kelamin</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenis kelamin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        <Button type="submit">Tambah Pengguna</Button>
      </form>
    </Form>
  );
}
