import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/AuthContext";

export const metadata: Metadata = {
  title: "IT Asset Management",
  description: "IT asset management frontend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
