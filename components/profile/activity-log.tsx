// components/profile/activity-log.tsx
"use client";

import { Card } from "@/components/ui/card";
import { LogIn, LogOut, User, Key, AlertCircle } from "lucide-react";

// Data dummy untuk log aktivitas
const dummyActivityLogs = [
  {
    id: "1",
    type: "login",
    description: "Login berhasil",
    ipAddress: "182.16.102.45",
    timestamp: "2025-05-10T10:35:00",
    device: "Chrome on Windows",
  },
  {
    id: "2",
    type: "password_change",
    description: "Password diubah",
    ipAddress: "182.16.102.45",
    timestamp: "2025-05-05T14:20:00",
    device: "Chrome on Windows",
  },
  {
    id: "3",
    type: "profile_update",
    description: "Profil diperbarui",
    ipAddress: "182.16.102.45",
    timestamp: "2025-05-01T11:15:00",
    device: "Chrome on Windows",
  },
  {
    id: "4",
    type: "login",
    description: "Login berhasil",
    ipAddress: "182.16.102.45",
    timestamp: "2025-04-28T09:45:00",
    device: "Chrome on Windows",
  },
  {
    id: "5",
    type: "failed_login",
    description: "Percobaan login gagal",
    ipAddress: "103.25.182.10",
    timestamp: "2025-04-28T09:40:00",
    device: "Unknown",
  },
  {
    id: "6",
    type: "logout",
    description: "Logout",
    ipAddress: "182.16.102.45",
    timestamp: "2025-04-27T18:30:00",
    device: "Chrome on Windows",
  },
];

export function ActivityLog() {
  // Format tanggal untuk tampilan
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  // Fungsi untuk mendapatkan icon berdasarkan tipe aktivitas
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "login":
        return <LogIn className="h-4 w-4 text-green-500" />;
      case "logout":
        return <LogOut className="h-4 w-4 text-blue-500" />;
      case "profile_update":
        return <User className="h-4 w-4 text-primary" />;
      case "password_change":
        return <Key className="h-4 w-4 text-yellow-500" />;
      case "failed_login":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {dummyActivityLogs.map((log) => (
        <Card key={log.id} className="p-4 flex items-start space-x-4">
          <div className="rounded-full bg-muted p-2">
            {getActivityIcon(log.type)}
          </div>
          <div className="flex-1">
            <p className="font-medium">{log.description}</p>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {log.device} • {log.ipAddress}
              </span>
              <span>{formatDate(log.timestamp)}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
