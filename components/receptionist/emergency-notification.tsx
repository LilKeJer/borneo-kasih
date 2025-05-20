// components/emergency-notification.tsx
"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmergencyNotificationProps {
  show: boolean;
  patientId?: string;
  patientName?: string;
  queueNumber?: number;
  onClose?: () => void;
}

export function EmergencyNotification({
  show,

  patientName,
  queueNumber,
  onClose,
}: EmergencyNotificationProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);

    if (show) {
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!visible) return null;

  return (
    <Alert
      className={cn(
        "fixed top-4 right-4 z-50 max-w-md shadow-lg border-red-500 bg-red-50",
        "animate-in slide-in-from-right-5"
      )}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <div className="flex items-center gap-2 font-semibold text-red-700">
              Kasus Darurat
              <Badge variant="destructive" className="animate-pulse">
                Prioritas
              </Badge>
            </div>
            {patientName && (
              <AlertDescription className="mt-1">
                Pasien {patientName}
                {queueNumber && <span> (No. {queueNumber})</span>}
                telah ditandai sebagai kasus darurat dan diprioritaskan.
              </AlertDescription>
            )}
          </div>
        </div>

        <button
          className="text-gray-500 hover:text-gray-700"
          onClick={() => {
            setVisible(false);
            if (onClose) onClose();
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </Alert>
  );
}
