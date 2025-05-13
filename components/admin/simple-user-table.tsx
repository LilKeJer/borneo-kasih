// components/admin/simple-user-table.tsx
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, Trash } from "lucide-react";

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
}

// Data dummy untuk tabel user
const dummyUsers: User[] = [
  {
    id: "1",
    username: "admin",
    name: "Admin Sistem",
    email: "admin@borneokasih.com",
    role: "Admin",
    status: "Active",
    phone: "081234567890",
  },
  {
    id: "2",
    username: "dokter",
    name: "Dr. Borneo",
    email: "dokter@borneokasih.com",
    role: "Doctor",
    status: "Active",
    phone: "081234567891",
  },
  {
    id: "3",
    username: "budipatient",
    name: "Budi Santoso",
    email: "budi@example.com",
    role: "Patient",
    status: "Active",
    phone: "081234567892",
  },
];

export function SimpleUserTable() {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter users berdasarkan pencarian
  const filteredUsers = dummyUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "Admin":
        return "destructive";
      case "Doctor":
        return "secondary";
      case "Patient":
        return "default";
      default:
        return "outline";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    return status === "Active" ? "secondary" : "outline";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari pengguna..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(user.status)}>
                    {user.status === "Active" ? "Aktif" : "Tidak Aktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    {user.role !== "Admin" && (
                      <Button variant="outline" size="sm">
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button variant="outline" size="sm" disabled>
          Sebelumnya
        </Button>
        <Button variant="outline" size="sm">
          Selanjutnya
        </Button>
      </div>
    </div>
  );
}
