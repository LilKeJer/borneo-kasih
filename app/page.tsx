import Link from "next/link";
import { Metadata } from "next";
import { DoctorOperatingHoursList } from "@/components/clinic/doctor-operating-hours-list";
import { Button } from "@/components/ui/button";
import {
  formatClinicOperatingHours,
  getDoctorOperatingHours,
  getOrCreateClinicSettings,
} from "@/lib/clinic-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getOrCreateClinicSettings();

  return {
    title: `Sistem Rekam Medis - ${settings.clinicName}`,
    description: `Sistem informasi rekam medis untuk ${settings.clinicName}`,
  };
}

export default async function Home() {
  const settings = await getOrCreateClinicSettings();
  const operatingHours = formatClinicOperatingHours(settings);
  const doctorOperatingHours = await getDoctorOperatingHours();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <section className="rounded-3xl bg-[linear-gradient(135deg,#0f172a,#1d4ed8)] p-8 text-white shadow-xl md:p-12">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-200">
            Sistem Rekam Medis Klinik
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
            {settings.clinicName}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-sky-100 md:text-lg">
            Akses pendaftaran pasien, verifikasi admin, dan layanan janji temu
            dengan informasi klinik yang selalu mengikuti pengaturan terbaru.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
              <Link href="/auth/login">Masuk</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20"
            >
              <Link href="/auth/register">Daftar Pasien Baru</Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-4 border-t border-white/15 pt-6 text-sm text-sky-100 md:grid-cols-2">
            <div>
              <p className="font-medium text-white">Alamat Klinik</p>
              <p className="mt-1">{settings.address}</p>
            </div>
            <div>
              <p className="font-medium text-white">Jam Layanan</p>
              <DoctorOperatingHoursList
                doctorOperatingHours={doctorOperatingHours}
                fallback={operatingHours}
                tone="dark"
              />
            </div>
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold">Kontak Klinik</h2>

          <dl className="mt-6 space-y-5 text-sm">
            <div>
              <dt className="font-medium text-slate-500">Nama Klinik</dt>
              <dd className="mt-1 text-base text-slate-900">
                {settings.clinicName}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Telepon</dt>
              <dd className="mt-1 text-base text-slate-900">
                {settings.phone}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Email</dt>
              <dd className="mt-1 text-base text-slate-900">
                {settings.email}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Alamat</dt>
              <dd className="mt-1 text-base text-slate-900">
                {settings.address}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  );
}
