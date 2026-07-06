import { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
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
    title: `Registrasi - ${settings.clinicName}`,
    description: `Buat akun pasien baru untuk ${settings.clinicName}`,
  };
}

export default async function RegisterPage() {
  const settings = await getOrCreateClinicSettings();
  const operatingHours = formatClinicOperatingHours(settings);
  const doctorOperatingHours = await getDoctorOperatingHours();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl bg-white px-8 py-10 shadow-lg">
          <RegisterForm clinicName={settings.clinicName} />
          <div className="mt-4 text-center text-sm">
            <p>
              Sudah punya akun?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-primary hover:underline"
              >
                Masuk di sini
              </Link>
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-900 p-8 text-white shadow-xl">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300">
            Verifikasi Pasien
          </p>
          <h2 className="mt-4 text-3xl font-semibold">{settings.clinicName}</h2>
          <p className="mt-3 text-sm text-slate-300">
            Setelah registrasi, admin akan memeriksa akun pasien baru dan
            mencocokkannya dengan arsip klinik bila diperlukan sebelum akun
            disetujui.
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
      </div>
    </div>
  );
}
