// components/admin/staff-table.tsx
"use client";

import { useState, useEffect } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Search, Edit, Trash } from "lucide-react";
import { toast } from "sonner";

interface StaffMember {
  id: string;
  username: string;
  role: string;
  createdAt: string;
  details: {
    name: string;
    email: string;
    phone: string;
    specialization?: string;
  } | null;
}

interface StaffTableProps {
  onEdit: (staff: StaffMember) => void;
}

export function StaffTable({ onEdit }: StaffTableProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchStaff();
  }, [searchTerm, roleFilter, page]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        role: roleFilter === "all" ? "" : roleFilter,
        page: page.toString(),
        limit: "10",
      });

      const response = await fetch(`/api/staff?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch staff");

      const data = await response.json();
      setStaff(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast.error("Gagal memuat data staff");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus staff ini?")) return;

    try {
      const response = await fetch(`/api/staff/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete staff");

      toast.success("Staff berhasil dihapus");
      fetchStaff();
    } catch (error) {
      console.error("Error deleting staff:", error);
      toast.error("Gagal menghapus staff");
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "Doctor":
        return "secondary";
      case "Nurse":
        return "default";
      case "Receptionist":
        return "outline";
      case "Pharmacist":
        return "destructive";
      default:
        return "default";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "Doctor":
        return "Dokter";
      case "Nurse":
        return "Perawat";
      case "Receptionist":
        return "Resepsionis";
      case "Pharmacist":
        return "Apoteker";
      default:
        return role;
    }
  };

  const StaffTableRow = ({ member }: { member: StaffMember }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <TableRow key={member.id}>
        <TableCell className="font-medium">
          {member.details?.name || "-"}
        </TableCell>
        <TableCell>{member.username}</TableCell>
        <TableCell>{member.details?.email || "-"}</TableCell>
        <TableCell>{member.details?.phone || "-"}</TableCell>
        <TableCell>
          <Badge variant={getRoleBadgeVariant(member.role)}>
            {getRoleLabel(member.role)}
          </Badge>
        </TableCell>
        <TableCell>
          {member.role === "Doctor" && member.details?.specialization
            ? member.details.specialization
            : "-"}
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                // Hapus onClick handler di sini
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onCloseAutoFocus={(e) => e.preventDefault()}
              // Tambahkan ini untuk mencegah penutupan prematur
              onInteractOutside={(e) => {
                const isTrigger =
                  e.target instanceof HTMLElement &&
                  e.target.closest("[data-radix-dropdown-menu-trigger]");

                if (isTrigger) {
                  e.preventDefault();
                }
              }}
            >
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setIsOpen(false);
                  onEdit(member);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setIsOpen(false);
                  handleDelete(member.id);
                }}
                className="text-red-600"
              >
                <Trash className="mr-2 h-4 w-4" />
                Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari staff..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Semua Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Role</SelectItem>
            <SelectItem value="Doctor">Dokter</SelectItem>
            <SelectItem value="Nurse">Perawat</SelectItem>
            <SelectItem value="Receptionist">Resepsionis</SelectItem>
            <SelectItem value="Pharmacist">Apoteker</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Spesialisasi</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Tidak ada data staff
                </TableCell>
              </TableRow>
            ) : (
              staff.map((member) => (
                <StaffTableRow key={member.id} member={member} />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
        >
          Sebelumnya
        </Button>
        <div className="text-sm text-muted-foreground">
          Halaman {page} dari {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
        >
          Selanjutnya
        </Button>
      </div>
    </div>
  );
}
