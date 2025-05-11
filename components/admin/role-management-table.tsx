// components/admin/role-management-table.tsx
"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal, Edit, Trash, Shield } from "lucide-react";

// Data role dan hak akses
const roleData = [
  {
    id: "1",
    name: "Admin",
    description: "Administrator sistem dengan akses penuh",
    userCount: 1,
    permissions: [
      "user_management",
      "role_management",
      "verification",
      "clinic_settings",
      "reports",
    ],
  },
  {
    id: "2",
    name: "Doctor",
    description: "Dokter dengan akses ke pasien dan rekam medis",
    userCount: 8,
    permissions: [
      "view_patients",
      "manage_appointments",
      "manage_medical_records",
      "manage_prescriptions",
    ],
  },
  {
    id: "3",
    name: "Nurse",
    description: "Perawat dengan akses ke pasien dan rekam medis terbatas",
    userCount: 12,
    permissions: [
      "view_patients",
      "manage_appointments",
      "view_medical_records",
      "add_vital_signs",
    ],
  },
  {
    id: "4",
    name: "Receptionist",
    description: "Resepsionis dengan akses ke antrian dan reservasi",
    userCount: 5,
    permissions: [
      "view_patients",
      "manage_appointments",
      "manage_queue",
      "manage_payments",
    ],
  },
  {
    id: "5",
    name: "Pharmacist",
    description: "Apoteker dengan akses ke obat dan resep",
    userCount: 3,
    permissions: ["manage_medicines", "view_prescriptions", "manage_inventory"],
  },
  {
    id: "6",
    name: "Patient",
    description: "Pasien dengan akses terbatas ke data pribadi",
    userCount: 985,
    permissions: [
      "view_own_profile",
      "view_own_appointments",
      "view_own_medical_records",
      "view_own_prescriptions",
      "manage_own_appointments",
    ],
  },
];

// Data deskripsi permission
const permissionDescriptions: Record<string, string> = {
  user_management: "Mengelola pengguna sistem",
  role_management: "Mengelola role dan permission",
  verification: "Memverifikasi pasien baru",
  clinic_settings: "Mengelola pengaturan klinik",
  reports: "Melihat dan menghasilkan laporan",
  view_patients: "Melihat data pasien",
  manage_appointments: "Mengelola janji temu",
  manage_medical_records: "Mengelola rekam medis",
  manage_prescriptions: "Mengelola resep obat",
  view_medical_records: "Melihat rekam medis",
  add_vital_signs: "Menambahkan tanda vital pasien",
  manage_queue: "Mengelola antrian pasien",
  manage_payments: "Mengelola pembayaran",
  manage_medicines: "Mengelola data obat",
  view_prescriptions: "Melihat resep obat",
  manage_inventory: "Mengelola inventaris obat",
  view_own_profile: "Melihat profil sendiri",
  view_own_appointments: "Melihat janji temu sendiri",
  view_own_medical_records: "Melihat rekam medis sendiri",
  view_own_prescriptions: "Melihat resep obat sendiri",
  manage_own_appointments: "Mengelola janji temu sendiri",
};

export function RoleManagementTable() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Fungsi untuk mendapatkan detail role berdasarkan ID
  const getSelectedRoleDetails = () => {
    if (!selectedRole) return null;
    return roleData.find((role) => role.id === selectedRole);
  };

  // Detail role yang dipilih
  const roleDetails = getSelectedRoleDetails();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Role</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Jumlah Pengguna</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roleData.map((role) => (
                <TableRow
                  key={role.id}
                  className={selectedRole === role.id ? "bg-accent/50" : ""}
                  onClick={() => setSelectedRole(role.id)}
                >
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>{role.description}</TableCell>
                  <TableCell>{role.userCount}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">
                        {role.permissions.length} permissions
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Role
                        </DropdownMenuItem>
                        {role.name !== "Admin" && role.name !== "Patient" && (
                          <DropdownMenuItem>
                            <Trash className="mr-2 h-4 w-4" />
                            Hapus Role
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <Shield className="mr-2 h-4 w-4" />
                          Kelola Izin
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        {roleDetails ? (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">
                Detail Role: {roleDetails.name}
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Deskripsi
                  </p>
                  <p>{roleDetails.description}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Permissions ({roleDetails.permissions.length})
                  </p>
                  <div className="mt-2 space-y-2">
                    {roleDetails.permissions.map((permission) => (
                      <div key={permission} className="border rounded-md p-2">
                        <p className="font-medium">
                          {permission
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {permissionDescriptions[permission]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4">
                  <Button className="w-full">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Permissions
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Pilih role untuk melihat detail
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
