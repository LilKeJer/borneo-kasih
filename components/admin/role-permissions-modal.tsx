// components/admin/role-permissions-modal.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Minus } from "lucide-react";

// Tipe untuk role
interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
}

// Tipe data permission yang tersedia
interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

// Data permission yang tersedia di sistem
const availablePermissions: Permission[] = [
  // User Management
  {
    id: "user_management",
    name: "Mengelola Pengguna",
    description: "Melihat, menambah, mengubah, dan menghapus pengguna",
    category: "Administrasi",
  },
  {
    id: "role_management",
    name: "Mengelola Role",
    description: "Melihat, menambah, mengubah, dan menghapus role",
    category: "Administrasi",
  },
  {
    id: "verification",
    name: "Verifikasi Pasien",
    description: "Memverifikasi permintaan pasien baru",
    category: "Administrasi",
  },
  {
    id: "clinic_settings",
    name: "Pengaturan Klinik",
    description: "Mengelola pengaturan klinik",
    category: "Administrasi",
  },
  {
    id: "reports",
    name: "Laporan",
    description: "Melihat dan menghasilkan laporan",
    category: "Administrasi",
  },

  // Pasien
  {
    id: "view_patients",
    name: "Lihat Pasien",
    description: "Melihat data pasien",
    category: "Pasien",
  },
  {
    id: "manage_patients",
    name: "Kelola Pasien",
    description: "Menambah, mengubah, dan menghapus data pasien",
    category: "Pasien",
  },

  // Appointment
  {
    id: "view_appointments",
    name: "Lihat Janji Temu",
    description: "Melihat daftar janji temu",
    category: "Janji Temu",
  },
  {
    id: "manage_appointments",
    name: "Kelola Janji Temu",
    description: "Menambah, mengubah, dan menghapus janji temu",
    category: "Janji Temu",
  },
  {
    id: "manage_queue",
    name: "Kelola Antrian",
    description: "Mengelola antrian pasien",
    category: "Janji Temu",
  },

  // Rekam Medis
  {
    id: "view_medical_records",
    name: "Lihat Rekam Medis",
    description: "Melihat rekam medis pasien",
    category: "Rekam Medis",
  },
  {
    id: "manage_medical_records",
    name: "Kelola Rekam Medis",
    description: "Menambah dan mengubah rekam medis pasien",
    category: "Rekam Medis",
  },
  {
    id: "add_vital_signs",
    name: "Tambah Tanda Vital",
    description: "Menambahkan tanda vital pasien",
    category: "Rekam Medis",
  },

  // Resep dan Obat
  {
    id: "view_prescriptions",
    name: "Lihat Resep",
    description: "Melihat resep pasien",
    category: "Resep dan Obat",
  },
  {
    id: "manage_prescriptions",
    name: "Kelola Resep",
    description: "Menambah dan mengubah resep pasien",
    category: "Resep dan Obat",
  },
  {
    id: "manage_medicines",
    name: "Kelola Obat",
    description: "Mengelola data obat",
    category: "Resep dan Obat",
  },
  {
    id: "manage_inventory",
    name: "Kelola Inventaris",
    description: "Mengelola inventaris obat",
    category: "Resep dan Obat",
  },

  // Pembayaran
  {
    id: "view_payments",
    name: "Lihat Pembayaran",
    description: "Melihat data pembayaran",
    category: "Pembayaran",
  },
  {
    id: "manage_payments",
    name: "Kelola Pembayaran",
    description: "Mengelola pembayaran pasien",
    category: "Pembayaran",
  },

  // Akses Pasien
  {
    id: "view_own_profile",
    name: "Lihat Profil Sendiri",
    description: "Melihat profil sendiri",
    category: "Akses Pasien",
  },
  {
    id: "view_own_appointments",
    name: "Lihat Janji Temu Sendiri",
    description: "Melihat janji temu sendiri",
    category: "Akses Pasien",
  },
  {
    id: "view_own_medical_records",
    name: "Lihat Rekam Medis Sendiri",
    description: "Melihat rekam medis sendiri",
    category: "Akses Pasien",
  },
  {
    id: "view_own_prescriptions",
    name: "Lihat Resep Sendiri",
    description: "Melihat resep obat sendiri",
    category: "Akses Pasien",
  },
  {
    id: "manage_own_appointments",
    name: "Kelola Janji Temu Sendiri",
    description: "Mengelola janji temu sendiri",
    category: "Akses Pasien",
  },
];

// Dapatkan kategori unik dari izin yang tersedia
const permissionCategories = [
  ...new Set(availablePermissions.map((p) => p.category)),
];

interface RolePermissionsModalProps {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (role: Role) => void;
}

export function RolePermissionsModal({
  role,
  open,
  onOpenChange,
  onSave,
}: RolePermissionsModalProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    role?.permissions || []
  );

  if (!role) return null;

  // Handler untuk toggle permission
  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permissionId)) {
        return prev.filter((id) => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  // Handler untuk toggle semua permission dalam kategori
  const toggleCategory = (category: string, checked: boolean) => {
    const categoryPermissions = availablePermissions
      .filter((p) => p.category === category)
      .map((p) => p.id);

    if (checked) {
      // Add all permissions from this category
      setSelectedPermissions((prev) => [
        ...new Set([...prev, ...categoryPermissions]),
      ]);
    } else {
      // Remove all permissions from this category
      setSelectedPermissions((prev) =>
        prev.filter((id) => !categoryPermissions.includes(id))
      );
    }
  };

  // Periksa apakah semua izin dalam kategori dipilih
  const isCategoryChecked = (category: string) => {
    const categoryPermissions = availablePermissions
      .filter((p) => p.category === category)
      .map((p) => p.id);

    return categoryPermissions.every((id) => selectedPermissions.includes(id));
  };

  // Periksa apakah beberapa izin dalam kategori dipilih
  const isCategoryIndeterminate = (category: string) => {
    const categoryPermissions = availablePermissions
      .filter((p) => p.category === category)
      .map((p) => p.id);

    const selectedCount = categoryPermissions.filter((id) =>
      selectedPermissions.includes(id)
    ).length;

    return selectedCount > 0 && selectedCount < categoryPermissions.length;
  };

  // Handler untuk menyimpan perubahan
  const handleSave = () => {
    const updatedRole = {
      ...role,
      permissions: selectedPermissions,
    };

    onSave(updatedRole);
    toast.success(`Hak akses untuk role ${role.name} berhasil diperbarui`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Kelola Hak Akses: {role.name}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            {role.description}
          </p>
          <p className="text-sm mb-4">
            <span className="font-medium">Jumlah Pengguna:</span>{" "}
            {role.userCount}
          </p>

          <ScrollArea className="h-[50vh] rounded-md border p-4">
            <div className="space-y-6">
              {permissionCategories.map((category) => {
                const isChecked = isCategoryChecked(category);
                const isIndeterminate = isCategoryIndeterminate(category);

                return (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="relative flex items-center">
                        <Checkbox
                          id={`category-${category}`}
                          checked={isChecked || isIndeterminate}
                          onCheckedChange={(checked) =>
                            toggleCategory(category, checked as boolean)
                          }
                        />
                        {isIndeterminate && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Minus className="h-3 w-3 text-primary" />
                          </div>
                        )}
                      </div>
                      <Label
                        htmlFor={`category-${category}`}
                        className="font-bold"
                      >
                        {category}
                      </Label>
                    </div>

                    <div className="ml-6 space-y-2">
                      {availablePermissions
                        .filter(
                          (permission) => permission.category === category
                        )
                        .map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-start space-x-2"
                          >
                            <Checkbox
                              id={`permission-${permission.id}`}
                              checked={selectedPermissions.includes(
                                permission.id
                              )}
                              onCheckedChange={() =>
                                togglePermission(permission.id)
                              }
                            />
                            <div className="space-y-1">
                              <Label htmlFor={`permission-${permission.id}`}>
                                {permission.name}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave}>Simpan Perubahan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
