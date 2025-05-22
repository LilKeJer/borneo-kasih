// components/admin/service-catalog-table.tsx
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";
import { MoreHorizontal, Edit, Trash, Loader2 } from "lucide-react";

type ServiceCategory = "Konsultasi" | "Pemeriksaan" | "Tindakan" | "Lainnya";

interface Service {
  id: number;
  name: string;
  description: string | null;
  basePrice: string;
  category: ServiceCategory;
  isActive: boolean;
}

interface ServiceCatalogTableProps {
  searchTerm: string;
  categoryFilter: string;
  activeFilter: string;
  onEdit: (service: Service) => void;
}

export function ServiceCatalogTable({
  searchTerm,
  categoryFilter,
  activeFilter,
  onEdit,
}: ServiceCatalogTableProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchServices();
  }, [searchTerm, categoryFilter, activeFilter, page]);

  const fetchServices = async () => {
    try {
      setLoading(true);

      // Membuat parameter query
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });

      if (searchTerm) {
        params.append("search", searchTerm);
      }

      if (categoryFilter) {
        params.append("category", categoryFilter);
      }

      if (activeFilter !== "all") {
        params.append("active", activeFilter);
      }

      const response = await fetch(`/api/services?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Gagal memuat data layanan");
      }

      const data = await response.json();
      setServices(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Gagal memuat data layanan");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!serviceToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/services/${serviceToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Gagal menghapus layanan");
      }

      toast.success("Layanan berhasil dihapus");
      fetchServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error("Gagal menghapus layanan");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setServiceToDelete(null);
    }
  };

  const openDeleteDialog = (service: Service) => {
    setServiceToDelete(service);
    setIsDeleteDialogOpen(true);
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "Konsultasi":
        return <Badge variant="secondary">{category}</Badge>;
      case "Pemeriksaan":
        return <Badge variant="default">{category}</Badge>;
      case "Tindakan":
        return <Badge variant="destructive">{category}</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Layanan</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Harga Dasar</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                    <span>Memuat data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : services.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  Tidak ada layanan yang ditemukan
                </TableCell>
              </TableRow>
            ) : (
              services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <div className="font-medium">{service.name}</div>
                    {service.description && (
                      <div className="text-sm text-muted-foreground">
                        {service.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getCategoryBadge(service.category)}</TableCell>
                  <TableCell>
                    {formatRupiah(parseFloat(service.basePrice))}
                  </TableCell>
                  <TableCell>
                    {service.isActive ? (
                      <Badge variant="secondary">Aktif</Badge>
                    ) : (
                      <Badge variant="outline">Tidak Aktif</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(service)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(service)}
                          className="text-destructive"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && services.length > 0 && (
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
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Layanan</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus layanan ini? Tindakan ini tidak
              dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          {serviceToDelete && (
            <div className="py-4">
              <div className="flex flex-col space-y-2 rounded-md border p-4">
                <p>
                  <span className="font-medium">Nama:</span>{" "}
                  {serviceToDelete.name}
                </p>
                <p>
                  <span className="font-medium">Kategori:</span>{" "}
                  {serviceToDelete.category}
                </p>
                <p>
                  <span className="font-medium">Harga:</span>{" "}
                  {formatRupiah(parseFloat(serviceToDelete.basePrice))}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                "Hapus"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
