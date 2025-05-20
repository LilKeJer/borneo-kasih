"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PriorityToggleProps {
  reservationId: string;
  isPriority?: boolean;
  onStatusChange?: (newStatus: boolean) => void;
}

export function PriorityToggle({
  reservationId,
  isPriority = false,
  onStatusChange,
}: PriorityToggleProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [priorityEnabled, setPriorityEnabled] = useState(isPriority);
  const [priorityReason, setPriorityReason] = useState("");

  // Sync local state with prop changes
  useEffect(() => {
    setPriorityEnabled(isPriority);
  }, [isPriority]);

  const handleTogglePriority = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/queue/${reservationId}/priority`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isPriority: priorityEnabled,
          priorityReason: priorityReason,
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal mengubah status prioritas");
      }

      const result = await response.json();
      toast.success(result.message);

      // Update parent component and local state
      if (onStatusChange) {
        onStatusChange(priorityEnabled);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error setting priority:", error);
      toast.error("Gagal mengubah status prioritas");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={isPriority ? "destructive" : "outline"}
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className={isPriority ? "animate-pulse" : ""}
      >
        <AlertTriangle className="h-4 w-4 mr-1" />
        {isPriority ? "Kasus Darurat" : "Tandai Darurat"}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {priorityEnabled
                ? "Tandai Sebagai Kasus Darurat"
                : "Batalkan Status Darurat"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="priority-toggle" className="font-medium">
                Status Prioritas
              </Label>
              <Switch
                id="priority-toggle"
                checked={priorityEnabled}
                onCheckedChange={setPriorityEnabled}
              />
            </div>

            {priorityEnabled && (
              <div className="space-y-2">
                <Label htmlFor="priority-reason">Alasan Prioritas</Label>
                <Textarea
                  id="priority-reason"
                  placeholder="Deskripsikan alasan pasien perlu diprioritaskan"
                  value={priorityReason}
                  onChange={(e) => setPriorityReason(e.target.value)}
                  className="min-h-20"
                />

                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
                  <p className="font-medium mb-1">Perhatian!</p>
                  <p>
                    Menandai pasien sebagai kasus darurat akan memindahkan
                    pasien ke urutan pertama dalam antrian dan mengubah urutan
                    pasien lain.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              variant={priorityEnabled ? "destructive" : "default"}
              onClick={handleTogglePriority}
              disabled={isLoading || (!priorityEnabled && !isPriority)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Memproses...
                </>
              ) : priorityEnabled ? (
                "Konfirmasi Kasus Darurat"
              ) : (
                "Batalkan Status Darurat"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
