// types/pharmacy.ts
// Definisikan tipe dasar untuk Obat jika belum ada secara spesifik untuk frontend
export interface Medicine {
  id: number; // Atau string jika ID dari API adalah string
  name: string;
  description?: string | null;
  price: string; // Atau number jika sudah di-parse
  // Tambahkan field lain yang relevan dari tabel medicines jika diperlukan di form
}
