import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "CampusFind - College Lost & Found Platform",
  description: "Secure, privacy-first Lost & Found platform for college campus students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className="antialiased min-h-screen bg-[var(--campus-bg)] text-[var(--campus-text)] font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
