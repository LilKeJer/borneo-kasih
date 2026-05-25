"use client";

import { useEffect, useState } from "react";

export const CLINIC_SETTINGS_UPDATED_EVENT = "clinic-settings-updated";

export interface ClinicSettingsInfo {
  clinicName: string;
  address: string;
  phone: string;
  email: string;
  morningStart: string;
  morningEnd: string;
  eveningStart: string;
  eveningEnd: string;
  operatingHours: string;
}

const fallbackClinicSettings: ClinicSettingsInfo = {
  clinicName: "Klinik Borneo Kasih",
  address: "Jl. Klinik No. 123, Banjarmasin",
  phone: "0541-123456",
  email: "info@borneokasih.com",
  morningStart: "08:00",
  morningEnd: "12:00",
  eveningStart: "17:00",
  eveningEnd: "21:00",
  operatingHours: "08:00 - 12:00 dan 17:00 - 21:00",
};

let cachedClinicSettings: ClinicSettingsInfo | null = null;
let pendingClinicSettings: Promise<ClinicSettingsInfo> | null = null;

function formatOperatingHours(settings: Partial<ClinicSettingsInfo>) {
  const morningStart = settings.morningStart || fallbackClinicSettings.morningStart;
  const morningEnd = settings.morningEnd || fallbackClinicSettings.morningEnd;
  const eveningStart = settings.eveningStart || fallbackClinicSettings.eveningStart;
  const eveningEnd = settings.eveningEnd || fallbackClinicSettings.eveningEnd;

  return `${morningStart} - ${morningEnd} dan ${eveningStart} - ${eveningEnd}`;
}

function normalizeClinicSettings(data: Partial<ClinicSettingsInfo>) {
  const settings = {
    ...fallbackClinicSettings,
    ...data,
  };

  return {
    ...settings,
    operatingHours: data.operatingHours || formatOperatingHours(settings),
  };
}

async function fetchClinicSettings() {
  if (cachedClinicSettings) return cachedClinicSettings;

  if (!pendingClinicSettings) {
    pendingClinicSettings = fetch("/api/clinic-settings", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Gagal memuat pengaturan klinik");
        }
        return response.json();
      })
      .then((data) => {
        cachedClinicSettings = normalizeClinicSettings(data);
        return cachedClinicSettings;
      })
      .catch((error) => {
        pendingClinicSettings = null;
        throw error;
      });
  }

  return pendingClinicSettings;
}

export function useClinicSettings() {
  const [settings, setSettings] = useState<ClinicSettingsInfo>(
    cachedClinicSettings || fallbackClinicSettings
  );

  useEffect(() => {
    let isMounted = true;

    fetchClinicSettings()
      .then((data) => {
        if (isMounted) setSettings(data);
      })
      .catch((error) => {
        console.error("Error fetching clinic settings:", error);
      });

    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<Partial<ClinicSettingsInfo>>).detail;
      cachedClinicSettings = normalizeClinicSettings(detail || {});
      setSettings(cachedClinicSettings);
    };

    window.addEventListener(
      CLINIC_SETTINGS_UPDATED_EVENT,
      handleSettingsUpdated
    );

    return () => {
      isMounted = false;
      window.removeEventListener(
        CLINIC_SETTINGS_UPDATED_EVENT,
        handleSettingsUpdated
      );
    };
  }, []);

  return settings;
}
