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
} from "lucide-react";
import { ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth, type UserRole } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

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
  const isPublicPath = publicPaths.includes(pathname);

  if (isPublicPath) {
    return children;
  }

  const navItems = user ? navItemsByRole[user.role] : [];

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r bg-card shadow-sm transition-all">
        {/* App Title */}
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <MonitorCog className="h-5 w-5" />
          </div>
          <span className="font-semibold tracking-tight">IT Asset Management</span>
        </div>

        {/* Navigation */}
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

        {/* User Info & Logout */}
        <div className="border-t p-4 bg-muted/20">
          <div className="mb-4">
            <p className="text-sm font-semibold text-foreground">
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

      {/* Main Content Area */}
      <main className="flex-1 pl-64">
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
