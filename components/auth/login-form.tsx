"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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

interface LoginFormProps {
  clinicName?: string;
}

const mapAuthError = (errorMessage: string) => {
  switch (errorMessage) {
    case "CredentialsSignin":
      return "Username atau kata sandi tidak sesuai";
    default:
      return decodeURIComponent(errorMessage);
  }
};

export function LoginForm({
  clinicName = "Klinik Borneo Kasih",
}: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setRegistrationSuccess(true);
    }

    if (searchParams.get("blocked") === "inactive") {
      setBlockedMessage(
        "Akun Anda sedang dinonaktifkan atau ditangguhkan oleh admin."
      );
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
        setError(mapAuthError(result.error));
        return;
      }

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
    } catch {
      setError("Terjadi kesalahan, silakan coba lagi");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Masuk ke {clinicName}</h1>
        <p className="text-muted-foreground">Masuk ke akun Anda</p>
      </div>

      {registrationSuccess && (
        <Alert className="border-green-500 bg-green-50">
          <AlertDescription className="text-green-900">
            Registrasi berhasil. Akun Anda sedang menunggu verifikasi admin.
            Silakan login kembali setelah akun disetujui.
          </AlertDescription>
        </Alert>
      )}

      {blockedMessage && (
        <Alert variant="destructive">
          <AlertDescription>{blockedMessage}</AlertDescription>
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
                <FormLabel>Kata Sandi</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Masukkan kata sandi"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Masuk..." : "Masuk"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
