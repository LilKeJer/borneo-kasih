import { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { DoctorOperatingHoursList } from "@/components/clinic/doctor-operating-hours-list";
import {
  formatClinicOperatingHours,
  getDoctorOperatingHours,
  getOrCreateClinicSettings,
} from "@/lib/clinic-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getOrCreateClinicSettings();

  return {
    title: `Masuk - ${settings.clinicName}`,
    description: `Masuk ke akun ${settings.clinicName}`,
  };
}

function LoginFormLoader() {
  return (
    <div className="w-full max-w-md text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      <p className="mt-4 text-sm text-muted-foreground">Memuat formulir...</p>
    </div>
  );
}

export default async function LoginPage() {
  const settings = await getOrCreateClinicSettings();
  const operatingHours = formatClinicOperatingHours(settings);
  const doctorOperatingHours = await getDoctorOperatingHours();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300">
            Informasi Klinik
          </p>
          <h2 className="mt-4 text-3xl font-semibold">{settings.clinicName}</h2>
          <p className="mt-3 text-sm text-slate-300">
            Gunakan akun Anda untuk mengakses dashboard sesuai peran dan lihat
            informasi klinik yang selalu mengikuti pengaturan admin terbaru.
          </p>

          <dl className="mt-8 space-y-5 text-sm">
            <div>
              <dt className="text-slate-400">Alamat</dt>
              <dd className="mt-1 text-base text-white">{settings.address}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Telepon</dt>
              <dd className="mt-1 text-base text-white">{settings.phone}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Email</dt>
              <dd className="mt-1 text-base text-white">{settings.email}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Jam Layanan</dt>
              <dd>
                <DoctorOperatingHoursList
                  doctorOperatingHours={doctorOperatingHours}
                  fallback={operatingHours}
                  tone="dark"
                />
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl bg-white px-8 py-10 shadow-lg">
          <Suspense fallback={<LoginFormLoader />}>
            <LoginForm clinicName={settings.clinicName} />
          </Suspense>
          <div className="mt-4 text-center text-sm">
            <p>
              Belum punya akun?{" "}
              <Link
                href="/auth/register"
                className="font-medium text-primary hover:underline"
              >
                Daftar di sini
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
