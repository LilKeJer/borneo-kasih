"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerPatientSchema } from "@/lib/validations/auth";

type FormData = z.infer<typeof registerPatientSchema>;

interface RegisterFormProps {
  clinicName?: string;
}

export function RegisterForm({
  clinicName = "Klinik Borneo Kasih",
}: RegisterFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(registerPatientSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      name: "",
      nik: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      address: "",
      gender: undefined,
    },
  });

  async function onSubmit(values: FormData) {
    setIsPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
          name: values.name,
          nik: values.nik,
          email: values.email,
          phone: values.phone,
          dateOfBirth: values.dateOfBirth,
          address: values.address,
          gender: values.gender,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registrasi gagal");
      }

      setSuccess(data.message);
      setTimeout(() => {
        router.push("/auth/login?registered=true");
      }, 3000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan";
      setError(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Registrasi Pasien Baru</h1>
        <p className="text-muted-foreground">
          Buat akun pasien untuk {clinicName}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50">
          <AlertDescription className="text-green-900">
            {success}
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="Buat username" {...field} />
                </FormControl>
                <FormDescription>
                  Gunakan huruf, angka, atau underscore dengan minimal 3
                  karakter.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kata Sandi</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Minimal 6 karakter"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Minimal 6 karakter</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Konfirmasi Kata Sandi</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Ulangi kata sandi"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Lengkap</FormLabel>
                <FormControl>
                  <Input placeholder="Masukkan nama lengkap" {...field} />
                </FormControl>
                <FormDescription>Sesuai dengan KTP atau identitas</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nik"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NIK</FormLabel>
                <FormControl>
                  <Input placeholder="16 digit NIK" maxLength={16} {...field} />
                </FormControl>
                <FormDescription>
                  Nomor Induk Kependudukan sebanyak 16 digit
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                        <SelectValue placeholder="Pilih" />
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
          </div>

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alamat</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Alamat lengkap sesuai domisili"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">
              <strong>Penting:</strong> Setelah registrasi, akun Anda akan
              menunggu verifikasi admin klinik sebagai bagian dari pencocokan
              data pasien baru dengan arsip klinik.
            </AlertDescription>
          </Alert>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Mendaftar..." : "Daftar"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
