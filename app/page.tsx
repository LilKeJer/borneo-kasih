import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">Sistem Informasi Rekam Medis</h1>
      <h2 className="text-2xl mb-8">Klinik Borneo Kasih</h2>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/auth/login">Login</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/auth/register">Daftar Pasien Baru</Link>
        </Button>
      </div>
    </main>
  );
}
