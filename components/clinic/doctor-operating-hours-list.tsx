import type { DoctorOperatingHours } from "@/lib/clinic-settings";
import { cn } from "@/lib/utils";

type DoctorOperatingHoursListProps = {
  doctorOperatingHours?: DoctorOperatingHours[];
  fallback?: string;
  tone?: "light" | "dark" | "blue";
};

export function DoctorOperatingHoursList({
  doctorOperatingHours = [],
  fallback,
  tone = "light",
}: DoctorOperatingHoursListProps) {
  if (doctorOperatingHours.length === 0) {
    return fallback ? <p className="mt-1">{fallback}</p> : null;
  }

  return (
    <div className="mt-2 space-y-2">
      {doctorOperatingHours.map((doctor) => (
        <div
          key={doctor.doctorId}
          className={cn(
            "rounded-md border px-3 py-2",
            tone === "dark" && "border-white/10 bg-white/5 text-white",
            tone === "blue" && "border-sky-200 bg-white/70 text-slate-800",
            tone === "light" && "border-slate-200 bg-slate-50 text-slate-800"
          )}
        >
          <p
            className={cn(
              "text-sm font-medium",
              tone === "dark" ? "text-white" : "text-slate-950"
            )}
          >
            Jam Layanan {doctor.doctorName}
          </p>
          <p
            className={cn(
              "mt-0.5 text-xs",
              tone === "dark" ? "text-slate-300" : "text-slate-500"
            )}
          >
            {doctor.specialization || "Dokter"}
          </p>
          <p
            className={cn(
              "mt-1 text-sm",
              tone === "dark" ? "text-slate-100" : "text-slate-700"
            )}
          >
            {doctor.daySummary}: {doctor.displayText}
          </p>
        </div>
      ))}
    </div>
  );
}
