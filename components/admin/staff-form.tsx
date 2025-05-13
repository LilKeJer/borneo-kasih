// components/admin/staff-form.tsx
"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { staffSchema, type StaffFormValues } from "@/lib/validations/staff";

interface StaffFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: any;
  isEdit?: boolean;
}

export function StaffForm({
  onSuccess,
  onCancel,
  initialData,
  isEdit = false,
}: StaffFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      name: "",
      email: "",
      phone: "",
      role: "Doctor",
      specialization: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        username: initialData.username,
        name: initialData.details?.name || "",
        email: initialData.details?.email || "",
        phone: initialData.details?.phone || "",
        role: initialData.role,
        specialization: initialData.details?.specialization || "",
        password: "",
        confirmPassword: "",
      });
    }
  }, [initialData, form]);

  async function onSubmit(values: StaffFormValues) {
    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/staff/${initialData.id}` : "/api/staff";
      const method = isEdit ? "PUT" : "POST";

      // Jika edit dan password kosong, jangan kirim password
      const dataToSend = { ...values };
      if (isEdit && !values.password) {
        delete dataToSend.password;
        delete dataToSend.confirmPassword;
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal menyimpan data");
      }

      toast.success(
        isEdit ? "Staff berhasil diperbarui" : "Staff berhasil ditambahkan"
      );

      if (!isEdit) {
        form.reset();
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedRole = form.watch("role");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="username" {...field} disabled={isEdit} />
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
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isEdit}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Doctor">Dokter</SelectItem>
                    <SelectItem value="Nurse">Perawat</SelectItem>
                    <SelectItem value="Receptionist">Resepsionis</SelectItem>
                    <SelectItem value="Pharmacist">Apoteker</SelectItem>
                  </SelectContent>
                </Select>
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

          {!isEdit && (
            <>
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
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konfirmasi Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {isEdit && (
            <>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password Baru (Opsional)</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Kosongkan jika tidak ingin mengubah"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konfirmasi Password Baru</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Kosongkan jika tidak ingin mengubah"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

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

          {selectedRole === "Doctor" && (
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
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan..." : isEdit ? "Perbarui" : "Tambah"}{" "}
            Staff
          </Button>
        </div>
      </form>
    </Form>
  );
}
