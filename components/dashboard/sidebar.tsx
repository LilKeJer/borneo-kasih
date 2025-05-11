// components/dashboard/sidebar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";

interface SidebarProps {
  items: {
    title: string;
    href: string;
    icon?: React.ReactNode;
  }[];
}
/*interface SidebarProps {
  items: {
    title: string;
    href: string;
    icon: React.ReactNode;
  }[];
  defaultOpen?: boolean;
}*/
//export function Sidebar({ items, defaultOpen = false }: SidebarProps)
export function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();
  //const [open, setOpen] = useState(false);

  // Desktop sidebar
  return (
    <div className="hidden md:block">
      <div className="pb-12 w-[200px]">
        <div className="space-y-4 py-4">
          <div className="px-4 py-2">
            <h2 className="text-lg font-semibold tracking-tight">
              Borneo Kasih
            </h2>
          </div>
          <div className="px-3">
            <ScrollArea className="h-[calc(100vh-120px)]">
              <div className="space-y-1">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                      pathname === item.href ||
                        pathname.startsWith(`${item.href}/`)
                        ? "bg-accent text-accent-foreground"
                        : "transparent"
                    )}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.title}
                  </Link>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
export function MobileSidebar({ items }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Tutup sidebar ketika berganti halaman pada mobile
  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    }
  }, [pathname, isMobile]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="p-0 w-72 border-r border-border bg-background shadow-xl"
        // Perbaikan untuk dialog issue - menambahkan SheetTitle
      >
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <SheetTitle className="text-lg font-semibold">
            Borneo Kasih
          </SheetTitle>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-65px)] bg-background">
          <div className="p-4">
            <nav className="flex flex-col space-y-1">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname === item.href ||
                      pathname.startsWith(`${item.href}/`)
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
