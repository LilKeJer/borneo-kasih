// app/(auth)/register/page.tsx
import { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Register - Klinik Borneo Kasih",
  description: "Create a new patient account",
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center py-12">
      <div className="w-full max-w-lg px-8 py-10 shadow-lg rounded-lg bg-white">
        <RegisterForm />
        <div className="mt-4 text-center text-sm">
          <p>
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
