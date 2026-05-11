"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  FileClock,
  LayoutDashboard,
  LogOut,
  MonitorCog,
  Users,
  Menu,
} from "lucide-react";
import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth, type UserRole } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const navItemsByRole: Record<UserRole, NavItem[]> = {
  ADMIN: [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/users",
      label: "Users",
      icon: Users,
    },
  ],
  IT_MANAGER: [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/assets",
      label: "Assets",
      icon: MonitorCog,
    },
    {
      href: "/assignments",
      label: "Assignments",
      icon: ClipboardList,
    },
    {
      href: "/audit",
      label: "Audit Log",
      icon: FileClock,
    },
  ],
  IT_STAFF: [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/assets",
      label: "Assets",
      icon: MonitorCog,
    },
    {
      href: "/assignments",
      label: "Assignments",
      icon: ClipboardList,
    },
  ],
};

const publicPaths = ["/login"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const isPublicPath = publicPaths.includes(pathname);

  if (isPublicPath) {
    return children;
  }

  const navItems = user ? navItemsByRole[user.role] : [];

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex-1 space-y-1 p-3">
      {isLoading ? (
        <div className="h-10 rounded-lg bg-muted/50 animate-pulse" />
      ) : (
        navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all",
                isActive
                  ? "bg-primary/10 text-primary font-semibold shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r bg-card shadow-sm transition-all md:flex">
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <MonitorCog className="h-5 w-5" />
          </div>
          <span className="font-semibold tracking-tight">IT Asset Management</span>
        </div>

        <NavLinks />

        <div className="border-t p-4 bg-muted/20">
          <div className="mb-4">
            <p className="text-sm font-semibold text-foreground truncate">
              {isLoading ? "Loading..." : user ? user.name : "Guest"}
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              {!isLoading && user ? user.role.replace("_", " ") : ""}
            </p>
          </div>
          <Button
            className="w-full justify-start gap-2 bg-background hover:bg-destructive hover:text-destructive-foreground border border-border shadow-sm transition-colors"
            variant="outline"
            onClick={handleLogout}
            size="sm"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex w-full flex-col md:pl-64">
        <header className="flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:hidden">
          <div className="flex items-center gap-2 font-semibold">
            <MonitorCog className="h-5 w-5 text-primary" />
            <span className="text-sm">ITAM Service</span>
          </div>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col p-0">
              <SheetHeader className="border-b p-5 text-left">
                <SheetTitle className="flex items-center gap-2">
                  <MonitorCog className="h-5 w-5 text-primary" />
                  <span>ITAM Service</span>
                </SheetTitle>
              </SheetHeader>
              
              <NavLinks onClick={() => setIsOpen(false)} />

              <div className="mt-auto border-t p-4 bg-muted/20">
                <div className="mb-4">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.role.replace("_", " ")}</p>
                </div>
                <Button
                  className="w-full justify-start gap-2"
                  variant="destructive"
                  onClick={handleLogout}
                  size="sm"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden">
          <div className="p-4 md:p-8">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
