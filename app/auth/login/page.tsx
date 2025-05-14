// app/auth/login/page.tsx
import { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Login - Klinik Borneo Kasih",
  description: "Login to access your account",
};

// Loading component untuk Suspense
function LoginFormLoader() {
  return (
    <div className="w-full max-w-md text-center">
      <div className="h-8 w-8 mx-auto animate-spin rounded-full border-b-2 border-primary"></div>
      <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="w-full max-w-md px-8 py-10 shadow-lg rounded-lg bg-white">
        <Suspense fallback={<LoginFormLoader />}>
          <LoginForm />
        </Suspense>
        <div className="mt-4 text-center text-sm">
          <p>
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="text-primary hover:underline"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
