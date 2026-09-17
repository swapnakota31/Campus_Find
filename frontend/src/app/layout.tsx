import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusFind - Project Foundation",
  description: "Secure lost & found for college campuses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
