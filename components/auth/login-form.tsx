// components/auth/login-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loginSchema } from "@/lib/validations/auth";

type FormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setRegistrationSuccess(true);
    }
  }, [searchParams]);

  const form = useForm<FormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: FormData) {
    setIsPending(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        username: values.username,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Username atau password salah");
        return;
      }

      // Redirect based on user role
      const session = await fetch("/api/auth/session");
      const sessionData = await session.json();

      if (sessionData?.user?.role) {
        switch (sessionData.user.role) {
          case "Admin":
            router.push("/dashboard/admin");
            break;
          case "Doctor":
            router.push("/dashboard/doctor");
            break;
          case "Nurse":
            router.push("/dashboard/nurse");
            break;
          case "Receptionist":
            router.push("/dashboard/receptionist");
            break;
          case "Pharmacist":
            router.push("/dashboard/pharmacist");
            break;
          case "Patient":
            router.push("/dashboard/patient");
            break;
          default:
            router.push("/");
            break;
        }
      } else {
        router.push("/");
      }
    } catch (error) {
      setError(`${error}Terjadi kesalahan, silakan coba lagi`);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Login Klinik Borneo Kasih</h1>
        <p className="text-muted-foreground">Masuk ke akun Anda</p>
      </div>

      {registrationSuccess && (
        <Alert className="border-green-500 bg-green-50">
          <AlertDescription className="text-green-900">
            Registrasi berhasil! Akun Anda sedang menunggu verifikasi admin.
            Silakan coba login nanti setelah akun diverifikasi.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
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
                  <Input placeholder="Masukkan username" {...field} />
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
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Masuk..." : "Login"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
