// app/dashboard/receptionist/walk-in/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WalkInRegistrationForm } from "@/components/receptionist/walk-in-registration-form";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WalkInRegistrationPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);

  const handleSuccess = () => {
    setSubmitted(true);
    // Redirect setelah 2 detik
    setTimeout(() => {
      router.push("/dashboard/receptionist/queue");
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pendaftaran Pasien Walk-in"
        description="Daftarkan pasien yang datang langsung tanpa reservasi"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/receptionist/queue")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Antrian
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Form Pendaftaran Walk-in</CardTitle>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-semibold text-green-600 mb-2">
                Pendaftaran Berhasil!
              </h3>
              <p className="text-muted-foreground">
                Pasien telah berhasil didaftarkan. Anda akan diarahkan ke
                halaman antrian...
              </p>
            </div>
          ) : (
            <WalkInRegistrationForm
              onSuccess={handleSuccess}
              onCancel={() => router.push("/dashboard/receptionist/queue")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
