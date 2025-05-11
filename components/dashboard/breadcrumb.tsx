// components/dashboard/breadcrumb.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumb() {
  const pathname = usePathname();

  // Memisahkan path dan menghapus string kosong dari split
  const pathSegments = pathname.split("/").filter(Boolean);

  // Membangun breadcrumb items
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const href = `/${pathSegments.slice(0, index + 1).join("/")}`;

    // Format tampilan segmen
    const formattedSegment = segment.charAt(0).toUpperCase() + segment.slice(1);

    return {
      href,
      label: formattedSegment,
      isLast: index === pathSegments.length - 1,
    };
  });

  return (
    <div className="flex items-center text-sm text-muted-foreground mb-4">
      <Link href="/" className="flex items-center hover:text-foreground">
        <Home className="h-4 w-4 mr-1" />
      </Link>

      {breadcrumbItems.map((item) => (
        <div key={item.href} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-1" />
          {item.isLast ? (
            <span className="font-medium text-foreground">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-foreground hover:underline"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
